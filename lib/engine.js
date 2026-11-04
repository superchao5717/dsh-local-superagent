/**
 * Local Superagent engine.
 *
 * Deterministic scheduling around an LLM supervisor:
 *  - the Host dispatches accepted tasks to worker Sessions itself (no model turn
 *    needed just to accept a user task);
 *  - a worker ends with a structured report;
 *  - one supervisor Session reviews reports in batches and returns a verdict
 *    (done / continue / needs_you / fail);
 *  - the board only surfaces a task to the user when the verdict needs a human,
 *    so ordinary progress costs no attention.
 */
import { clamp, delay, now, stamp } from './util.js'
import { supervisorTick, workerAssignment, workerContinuation, workerTitle } from './prompts.js'
import { supervisorTools, workerTools } from './tools.js'
const TICK_MS = 20_000
const REVIEW_TIMEOUT_MS = 240_000
const IDLE_GRACE_MS = 900
const MAX_REVIEW_ROUNDS = 2
const SUPERVISOR_ID = 'sa-supervisor'

/** Short one-line summary of a worker report for the supervisor payload. */
const reportLine = report => report ? `${report.state}: ${report.summary}` : 'no report'

export class Engine {
  /**
   * @param {{ ctx: any, store: any, sessions: any, log: (message: string) => void,
   *   config?: { maxTaskMinutes?: number } }} options
   */
  constructor({ ctx, store, sessions, log, config }) {
    this.ctx = ctx
    this.store = store
    this.sessions = sessions
    this.log = log
    this.maxTaskMinutes = config?.maxTaskMinutes ?? 45
    // A fresh supervisor Session per plugin generation: a live Session keeps the
    // tool registrations of the plugin instance that created it, and a reload
    // cannot replace same-named tools. The previous generation's Session is
    // archived on start so the sidebar stays clean.
    this.supervisorId = `${SUPERVISOR_ID}-${now().toString(36).slice(-5)}`
    this.pumping = false
    this.finalizing = new Set()
    this.reviewQueue = []
    this.reviewRunning = false
    this.timer = null
    this.stopped = false
  }

  async start() {
    await this.sessions.start()
    if (this.stopped) return
    await this.archivePreviousSupervisors()
    if (this.stopped) return
    this.installListeners()
    await this.recover()
    if (this.stopped) return
    this.timer = setInterval(() => {
      this.tick().catch(error => this.log(`scheduler tick failed: ${String(error)}`))
    }, TICK_MS)
    this.timer.unref?.()
    await this.pump()
  }

  /** Hide supervisor Sessions left by earlier plugin generations. */
  async archivePreviousSupervisors() {
    const previous = this.store.supervisors.filter(id => id !== this.supervisorId)
    const registry = this.ctx.get('workspaceRegistry')
    for (const id of previous) {
      try {
        this.sessions.cancel(id)
        await registry?.archiveSession?.(id)
      } catch (error) {
        this.log(`could not archive the old supervisor Session ${id}: ${String(error)}`)
      }
    }
    this.store.supervisors = [this.supervisorId]
  }

  /** Fire-and-forget scheduler kick that can never reject into the Host. */
  safePump() {
    this.pump().catch(error => this.log(`scheduler pump failed: ${String(error)}`))
  }

  /** Fire-and-forget review loop kick that can never reject into the Host. */
  safeReviews() {
    this.processReviews().catch(error => this.log(`review loop failed: ${String(error)}`))
  }

  stop() {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.sessions.stop()
  }

  installListeners() {
    this.ctx.on('agent/status', payload => {
      const { agent, status } = payload
      if (status !== 'idle' || this.stopped) return
      if (agent.id === this.supervisorId) return
      const task = this.taskByWorker(agent.id)
      if (!task || task.status !== 'running') return
      void this.onWorkerIdle(task.id).catch(error => this.log(`worker idle handling failed: ${String(error)}`))
    })
    this.ctx.on('agent/error', payload => {
      const task = this.taskByWorker(payload.agent?.id ?? '')
      if (!task) return
      this.store.log(task.id, 'error', `执行会话报错：${String(payload.error).slice(0, 300)}`)
    })
  }

  taskByWorker(sessionId) {
    const tasks = this.store.list()
    return tasks.find(task => task.workerSessionId === sessionId && ['running', 'reviewing'].includes(task.status))
      ?? tasks.find(task => task.workerSessionId === sessionId)
  }

  // ---------------------------------------------------------------- board API

  /** Full board snapshot for the Client half. */
  board() {
    const settings = this.store.settings
    const tasks = this.store.list()
    const live = {
      running: tasks.filter(task => task.status === 'running').length,
      queued: tasks.filter(task => task.status === 'queued').length,
      reviewing: tasks.filter(task => task.status === 'reviewing').length,
      needsYou: tasks.filter(task => task.status === 'needs_you').length,
      done: tasks.filter(task => task.status === 'done').length,
      failed: tasks.filter(task => task.status === 'failed').length,
      capacity: settings.maxWorkers,
    }
    return {
      version: this.version ?? '0.1.0',
      stateDir: this.stateDir ?? '',
      settings,
      workspaces: this.workspaces(),
      tasks: tasks.map(task => this.taskView(task)),
      live: { ...live, attention: live.needsYou },
      supervisor: { sessionId: this.supervisorId, running: this.sessions.status(this.supervisorId) === 'running' },
    }
  }

  workspaces() {
    const registry = this.ctx.get('workspaceRegistry')
    if (!registry?.list) return []
    try {
      return registry.list().map(workspace => ({
        id: workspace.id,
        title: workspace.title ?? workspace.path,
        path: workspace.path,
        sessions: Array.isArray(workspace.sessions) ? workspace.sessions.length : 0,
      }))
    } catch (error) {
      this.log(`could not list workspaces: ${String(error)}`)
      return []
    }
  }

  /** Public, log-free projection of one task. */
  taskView(task) {
    const workspace = this.workspaces().find(item => item.id === task.workspaceId)
    const started = task.startedAt ?? task.createdAt
    const ended = task.finishedAt
    return {
      id: task.id,
      workspaceId: task.workspaceId,
      workspaceTitle: workspace?.title ?? task.workspaceTitle,
      workspacePath: workspace?.path ?? task.workspacePath,
      title: task.title,
      goal: task.goal,
      acceptance: task.acceptance,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      workerSessionId: task.workerSessionId,
      attempts: task.attempts,
      report: task.report,
      review: task.review,
      question: task.question,
      progress: task.progress,
      durationMs: ended ? Math.max(0, ended - started) : null,
    }
  }

  /** Task plus its internal log, for the detail panel. */
  taskDetail(id) {
    const task = this.store.get(id)
    if (!task) return undefined
    return {
      task: this.taskView(task),
      log: task.log,
      workerSessionId: task.workerSessionId,
      attempts: task.attempts,
    }
  }

  // ------------------------------------------------------------- board actions

  addTask(input) {
    const workspace = this.workspaces().find(item => item.id === input.workspaceId)
    if (!workspace) return { error: 'unknown_workspace', message: '工作区不存在或尚未注册。' }
    const title = clamp(input.title, 200)
    const goal = clamp(input.goal, 8000)
    if (!title) return { error: 'invalid_title', message: '请填写任务标题。' }
    if (!goal) return { error: 'invalid_goal', message: '请填写任务目标。' }
    const task = this.store.add({
      workspaceId: workspace.id,
      workspaceTitle: workspace.title,
      workspacePath: workspace.path,
      title,
      goal,
      acceptance: clamp(input.acceptance, 4000),
      priority: [1, 2, 3].includes(Number(input.priority)) ? Number(input.priority) : 2,
    })
    this.store.event('task.added', { id: task.id, title })
    this.store.log(task.id, 'create', `任务已创建：${title}`)
    this.safePump()
    return { task: this.taskView(task) }
  }

  answer(id, text) {
    const task = this.store.get(id)
    if (!task) return { error: 'unknown_task', message: '任务不存在。' }
    if (task.status !== 'needs_you') return { error: 'not_waiting', message: '这个任务现在不在等待你回答。' }
    const answer = clamp(text, 4000)
    if (!answer) return { error: 'invalid_answer', message: '回答不能为空。' }
    this.store.log(task.id, 'answer', `用户回答：${answer}`)
    this.store.progress(task, '已收到你的回答，继续执行')
    this.store.update(task.id, {
      question: null,
      report: null,
      review: null,
      reviewRounds: 0,
      status: 'running',
      startedAt: now(),
      finishedAt: null,
    })
    void this.resumeWithInput(task.id, { answer }).catch(error => this.failRunning(task.id, error))
    return { task: this.taskView(this.store.get(task.id)) }
  }

  retry(id) {
    const task = this.store.get(id)
    if (!task) return { error: 'unknown_task', message: '任务不存在。' }
    if (task.status === 'running' || task.status === 'reviewing') {
      return { error: 'busy', message: '任务仍在进行中，先停止再重试。' }
    }
    if (task.workerSessionId) this.sessions.cancel(task.workerSessionId)
    this.store.update(task.id, {
      status: 'queued',
      report: null,
      review: null,
      question: null,
      reviewRounds: 0,
      startedAt: null,
      finishedAt: null,
      attempts: 0,
    })
    this.store.log(task.id, 'retry', '手动重试：重新排队')
    this.store.progress(task, '已重新排队')
    this.safePump()
    return { task: this.taskView(this.store.get(task.id)) }
  }

  stopTask(id) {
    const task = this.store.get(id)
    if (!task) return { error: 'unknown_task', message: '任务不存在。' }
    if (task.status === 'done' || task.status === 'cancelled') return { task: this.taskView(task) }
    if (task.workerSessionId) this.sessions.cancel(task.workerSessionId)
    this.reviewQueue = this.reviewQueue.filter(item => item !== task.id)
    this.store.update(task.id, { status: 'cancelled', finishedAt: now(), question: null })
    this.store.log(task.id, 'stop', '用户停止了任务')
    this.store.progress(task, '已停止')
    this.safePump()
    return { task: this.taskView(this.store.get(task.id)) }
  }

  removeTask(id) {
    const task = this.store.get(id)
    if (!task) return { error: 'unknown_task', message: '任务不存在。' }
    if (task.workerSessionId) this.sessions.cancel(task.workerSessionId)
    this.reviewQueue = this.reviewQueue.filter(item => item !== task.id)
    this.store.remove(id)
    return { ok: true }
  }

  saveSettings(patch) {
    const settings = this.store.setSettings(patch ?? {})
    this.store.event('settings.saved', settings)
    if (!settings.paused) this.safePump()
    return { settings }
  }

  async addWorkspace(path, title) {
    const target = clamp(path, 1000).replace(/^["']|["']$/g, '')
    if (!target) return { error: 'invalid_path', message: '请填写本机绝对路径。' }
    const registry = this.ctx.get('workspaceRegistry')
    if (!registry?.create) return { error: 'unavailable', message: '当前 Host 没有工作区注册服务。' }
    try {
      const workspace = await registry.create(target, title ? clamp(title, 120) : undefined)
      this.store.event('workspace.added', { id: workspace.id, path: workspace.path })
      return { workspace: { id: workspace.id, title: workspace.title ?? workspace.path, path: workspace.path, sessions: 0 } }
    } catch (error) {
      return { error: 'create_failed', message: `无法创建工作区：${String(error)}` }
    }
  }

  // ------------------------------------------------------------------- engine

  /** Dispatch queued tasks while worker slots are free. */
  async pump() {
    if (this.pumping || this.stopped) return
    this.pumping = true
    try {
      for (;;) {
        if (this.stopped) return
        const settings = this.store.settings
        if (settings.paused) return
        const running = this.store.list().filter(task => task.status === 'running').length
        if (running >= settings.maxWorkers) return
        const queued = this.store.list()
          .filter(task => task.status === 'queued')
          .sort((left, right) => right.priority - left.priority || left.createdAt - right.createdAt)
        if (!queued.length) return
        await this.dispatch(queued[0].id)
      }
    } catch (error) {
      this.log(`pump failed: ${String(error)}`)
    } finally {
      this.pumping = false
    }
  }

  /** A fresh worker Session id: each attempt gets a Session this generation decorates. */
  newWorkerSessionId(taskId) {
    return `sa-task-${taskId.slice(3, 11)}-${now().toString(36).slice(-4)}`
  }

  async dispatch(taskId, extra) {
    let task = this.store.get(taskId)
    if (!task || task.status !== 'queued') return
    const workerSessionId = this.newWorkerSessionId(task.id)
    task = this.store.update(task.id, {
      status: 'running',
      attempts: task.attempts + 1,
      startedAt: now(),
      finishedAt: null,
      report: null,
      question: null,
      review: null,
      workerSessionId,
    })
    this.store.log(task.id, 'dispatch', `第 ${task.attempts} 轮：派发给执行会话 ${workerSessionId}`)
    this.store.progress(task, `已派发（第 ${task.attempts} 轮）`)
    try {
      await this.sessions.ensure({
        sessionId: workerSessionId,
        role: 'worker',
        workspaceId: task.workspaceId,
        cwd: task.workspacePath,
        title: workerTitle(task.title),
        tools: workerTools(task.id),
      })
      const message = extra ? workerContinuation(task, extra) : workerAssignment(task)
      // A stop/remove or another dispatch may have landed while the Session was
      // being created; never prompt a task that is no longer this running attempt.
      const current = this.store.get(task.id)
      if (!current || current.status !== 'running' || current.workerSessionId !== workerSessionId) {
        this.sessions.cancel(workerSessionId)
        return
      }
      await this.sessions.prompt(workerSessionId, `sa-assign-${task.id}-${task.attempts}`, message)
      this.store.progress(task, '执行会话已开始工作')
    } catch (error) {
      this.failRunning(task.id, error)
    }
  }

  /** Continue an existing wait: deliver a user answer or a review follow-up. */
  async resumeWithInput(taskId, extra) {
    const task = this.store.get(taskId)
    if (!task || task.status !== 'running') return
    if (this.sessions.isLive(task.workerSessionId)) {
      await this.sessions.ensure({
        sessionId: task.workerSessionId,
        role: 'worker',
        workspaceId: task.workspaceId,
        cwd: task.workspacePath,
        title: workerTitle(task.title),
        tools: workerTools(task.id),
      })
      await this.sessions.prompt(task.workerSessionId, `sa-continue-${task.id}-${now()}`, workerContinuation(task, extra))
      this.store.progress(task, extra.answer ? '已把你的回答交给执行会话' : '已让执行会话继续')
      return
    }
    // The Session is gone (Host restart, plugin reload or manual deletion):
    // start a fresh attempt carrying the new input plus the previous result as context.
    this.store.update(task.id, { status: 'queued' })
    const previous = task.report?.summary ? { ...extra, previousReport: task.report.summary } : extra
    await this.dispatch(task.id, previous)
  }

  /** Called when a worker Session goes idle. */
  async onWorkerIdle(taskId) {
    if (this.finalizing.has(taskId)) return
    this.finalizing.add(taskId)
    try {
      await delay(IDLE_GRACE_MS)
      let task = this.store.get(taskId)
      if (!task || task.status !== 'running') return
      const sessionId = task.workerSessionId
      if (this.sessions.status(sessionId) === 'running') return
      const agent = this.ctx.get('agents')?.get?.(sessionId)
      const startedAt = task.startedAt ?? 0
      const info = this.sessions.turnInfo(agent)
      // A Session that was just created is idle before its first turn; never
      // finalize on that, nor on any idle that predates this attempt.
      if (!info.turnEndAt || info.turnEndAt < startedAt) return
      const turnEnd = this.sessions.lastTurnEnd(agent)
      const lastText = info.lastAssistantAt && info.lastAssistantAt >= startedAt
        ? this.sessions.lastAssistantText(agent)
        : ''
      task = this.store.get(taskId)
      if (!task || task.status !== 'running') return
      const reported = task.report && task.report.at >= (task.startedAt ?? 0) ? task.report : undefined
      let report = reported
      if (!report) {
        if (lastText) {
          report = {
            state: 'needs_decision',
            summary: clamp(lastText.replace(/\s+/g, ' '), 600),
            deliverables: [],
            question: '执行会话没有按协议汇报结果。上面的内容是否算完成？要继续、重试还是停止？',
            synthetic: true,
            at: now(),
          }
          this.store.log(task.id, 'report', '执行会话没有调用汇报工具，已转为待你确认')
        } else {
          report = {
            state: turnEnd === 'error' || turnEnd === 'aborted' ? 'failed' : 'needs_decision',
            summary: turnEnd === 'error' || turnEnd === 'aborted'
              ? `执行会话异常结束（${turnEnd}），没有留下汇报`
              : '执行会话结束了，但没有给出结果说明',
            deliverables: [],
            synthetic: true,
            at: now(),
          }
          this.store.log(task.id, 'report', `执行会话无汇报结束（${turnEnd ?? 'unknown'}）`)
        }
        if (report.state === 'needs_decision' && !report.question) {
          report.question = '这次执行没有给出结果说明，要继续、重试还是停止？'
        }
        this.store.update(task.id, { report, finishedAt: now() })
        this.store.log(task.id, 'report', `${report.state}: ${report.summary}`)
      }
      this.store.progress(task, report.state === 'ready' ? '执行会话报告完成，等待主管审查' : `执行会话报告：${report.state}`)

      if (!this.store.settings.autoReview) {
        this.settle(task.id, '未开启主管审查，按报告直接结算')
        return
      }
      this.store.update(task.id, { status: 'reviewing', report })
      this.enqueueReview(task.id)
      this.safePump()
    } catch (error) {
      this.log(`finalizing ${taskId} failed: ${String(error)}`)
    } finally {
      this.finalizing.delete(taskId)
    }
  }

  enqueueReview(taskId) {
    if (!this.reviewQueue.includes(taskId)) this.reviewQueue.push(taskId)
    this.safeReviews()
  }

  async processReviews() {
    if (this.reviewRunning || this.stopped) return
    this.reviewRunning = true
    try {
      while (this.reviewQueue.length && !this.stopped) {
        const ids = this.reviewQueue.splice(0)
        const tasks = ids.map(id => this.store.get(id)).filter(task => task && task.status === 'reviewing')
        if (!tasks.length) continue
        await this.runReviewBatch(tasks)
      }
    } catch (error) {
      this.log(`review loop failed: ${String(error)}`)
    } finally {
      this.reviewRunning = false
    }
  }

  async runReviewBatch(tasks) {
    try {
      const agent = await this.ensureSupervisor()
      if (!agent) throw new Error('主管会话不可用')
      const payload = {
        review_queue: tasks.map(task => ({
          task_id: task.id,
          title: task.title,
          goal: task.goal,
          ...(task.acceptance ? { acceptance: task.acceptance } : {}),
          workspace: task.workspacePath,
          attempts: task.attempts,
          review_rounds: task.reviewRounds,
          report: task.report,
          earlier_reviews: task.log.filter(entry => entry.kind === 'review').slice(-3).map(entry => entry.text),
        })),
        board: {
          queued: this.store.count('queued'),
          running: this.store.count('running'),
          needs_you: this.store.count('needs_you'),
          done: this.store.count('done'),
        },
      }
      const waiting = () => tasks.filter(task => this.store.get(task.id)?.status === 'reviewing')
      const since = now()
      await this.sessions.prompt(this.supervisorId, `sa-review-${since}`, supervisorTick(payload))
      let outcome = await this.sessions.waitTurnEnd(this.supervisorId, since, REVIEW_TIMEOUT_MS)
      // One reminder when the supervisor finished a turn without recording any
      // verdict (a model may answer in prose instead of calling the tool).
      if (outcome !== 'timeout' && waiting().length) {
        const ids = waiting().map(task => task.id).join(', ')
        const reminderAt = now()
        await this.sessions.prompt(
          this.supervisorId,
          `sa-review-reminder-${reminderAt}`,
          `上一轮还没有为这些任务调用 superagent_review：${ids}。请现在逐个调用 superagent_review（verdict + note，需要人决定时附 question），不要再解释。`,
        )
        outcome = await this.sessions.waitTurnEnd(this.supervisorId, reminderAt, REVIEW_TIMEOUT_MS)
      }
      if (outcome === 'timeout') {
        this.sessions.cancel(this.supervisorId)
        this.store.event('review.timeout', { tasks: tasks.map(task => task.id) })
        this.log('supervisor review timed out')
      }
      for (const task of tasks) {
        const current = this.store.get(task.id)
        if (current?.status === 'reviewing') this.settle(task.id, '主管未给出结论，按默认策略结算')
      }
    } catch (error) {
      this.log(`supervisor review failed: ${String(error)}`)
      for (const task of tasks) {
        const current = this.store.get(task.id)
        if (current?.status === 'reviewing') this.settle(task.id, `主管审查不可用：${String(error).slice(0, 120)}`)
      }
    }
  }

  async ensureSupervisor() {
    const existing = this.ctx.get('agents')?.get?.(this.supervisorId)
    if (existing) {
      await this.sessions.ensure({
        sessionId: this.supervisorId,
        role: 'supervisor',
        title: this.sessions.supervisorTitle(),
        tools: supervisorTools(),
      })
      return existing
    }
    const workspace = this.workspaces()[0]
    const cwd = workspace?.path ?? this.ctx.get('workingDirectory')?.defaultDirectory
    return this.sessions.ensure({
      sessionId: this.supervisorId,
      role: 'supervisor',
      ...(workspace ? { workspaceId: workspace.id } : {}),
      ...(!workspace && cwd ? { cwd } : {}),
      title: this.sessions.supervisorTitle(),
      tools: supervisorTools(),
    })
  }

  /** Record a worker's structured report (only while its attempt is still running). */
  recordReport(taskId, args) {
    const task = this.store.get(taskId)
    if (!task) return { ok: false, error: 'unknown task' }
    if (task.status !== 'running') {
      return { ok: false, error: 'the task is no longer running; this report was ignored' }
    }
    const state = ['ready', 'needs_decision', 'blocked', 'failed'].includes(args?.state) ? args.state : 'ready'
    const summary = clamp(args?.summary, 1200)
    if (!summary) return { ok: false, error: 'summary must not be empty' }
    // A model may call the tool twice in one turn; keep the first report of this attempt.
    if (task.report && task.report.at >= (task.startedAt ?? 0)
      && task.report.state === state && task.report.summary === summary) {
      return { ok: true, recorded: true, duplicate: true, next: 'report already recorded; end the turn now' }
    }
    const report = {
      state,
      summary,
      deliverables: Array.isArray(args?.deliverables)
        ? args.deliverables.filter(item => typeof item === 'string').slice(0, 20).map(item => clamp(item, 500))
        : [],
      ...(typeof args?.question === 'string' && args.question.trim() ? { question: clamp(args.question, 800) } : {}),
      at: now(),
    }
    this.store.update(taskId, { report })
    this.store.log(taskId, 'report', `${state}: ${summary}`)
    this.store.progress(taskId, state === 'ready' ? '执行会话报告完成' : `执行会话报告：${state}`)
    return { ok: true, recorded: true, next: 'report recorded; end the turn now' }
  }

  /** Apply a supervisor verdict. */
  applyReview(args) {
    const task = this.store.get(args?.task_id)
    if (!task) return { ok: false, error: `unknown task ${String(args?.task_id)}` }
    if (task.status !== 'reviewing') return { ok: false, error: 'the task is not waiting for review' }
    let verdict = ['done', 'continue', 'needs_you', 'fail'].includes(args?.verdict) ? args.verdict : 'needs_you'
    const note = clamp(args?.note, 500) || (verdict === 'done' ? '验收通过' : '')
    const at = now()
    if (verdict === 'continue' && task.reviewRounds >= MAX_REVIEW_ROUNDS) verdict = 'needs_you'
    this.store.log(task.id, 'review', `${verdict}: ${note || '(无说明)'}`)
    if (verdict === 'done') {
      this.store.update(task.id, {
        status: 'done',
        finishedAt: at,
        question: null,
        review: { verdict, note: note || '验收通过', at },
      })
      this.store.progress(task, '主管验收通过，任务完成')
    } else if (verdict === 'fail') {
      this.store.update(task.id, {
        status: 'failed',
        finishedAt: at,
        review: { verdict, note: note || '主管判定无法继续', at },
      })
      this.store.progress(task, '主管判定失败')
    } else if (verdict === 'needs_you') {
      const question = clamp(args?.question, 800)
        || note
        || (task.report?.question ?? '这一步需要你决定，请给一个明确的处理意见。')
      this.store.update(task.id, {
        status: 'needs_you',
        question: { text: question, at },
        review: { verdict, note, at },
      })
      this.store.progress(task, '需要你决定')
    } else {
      const instruction = clamp(args?.continue_instruction, 1500) || note || '继续完成剩余部分'
      this.store.update(task.id, {
        status: 'running',
        startedAt: at,
        finishedAt: null,
        report: null,
        question: null,
        reviewRounds: task.reviewRounds + 1,
        review: { verdict, note: note || instruction, at },
      })
      this.store.progress(task, '主管要求继续一步')
      const previous = task.report?.summary ? { previousReport: task.report.summary } : undefined
      void this.resumeWithInput(task.id, { continueInstruction: instruction, ...previous }).catch(error => this.failRunning(task.id, error))
    }
    this.store.event('task.reviewed', { id: task.id, verdict })
    this.safePump()
    return { ok: true, task_id: task.id, verdict }
  }

  /** Fall back to a deterministic settlement when no review is available. */
  settle(taskId, reason) {
    const task = this.store.get(taskId)
    if (!task) return
    const report = task.report
    const state = report?.state
    const synthetic = report?.synthetic === true
    const at = now()
    if (state === 'ready' && !synthetic) {
      this.store.update(task.id, {
        status: 'done',
        finishedAt: at,
        review: { verdict: 'done', note: reason, at },
      })
      this.store.progress(task, '结算完成（未经主管）')
    } else {
      this.store.update(task.id, {
        status: 'needs_you',
        question: { text: report?.question ?? report?.summary ?? '这次执行没有正常结束，请决定下一步。', at },
        review: { verdict: 'needs_you', note: reason, at },
      })
      this.store.progress(task, '需要你决定')
    }
    this.store.log(task.id, 'review', `fallback: ${state ?? 'no report'}${synthetic ? ' (unreported)' : ''} (${reason})`)
    this.store.event('task.settled', { id: task.id, state })
  }

  failRunning(taskId, error) {
    const task = this.store.get(taskId)
    if (!task || task.status !== 'running') return
    this.store.log(task.id, 'error', String(error).slice(0, 400))
    this.store.update(task.id, {
      status: 'needs_you',
      question: { text: `执行会话启动失败：${String(error).slice(0, 200)}。要重试吗？`, at: now() },
    })
    this.store.progress(task, '派发失败，需要你决定')
    this.safePump()
  }

  /** Restore interruptible state after a Host start. */
  async recover() {
    let changed = false
    for (const task of this.store.list()) {
      if (!['queued', 'running', 'reviewing', 'needs_you'].includes(task.status)) continue
      const freshReport = task.report && task.report.at >= (task.startedAt ?? 0) ? task.report : undefined
      if (task.status === 'running') {
        // The old Session may still be editing the workspace: stop it first,
        // then re-queue on a Session this generation can decorate.
        this.sessions.cancel(task.workerSessionId)
        const workerSessionId = this.newWorkerSessionId(task.id)
        if (freshReport) {
          this.store.update(task.id, { status: 'reviewing', workerSessionId, finishedAt: now() })
          this.store.log(task.id, 'recover', '重启恢复：执行已汇报，重新提交主管审查')
          this.enqueueReview(task.id)
        } else {
          this.store.update(task.id, { status: 'queued', startedAt: null, workerSessionId })
          this.store.log(task.id, 'recover', '重启恢复：上一轮执行中断，任务重新排队')
          this.store.progress(task, '重启恢复，重新排队')
        }
        changed = true
      } else {
        // A new plugin generation cannot decorate a Session an older generation
        // created (tool names are already registered on it), so open tasks move
        // to a fresh worker Session id; any continuation then dispatches cleanly.
        this.store.update(task.id, { workerSessionId: this.newWorkerSessionId(task.id) })
        if (task.status === 'reviewing') {
          this.store.log(task.id, 'recover', '重启恢复：重新提交主管审查')
          this.enqueueReview(task.id)
          changed = true
        }
      }
    }
    if (changed) this.store.event('engine.recovered')
  }

  /** Periodic maintenance: task timeouts and stalled reviews. */
  async tick() {
    if (this.stopped) return
    const limitMs = this.maxTaskMinutes * 60_000
    for (const task of this.store.list()) {
      if (task.status !== 'running') continue
      if (now() - (task.startedAt ?? task.updatedAt) < limitMs) continue
      this.sessions.cancel(task.workerSessionId)
      this.store.update(task.id, {
        status: 'needs_you',
        question: { text: `任务执行超过 ${this.maxTaskMinutes} 分钟仍未结束，要让它继续、重试还是停止？`, at: now() },
      })
      this.store.log(task.id, 'timeout', `超过 ${this.maxTaskMinutes} 分钟未结束，已中断并询问用户`)
      this.store.progress(task, '执行超时，需要你决定')
    }
    for (const id of [...this.reviewQueue]) {
      const task = this.store.get(id)
      if (!task || task.status !== 'reviewing') this.reviewQueue = this.reviewQueue.filter(item => item !== id)
    }
    await this.pump()
  }

  /** Compact board data for the supervisor's optional tool. */
  supervisorBoard() {
    return {
      tasks: this.store.list().filter(task => ['queued', 'running', 'reviewing', 'needs_you'].includes(task.status)).map(task => ({
        task_id: task.id,
        title: task.title,
        status: task.status,
        workspace: task.workspacePath,
        attempts: task.attempts,
        report: task.report ? reportLine(task.report) : null,
        review: task.review?.verdict ?? null,
        updated: stamp(task.updatedAt),
      })),
      counts: {
        queued: this.store.count('queued'),
        running: this.store.count('running'),
        reviewing: this.store.count('reviewing'),
        needs_you: this.store.count('needs_you'),
        done: this.store.count('done'),
      },
    }
  }
}
