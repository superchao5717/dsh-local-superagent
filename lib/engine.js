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
import { randomUUID } from 'node:crypto'
import { Attachments, AttachmentFailure, questionKey } from './attachments.js'
import { clamp, delay, now, stamp } from './util.js'
import { supervisorTick, workerAssignment, workerContinuation, workerTitle } from './prompts.js'
import { supervisorTools, workerTools } from './tools.js'
import {
  defaultWorkerModel,
  effectiveWorkerModels,
  formatSelection,
  normalizeModels,
  parseSelection,
  trimCatalog,
  withinWorkerRange,
} from './models.js'
const TICK_MS = 20_000
const REVIEW_TIMEOUT_MS = 240_000
const IDLE_GRACE_MS = 900
const MAX_REVIEW_ROUNDS = 2
const SUPERVISOR_ID = 'sa-supervisor'
const CATALOG_TTL_MS = 30_000

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
    this.attachments = new Attachments({ ctx, store })
    this.sessions = sessions
    this.log = log
    this.maxTaskMinutes = config?.maxTaskMinutes ?? 45
    // A fresh supervisor Session per plugin generation: a live Session keeps the
    // tool registrations of the plugin instance that created it, and a reload
    // cannot replace same-named tools. The previous generation's Session is
    // archived on start so the sidebar stays clean.
    this.supervisorId = `${SUPERVISOR_ID}-${now().toString(36).slice(-5)}`
    this.supervisorSessions = new Map()
    this.activeReviews = new Map()
    this.reviewTasks = new Map()
    this.pumping = false
    this.finalizing = new Set()
    this.reviewQueue = []
    this.reviewRunning = false
    this.timer = null
    this.stopped = false
    /** Last successful Host model catalog, with the time it was read. */
    this.catalogCache = { at: 0, value: null }
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
    const previous = this.store.supervisors.filter(id => ![...this.supervisorSessions.values()].includes(id))
    const registry = this.ctx.get('workspaceRegistry')
    for (const id of previous) {
      try {
        this.sessions.cancel(id)
        await registry?.archiveSession?.(id)
      } catch (error) {
        this.log(`could not archive the old supervisor Session ${id}: ${String(error)}`)
      }
    }
    this.store.supervisors = this.store.superagents().map(a => this.sessionFor(a.id))
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
    this.attachments.close()
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
    const superagents = this.store.superagents().map(a => this.superagentView(a))
    const live = {
      running: tasks.filter(task => task.status === 'running').length,
      queued: tasks.filter(task => task.status === 'queued').length,
      reviewing: tasks.filter(task => task.status === 'reviewing').length,
      needsYou: tasks.filter(task => task.status === 'needs_you').length,
      done: tasks.filter(task => task.status === 'done').length,
      failed: tasks.filter(task => task.status === 'failed').length,
      capacity: superagents.reduce((n, a) => n + a.live.capacity, 0),
    }
    return {
      version: this.version ?? '0.2.0',
      stateDir: this.stateDir ?? '',
      settings,
      settingsScope: 'global',
      attachments: this.attachments.capability(),
      settingsMigration: structuredClone(this.store.data.settingsMigration),
      superagents,
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
    return structuredClone({
      id: task.id,
      superagentId: task.superagentId,
      superagentTitle: this.store.superagent(task.superagentId)?.title ?? '',
      autonomy: task.autonomy,
      autonomyReviewPending: task.status === 'reviewing' && !!task.autonomyReview,
      workspaceId: task.workspaceId,
      workspaceTitle: workspace?.title ?? task.workspaceTitle,
      workspacePath: workspace?.path ?? task.workspacePath,
      title: task.title,
      goal: task.goal,
      parentTaskId: task.parentTaskId,
      followupContext: task.followupContext,
      acceptance: task.acceptance,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      workerSessionId: task.workerSessionId,
      workerModel: task.workerModel ?? null,
      attempts: task.attempts,
      report: task.report,
      review: task.review,
      question: task.question,
      questionKey: questionKey(task),
      attachments: task.attachments,
      progress: task.progress,
      durationMs: ended ? Math.max(0, ended - started) : null,
    })
  }

  /** Task plus its internal log, for the detail panel. */
  taskDetail(id) {
    const task = this.store.get(id)
    if (!task) return undefined
    return {
      task: this.taskView(task),
      log: structuredClone(task.log),
      workerSessionId: task.workerSessionId,
      attempts: task.attempts,
      workerModel: task.workerModel ?? null,
    }
  }

  /** The configured worker model for a fresh attempt (null = DSH default). */
  workerModelDefault(superagentId) {
    return defaultWorkerModel(this.store.settingsFor(superagentId).models)
  }

  // ------------------------------------------------------------- board actions

  sessionFor(id) {
    if (!this.supervisorSessions.has(id)) {
      const sessionId = `${this.supervisorId}-${id}-${randomUUID().slice(0, 8)}`
      this.supervisorSessions.set(id, sessionId)
      this.store.supervisors = [...this.store.supervisors, sessionId]
    }
    return this.supervisorSessions.get(id)
  }
  superagentView(a) {
    const tasks = this.store.list().filter(t => t.superagentId === a.id)
    const count = status => tasks.filter(t => t.status === status).length
    const sessionId = this.sessionFor(a.id)
    return { id: a.id, workspaceId: a.workspaceId, title: a.title, settings: this.store.settingsFor(a.id),
      supervisor: { sessionId, running: this.sessions.status(sessionId) === 'running' },
      live: { running: count('running'), queued: count('queued'), reviewing: count('reviewing'), needsYou: count('needs_you'), done: count('done'), failed: count('failed'), capacity: this.store.settings.maxWorkers } }
  }
  resolveSuperagent(id, workspaceId) {
    if (id) {
      const a = this.store.superagent(id)
      if (!a || a.deletedAt) return { error: 'unknown_superagent', message: '主管不存在或已删除。' }
      if (workspaceId && a.workspaceId !== workspaceId) return { error: 'workspace_mismatch', message: '主管与工作区不匹配。' }
      return a
    }
    const agents = this.store.superagents().filter(a => !workspaceId || a.workspaceId === workspaceId)
    if (agents.length > 1) return { error: 'ambiguous_superagent', message: '请选择明确的主管。' }
    if (agents.length) return agents[0]
    if (workspaceId) return this.store.ensureDefault(workspaceId, this.workspaces().find(w => w.id === workspaceId)?.title)
    return null
  }
  addSuperagent({workspaceId, title}) {
    if (!this.workspaces().some(w => w.id === workspaceId)) return { error: 'unknown_workspace', message: '工作区不存在。' }
    if (!clamp(title, 120)) return { error: 'invalid_title', message: '请填写主管名称。' }
    return { superagent: this.superagentView(this.store.addSuperagent(workspaceId, clamp(title, 120))) }
  }
  updateSuperagent({id, title}) {
    const a = this.resolveSuperagent(id)
    if (a?.error) return a
    if (!a) return { error: 'unknown_superagent', message: '主管不存在。' }
    if (!clamp(title, 120)) return { error: 'invalid_title', message: '请填写主管名称。' }
    a.title = clamp(title, 120); this.store.commit(); return { superagent: this.superagentView(a) }
  }
  removeSuperagent(id) {
    const a = this.resolveSuperagent(id)
    if (a?.error) return a
    if (!a) return { error: 'unknown_superagent', message: '主管不存在。' }
    if (this.store.list().some(t => t.superagentId === a.id && ['queued','running','reviewing','needs_you'].includes(t.status))) return { error: 'busy', message: '主管仍有未结束任务。' }
    a.deletedAt = now(); this.sessions.cancel(this.sessionFor(a.id)); this.store.commit(); return { ok: true }
  }
  addTask(input) {
    const workspace = this.workspaces().find(item => item.id === input.workspaceId)
    if (!workspace) return { error: 'unknown_workspace', message: '工作区不存在或尚未注册。' }
    const title = clamp(input.title, 200)
    const goal = clamp(input.goal, 8000)
    if (!title) return { error: 'invalid_title', message: '请填写任务标题。' }
    if (!goal) return { error: 'invalid_goal', message: '请填写任务目标。' }
    let batch
    try { batch = this.attachments.prepare(input.attachments) } catch (error) {
      if (error instanceof AttachmentFailure) return { error: error.code, message: error.message }
      throw error
    }
    const owner = this.resolveSuperagent(input.superagentId, workspace.id)
    if (owner?.error) return owner
    const task = this.store.add({
      attachments: batch.attachments,
      superagentId: owner.id,
      workspaceId: workspace.id,
      workspaceTitle: workspace.title,
      workspacePath: workspace.path,
      title,
      goal,
      acceptance: clamp(input.acceptance, 4000),
      priority: [1, 2, 3].includes(Number(input.priority)) ? Number(input.priority) : 2,
    })
    batch.consume()
    this.store.event('task.added', { id: task.id, title })
    this.store.log(task.id, 'create', `任务已创建：${title}`)
    this.safePump()
    return { task: this.taskView(task) }
  }

  /** A follow-up is a new task/session, never an interruption of the source. */
  followup(id, input = {}) {
    const source = this.store.get(id)
    if (!source) return { error: 'unknown_task', message: '任务不存在。' }
    const text = typeof input.text === 'string' ? input.text.trim() : ''
    if (text.length > 8000) return { error: 'invalid_goal', message: '补充要求不能超过 8000 字。' }
    const owner = this.resolveSuperagent(source.superagentId, source.workspaceId)
    if (owner?.error) return owner
    const workspace = this.workspaces().find(item => item.id === source.workspaceId)
    if (!workspace) return { error: 'unknown_workspace', message: '原工作区已不可用。' }
    if ((source.followupContext?.length ?? 0) >= 8) return { error: 'invalid_goal', message: '关联上下文已达 8 层，请另行布置新任务。' }
    let batch
    try { batch = this.attachments.prepare(input.attachments, { task: source }) } catch (error) {
      if (error instanceof AttachmentFailure) return { error: error.code, message: error.message }
      throw error
    }
    if (!text && !batch.attachments.length) return { error: 'invalid_goal', message: '请补充要求或附件。' }
    const task = this.store.add({
      workspaceId: workspace.id, workspaceTitle: workspace.title, workspacePath: workspace.path,
      superagentId: owner.id, title: clamp(`补充：${source.title}`, 200), priority: source.priority,
      goal: text || '请结合新增附件处理原任务的补充要求；如要求不明确，报告需要用户决定，不猜测。',
      acceptance: '', attachments: [...structuredClone(source.attachments), ...batch.attachments],
      parentTaskId: source.id,
      followupContext: [...structuredClone(source.followupContext ?? []), {
        taskId: source.id, title: source.title, goal: source.goal, acceptance: source.acceptance,
        status: source.status, report: structuredClone(source.report), review: structuredClone(source.review),
      }],
    })
    batch.consume()
    this.store.log(task.id, 'create', `来自任务 ${source.id} 的补充要求（独立新会话；原任务不变）`)
    this.store.event('task.added', { id: task.id, title: task.title })
    this.safePump()
    return { task: this.taskView(task) }
  }

  answer(id, text, attachmentIds, expectedQuestionKey) {
    const task = this.store.get(id)
    if (!task) return { error: 'unknown_task', message: '任务不存在。' }
    if (task.status !== 'needs_you' && !(task.status === 'reviewing' && task.autonomyReview)) return { error: 'not_waiting', message: '这个任务现在不在等待你回答。' }
    if (expectedQuestionKey !== undefined && expectedQuestionKey !== questionKey(task)) return { error: 'attachment_question_changed', message: '问题已变化，请刷新后重新回答。' }
    let batch
    try { batch = this.attachments.prepare(attachmentIds, { task, source: 'answer' }) } catch (error) {
      if (error instanceof AttachmentFailure) return { error: error.code, message: error.message }
      throw error
    }
    const answer = clamp(text, 4000)
    if (!answer && !batch.attachments.length) return { error: 'invalid_answer', message: '回答不能为空；可输入文字或上传附件。' }
    this.store.log(task.id, 'answer', `用户回答：${answer || '（补充附件）'}${batch.attachments.length ? `，附 ${batch.attachments.length} 个附件` : ''}`)
    this.store.progress(task, '已收到你的回答，继续执行')
    this.store.update(task.id, {
      question: null,
      report: null,
      review: null,
      reviewRounds: 0,
      status: 'queued',
      autonomy: { attempted: false }, autonomyReview: null,
      pendingInput: { answer, attachmentReply: batch.attachments.length > 0, previousReport: task.report?.summary, previousQuestion: task.question?.text },
      attachments: [...task.attachments, ...batch.attachments],
      startedAt: null,
      finishedAt: null,
    })
    batch.consume()
    this.safePump()
    return { task: this.taskView(this.store.get(task.id)) }
  }

  retry(id) {
    const task = this.store.get(id)
    if (!task) return { error: 'unknown_task', message: '任务不存在。' }
    if (this.store.superagent(task.superagentId)?.deletedAt) return { error: 'unknown_superagent', message: '原主管已删除，请在活动主管下新建任务；历史任务归属保持不变。' }
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
      attempts: 0, autonomy: { attempted: false }, autonomyReview: null, pendingInput: null,
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
    this.store.update(task.id, { status: 'cancelled', finishedAt: now(), question: null, autonomyReview: null, pendingInput: null })
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

  /**
   * Read the Host model catalog (cached briefly for the polling browser half)
   * together with this board's configured model settings.
   */
  async modelCatalog(_superagentId) {
    const models = this.store.settings.models
    const cache = this.catalogCache
    if (cache.value && now() - cache.at < CATALOG_TTL_MS) return { ...cache.value, models }
    const controller = this.ctx.get('sessionController')
    if (!controller?.modelCatalog) {
      return {
        available: false,
        default: null,
        groups: [],
        failures: [],
        models,
        reason: '当前 Host 没有提供模型目录服务；模型设置仍会按 provider/model 原样保存。',
      }
    }
    try {
      const value = trimCatalog(await controller.modelCatalog())
      this.catalogCache = { at: now(), value }
      return { ...value, models }
    } catch (error) {
      this.log(`could not read the model catalog: ${String(error)}`)
      return {
        available: false,
        default: null,
        groups: [],
        failures: [],
        models,
        reason: `读取模型目录失败：${String(error).slice(0, 200)}`,
      }
    }
  }

  /** A problem description when `selection` is not in the live catalog, else null. */
  checkCatalogSelection(catalog, label, selection) {
    if (!selection) return null
    const groups = Array.isArray(catalog.groups) ? catalog.groups : []
    if (!groups.length) return null
    const group = groups.find(item => item.id === selection.provider)
    if (!group) return `${label}：提供方 ${selection.provider} 当前不可用。`
    if (!group.models.some(item => item.id === selection.model)) {
      return `${label}：模型 ${selection.provider}/${selection.model} 当前不可用。`
    }
    return null
  }

  async saveSettings(patch) {
    const input = patch ?? {}
    if ('superagentId' in input) return { error: 'settings_scope_changed', message: '设置现已全局生效。请刷新看板后在全局设置中重试；旧主管限定请求未执行。' }
    const next = {}
    if (input.autonomy !== undefined) next.autonomy = input.autonomy
    if (typeof input.paused === 'boolean') next.paused = input.paused
    if (input.maxWorkers !== undefined) next.maxWorkers = input.maxWorkers
    if (typeof input.autoReview === 'boolean') next.autoReview = input.autoReview
    if (input.models !== undefined) {
      const source = input.models && typeof input.models === 'object' ? input.models : {}
      const current = this.store.settings.models
      const models = normalizeModels({
        supervisor: 'supervisor' in source ? source.supervisor : current.supervisor,
        workers: 'workers' in source ? source.workers : current.workers,
      })
      const catalog = await this.modelCatalog()
      const problem = catalog.groups.length
        ? this.checkCatalogSelection(catalog, '主管模型', models.supervisor)
          ?? models.workers.map((item, index) => this.checkCatalogSelection(catalog, `工作代理模型 #${index + 1}`, item)).find(Boolean)
          ?? null
        : null
      if (problem) return { error: 'invalid_model', message: `${problem} 请刷新模型列表后重新选择。` }
      next.models = models
    }
    const settings = this.store.setSettings(next)
    if (settings.paused || !settings.autonomy.enabled) {
      for (const task of this.store.list()) if (task.autonomyReview) this.restoreAutonomyWait(task)
    }
    if (next.models !== undefined) {
      for (const agent of this.store.superagents()) this.sessions.applyModel?.(this.sessionFor(agent.id), settings.models.supervisor)
      // The legacy diagnostic id may still have an attached Session in an old Host.
      this.sessions.applyModel?.(this.supervisorId, settings.models.supervisor)
    }
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
        const queued = this.store.list()
          .filter(task => task.status === 'queued' && this.hasCapacity(task.superagentId))
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
    return `sa-task-${taskId.slice(3, 11)}-${randomUUID().slice(0, 12)}`
  }

  hasCapacity(id) {
    const a = this.store.superagent(id)
    const settings = this.store.settingsFor(id)
    return !this.stopped && !a?.deletedAt && !settings.paused && this.store.list().filter(t => t.superagentId === id && t.status === 'running').length < settings.maxWorkers
  }
  async dispatch(taskId, extra) {
    let task = this.store.get(taskId)
    if (!task || task.status !== 'queued') return
    const workerSessionId = this.newWorkerSessionId(task.id)
    // Keep a supervisor-selected route only while globally allowed, but use
    // its latest configured effort/options rather than a stale task snapshot.
    const range = effectiveWorkerModels(this.store.settings.models)
    const model = range.find(item => item.provider === task.workerModel?.provider && item.model === task.workerModel?.model)
      ?? this.workerModelDefault(task.superagentId)
    task = this.store.update(task.id, {
      status: 'running',
      attempts: task.attempts + 1,
      startedAt: now(),
      finishedAt: null,
      report: null,
      question: null,
      review: null,
      workerSessionId,
      workerModel: model ?? null,
    })
    this.store.log(task.id, 'dispatch', `第 ${task.attempts} 轮：派发给执行会话 ${workerSessionId}${model ? `（模型 ${formatSelection(model)}）` : '（跟随 DSH 默认模型）'}`)
    this.store.progress(task, `已派发（第 ${task.attempts} 轮）`)
    try {
      await this.sessions.ensure({
        sessionId: workerSessionId,
        role: 'worker',
        workspaceId: task.workspaceId,
        cwd: task.workspacePath,
        title: workerTitle(task.title),
        tools: workerTools(task.id, task.workerSessionId),
        model,
      })
      // A stop/remove or another dispatch may have landed while the Session was
      // being created; never prompt a task that is no longer this running attempt.
      const current = this.store.get(task.id)
      if (!current || current.status !== 'running' || current.workerSessionId !== workerSessionId) {
        this.sessions.cancel(workerSessionId)
        return
      }
      const input = extra ?? task.pendingInput
      const message = input ? workerContinuation(task, input) : workerAssignment(task)
      const parts = await this.attachments.workerParts(workerSessionId, task.attachments)
      const ready = this.store.get(task.id)
      if (this.stopped || !ready || ready.status !== 'running' || ready.workerSessionId !== workerSessionId) {
        this.sessions.cancel(workerSessionId)
        return
      }
      this.store.update(task.id, { pendingInput: null })
      await this.sessions.prompt(workerSessionId, `sa-assign-${task.id}-${task.attempts}`, message, 'queue', parts)
      this.store.progress(task, '执行会话已开始工作')
    } catch (error) {
      if (this.store.get(task.id)?.workerSessionId === workerSessionId) this.failRunning(task.id, error)
    }
  }

  /** Continue an existing wait: deliver a user answer or a review follow-up. */
  async resumeWithInput(taskId, extra) {
    const task = this.store.get(taskId)
    if (!task || task.status !== 'running') return
    const model = task.workerModel ?? this.workerModelDefault(task.superagentId)
    if (this.sessions.isLive(task.workerSessionId)) {
      await this.sessions.ensure({
        sessionId: task.workerSessionId,
        role: 'worker',
        workspaceId: task.workspaceId,
        cwd: task.workspacePath,
        title: workerTitle(task.title),
        tools: workerTools(task.id, task.workerSessionId),
        model,
      })
      const sessionId = task.workerSessionId
      const parts = await this.attachments.workerParts(sessionId, task.attachments)
      if (this.stopped || this.store.get(task.id)?.status !== 'running' || this.store.get(task.id)?.workerSessionId !== sessionId) return
      await this.sessions.prompt(sessionId, `sa-continue-${task.id}-${now()}`, workerContinuation(task, extra), 'queue', parts)
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

      if (!this.store.settingsFor(task.superagentId).autoReview) {
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
    const tasks = this.reviewQueue.map(id => this.store.get(id)).filter(t => t?.status === 'reviewing')
    const launched = []
    for (const id of new Set(tasks.map(t => t.superagentId))) {
      if (this.reviewTasks.has(id)) continue
      const batch = tasks.filter(t => t.superagentId === id)
      const ids = new Set(batch.map(t => t.id))
      this.reviewQueue = this.reviewQueue.filter(id => !ids.has(id))
      const promise = this.runReviewBatch(batch).finally(() => {
        this.reviewTasks.delete(id)
        this.safeReviews()
      })
      this.reviewTasks.set(id, promise)
      launched.push(promise)
    }
    await Promise.all(launched)
  }

  async runReviewBatch(tasks) {
    const superagentId = tasks[0].superagentId
    const supervisorId = this.sessionFor(superagentId)
    const batch = new Map(tasks.map(t => [t.id, { epoch: t.reviewEpoch, token: randomUUID() }]))
    this.activeReviews.set(superagentId, batch)
    const isCurrent = task => task?.status === 'reviewing' && batch.get(task.id)?.epoch === task.reviewEpoch
    try {
      const agent = await this.ensureSupervisor(superagentId)
      if (!agent) throw new Error('主管会话不可用')
      if (!tasks.some(task => isCurrent(this.store.get(task.id)))) return
      const models = this.store.settingsFor(superagentId).models
      const payload = {
        review_queue: tasks.map(task => ({
          task_id: task.id,
          review_token: batch.get(task.id).token,
          title: task.title,
          goal: task.goal,
          ...(task.parentTaskId ? { parent_task_id: task.parentTaskId, prior_task_context: task.followupContext } : {}),
          ...(task.acceptance ? { acceptance: task.acceptance } : {}),
          workspace: task.workspacePath,
          attempts: task.attempts,
          review_rounds: task.reviewRounds,
          worker_model: task.workerModel ? formatSelection(task.workerModel) : 'deployment default',
          report: task.report,
          attachments: task.attachments.map(({ kind, attachmentId, name, bytes }) => ({ kind, attachmentId, name, bytes })),
         ...(task.autonomyReview ? { autonomy_timeout: true, unanswered_question: task.question, safety: 'No user answer exists. Only continue within original authorization. Never bypass login, permission, safety, payment or human-only steps.' } : {}),
          earlier_reviews: task.log.filter(entry => entry.kind === 'review').slice(-3).map(entry => entry.text),
        })),
        worker_models: effectiveWorkerModels(models).map(item => formatSelection(item)),
        ...(models.supervisor ? { supervisor_model: formatSelection(models.supervisor) } : {}),
        board: {
          queued: this.scopedCount(superagentId, 'queued'),
          running: this.scopedCount(superagentId, 'running'),
          needs_you: this.scopedCount(superagentId, 'needs_you'),
          done: this.scopedCount(superagentId, 'done'),
        },
      }
      const waiting = () => tasks.filter(task => isCurrent(this.store.get(task.id)))
      const since = now()
      await this.sessions.prompt(supervisorId, `sa-review-${since}`, supervisorTick(payload))
      let outcome = await this.sessions.waitTurnEnd(supervisorId, since, REVIEW_TIMEOUT_MS)
      // One reminder when the supervisor finished a turn without recording any
      // verdict (a model may answer in prose instead of calling the tool).
      if (outcome !== 'timeout' && waiting().length) {
        const ids = waiting().map(task => task.id).join(', ')
        const reminderAt = now()
        await this.sessions.prompt(
          supervisorId,
          `sa-review-reminder-${reminderAt}`,
          `上一轮还没有为这些任务调用 superagent_review：${ids}。请现在逐个调用 superagent_review（verdict + note，需要人决定时附 question），不要再解释。`,
        )
        outcome = await this.sessions.waitTurnEnd(supervisorId, reminderAt, REVIEW_TIMEOUT_MS)
      }
      if (outcome === 'timeout') {
        this.sessions.cancel(supervisorId)
        this.store.event('review.timeout', { tasks: tasks.map(task => task.id) })
        this.log('supervisor review timed out')
      }
      for (const task of tasks) {
        const current = this.store.get(task.id)
        if (isCurrent(current)) this.settle(task.id, '主管未给出结论，按默认策略结算')
      }
    } catch (error) {
      this.log(`supervisor review failed: ${String(error)}`)
      for (const task of tasks) {
        const current = this.store.get(task.id)
        if (isCurrent(current)) this.settle(task.id, `主管审查不可用：${String(error).slice(0, 120)}`)
      }
    } finally { this.activeReviews.delete(superagentId) }
  }

  async ensureSupervisor(superagentId) {
    const supervisorId = superagentId ? this.sessionFor(superagentId) : this.supervisorId
    const model = this.store.settingsFor(superagentId).models.supervisor
    const existing = this.ctx.get('agents')?.get?.(supervisorId)
    if (existing) {
      await this.sessions.ensure({
        sessionId: supervisorId,
        role: 'supervisor',
        title: `${this.store.superagent(superagentId)?.title ?? 'Superagent'} · ${this.sessions.supervisorTitle()}`,
        tools: supervisorTools(superagentId, supervisorId),
        model,
      })
      return existing
    }
    const workspace = this.workspaces().find(w => w.id === this.store.superagent(superagentId)?.workspaceId) ?? this.workspaces()[0]
    const cwd = workspace?.path ?? this.ctx.get('workingDirectory')?.defaultDirectory
    return this.sessions.ensure({
      sessionId: supervisorId,
      role: 'supervisor',
      ...(workspace ? { workspaceId: workspace.id } : {}),
      ...(!workspace && cwd ? { cwd } : {}),
      title: `${this.store.superagent(superagentId)?.title ?? 'Superagent'} · ${this.sessions.supervisorTitle()}`,
      tools: supervisorTools(superagentId, supervisorId),
      model,
    })
  }

  /** Record a worker's structured report (only while its attempt is still running). */
  recordReport(taskId, args, sessionId) {
    const task = this.store.get(taskId)
    if (!task) return { ok: false, error: 'unknown task' }
    if (sessionId && sessionId !== task.workerSessionId) return { ok: false, error: 'stale worker attempt' }
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
  applyReview(args, authority) {
    const task = this.store.get(args?.task_id)
    if (!task) return { ok: false, error: `unknown task ${String(args?.task_id)}` }
    const claim = this.activeReviews.get(task.superagentId)?.get(task.id)
    if (authority && (!authority.superagentId || authority.superagentId !== task.superagentId || authority.sessionId !== this.sessionFor(task.superagentId) || !claim || claim.epoch !== task.reviewEpoch || claim.token !== args.review_token)) return { ok: false, error: 'forbidden: stale token or task outside this supervisor review batch' }
    if (task.status !== 'reviewing') return { ok: false, error: 'the task is not waiting for review' }
    if (task.autonomyReview) return this.applyAutonomyReview(task, args, authority)
    let verdict = ['done', 'continue', 'needs_you', 'fail'].includes(args?.verdict) ? args.verdict : 'needs_you'
    const note = clamp(args?.note, 500) || (verdict === 'done' ? '验收通过' : '')
    const at = now()
    if (verdict === 'continue' && task.reviewRounds >= MAX_REVIEW_ROUNDS) verdict = 'needs_you'
    // The supervisor may switch the worker model for the next round, but only
    // to a model the user put in the configured worker range.
    let nextWorkerModel
    if (verdict === 'continue' && typeof args?.worker_model === 'string' && args.worker_model.trim()) {
      const requested = parseSelection(args.worker_model)
      if (!requested) return { ok: false, error: 'worker_model 必须是 "provider/model" 格式，例如 provider/model-id。' }
      const range = effectiveWorkerModels(this.store.settingsFor(task.superagentId).models)
      if (!withinWorkerRange(range, requested)) {
        const allowed = range.map(formatSelection).join('、') || '（当前没有配置工作代理模型范围）'
        return { ok: false, error: `worker_model 必须从已配置的工作代理模型范围中选择：${allowed}` }
      }
      nextWorkerModel = range.find(item => item.provider === requested.provider && item.model === requested.model) ?? requested
    }
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
        question: { text: question, at, requiresHuman: args.requires_human !== false || this.humanOnly(task, question) },
        review: { verdict, note, at },
      })
      this.store.progress(task, '需要你决定')
    } else {
      const instruction = clamp(args?.continue_instruction, 1500) || note || '继续完成剩余部分'
      this.store.update(task.id, {
        status: 'queued',
        pendingInput: { continueInstruction: instruction, previousReport: task.report?.summary },
        startedAt: null,
        finishedAt: null,
        report: null,
        question: null,
        reviewRounds: task.reviewRounds + 1,
        review: { verdict, note: note || instruction, at },
        ...(nextWorkerModel ? { workerModel: nextWorkerModel } : {}),
      })
      if (nextWorkerModel) {
        this.store.log(task.id, 'review', `下一轮工作模型：${formatSelection(nextWorkerModel)}`)
        this.store.progress(task, `主管要求继续一步（下一轮模型 ${formatSelection(nextWorkerModel)}）`)
      } else {
        this.store.progress(task, '主管要求继续一步')
      }
      const previous = task.report?.summary ? { previousReport: task.report.summary } : undefined
      this.safePump()
    }
    this.store.event('task.reviewed', { id: task.id, verdict })
    this.safePump()
    return { ok: true, task_id: task.id, verdict }
  }

  /** Fall back to a deterministic settlement when no review is available. */
  settle(taskId, reason) {
    const task = this.store.get(taskId)
    if (!task) return
    if (task.autonomyReview) { this.restoreAutonomyWait(task); return }
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
      if (task.autonomyReview) { this.restoreAutonomyWait(task); continue }
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
    this.attachments.prune()
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
    this.considerAutonomy()
    await this.pump()
  }

  humanOnly(task, question = '') {
    return ['blocked', 'failed'].includes(task.report?.state) || /登录|登陆|密码|验证码|凭据|令牌|授权|权限|批准|拒绝|付款|支付|购买|安全|人[工类]|login|sign.?in|password|credential|permission|approval|denied|pay|purchase|safety|human.only/i.test(`${question} ${task.report?.summary ?? ''} ${task.report?.question ?? ''}`)
  }
  considerAutonomy() {
    for (const task of this.store.list()) {
      const settings = this.store.settingsFor(task.superagentId)
      if (this.stopped || settings.paused || !settings.autonomy.enabled || task.status !== 'needs_you' || task.autonomy?.attempted || task.question?.requiresHuman !== false || this.humanOnly(task, task.question.text)) continue
      if (now() - task.question.at < settings.autonomy.waitMinutes * 60000) continue
      if (!this.hasCapacity(task.superagentId)) continue
      // Persist the claim before any await: exactly once even with concurrent ticks/restarts.
      this.store.update(task.id, { status: 'reviewing', autonomy: { attempted: true, questionKey: `${task.question.at}:${task.question.text}` }, autonomyReview: { question: { ...task.question } } })
      this.enqueueReview(task.id)
    }
  }
  restoreAutonomyWait(task) {
    if (task.status !== 'reviewing' || !task.autonomyReview) return
    this.store.update(task.id, { status: 'needs_you', question: task.autonomyReview.question, autonomyReview: null })
  }
  applyAutonomyReview(task, args) {
    const settings = this.store.settingsFor(task.superagentId)
    if (!settings.autonomy.enabled || settings.paused || this.stopped || this.humanOnly(task, task.question?.text)) { this.restoreAutonomyWait(task); return { ok: false, error: 'autonomy disabled, paused or human required' } }
    const instruction = clamp(args.continue_instruction, 1500)
    if (args.verdict !== 'continue' || !instruction || task.reviewRounds >= MAX_REVIEW_ROUNDS || this.humanOnly(task, instruction)) {
      this.restoreAutonomyWait(task); return { ok: true, verdict: 'needs_you', task_id: task.id }
    }
    this.store.log(task.id, 'autonomy', `主管自主续办（非用户回答）：${clamp(args.note,500) || instruction}`)
    this.store.update(task.id, { status: 'queued', question: null, autonomyReview: null, report: null, reviewRounds: task.reviewRounds + 1,
      pendingInput: { continueInstruction: `主管自主决策，用户未回答；不得扩大原授权或执行必须由人完成的登录/权限/安全/付款步骤。${instruction}`, previousReport: task.report?.summary, previousQuestion: task.question?.text },
      review: { verdict: 'continue', note: clamp(args.note,500) || instruction, at: now() } })
    this.safePump(); return { ok: true, verdict: 'continue', task_id: task.id }
  }
  /** Compact board data for the supervisor's optional tool. */
  scopedCount(id, status) { return this.store.list().filter(t => t.superagentId === id && t.status === status).length }
  supervisorBoard(superagentId) {
    return {
      tasks: this.store.list().filter(task => task.superagentId === superagentId && ['queued', 'running', 'reviewing', 'needs_you'].includes(task.status)).map(task => ({
        task_id: task.id,
        title: task.title,
        status: task.status,
        workspace: task.workspacePath,
        attempts: task.attempts,
        worker_model: task.workerModel ? formatSelection(task.workerModel) : null,
        report: task.report ? reportLine(task.report) : null,
        review: task.review?.verdict ?? null,
        updated: stamp(task.updatedAt),
      })),
      counts: {
        queued: this.scopedCount(superagentId, 'queued'),
        running: this.scopedCount(superagentId, 'running'),
        reviewing: this.scopedCount(superagentId, 'reviewing'),
        needs_you: this.scopedCount(superagentId, 'needs_you'),
        done: this.scopedCount(superagentId, 'done'),
      },
    }
  }
}
