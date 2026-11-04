import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { Store } from '../lib/store.js'
import { Engine } from '../lib/engine.js'
import { cleanupDir, fakeCtx, fakeSessions, makeTempDir, waitFor } from './support.js'

const dirs = []
const stores = []

after(async () => {
  for (const store of stores) {
    try {
      await store.close()
    } catch {
      /* ignore */
    }
  }
  for (const dir of dirs) await cleanupDir(dir)
})

async function setup(options = {}) {
  const dir = await makeTempDir('engine-')
  dirs.push(dir)
  const file = join(dir, 'board.json')
  const store = new Store({ file })
  stores.push(store)
  await store.load()
  // Keep the scheduler quiet unless a test explicitly exercises it.
  store.setSettings({ paused: true })
  const ctx = fakeCtx({
    workspaces: options.workspaces ?? [{ id: 'w1', title: 'WS', path: 'D:\\ws', sessions: [] }],
    agents: options.agents ?? new Map(),
    services: options.services,
  })
  const sessions = fakeSessions(options.sessions)
  const engine = new Engine({ ctx, store, sessions, log: options.log ?? (() => {}), config: options.config })
  return { dir, file, store, ctx, sessions, engine }
}

function seed(store, patch = {}, input = {}) {
  const task = store.add({
    workspaceId: 'w1',
    workspaceTitle: 'WS',
    workspacePath: 'D:\\ws',
    title: 'T',
    goal: 'G',
    ...input,
  })
  if (patch) store.update(task.id, patch)
  return store.get(task.id)
}

const report = (state = 'ready', extra = {}) => ({
  state,
  summary: 'worker summary',
  deliverables: [],
  at: Date.now(),
  ...extra,
})

test('engine: addTask validates the workspace/title/goal and clamps the long fields', async () => {
  const { engine, store } = await setup()
  assert.equal(engine.addTask({ workspaceId: 'nope', title: 'T', goal: 'G' }).error, 'unknown_workspace')
  assert.equal(engine.addTask({ workspaceId: 'w1', title: '   ', goal: 'G' }).error, 'invalid_title')
  assert.equal(engine.addTask({ workspaceId: 'w1', title: 'T', goal: '   ' }).error, 'invalid_goal')

  const added = engine.addTask({
    workspaceId: 'w1',
    title: '  Do the thing  ',
    goal: '  Make it work  ',
    acceptance: '  green tests  ',
    priority: 9,
  })
  assert.ok(added.task)
  assert.match(added.task.id, /^sa-[0-9a-f]{8}$/)
  assert.equal(added.task.title, 'Do the thing')
  assert.equal(added.task.goal, 'Make it work')
  assert.equal(added.task.acceptance, 'green tests')
  assert.equal(added.task.priority, 2)
  assert.equal(added.task.status, 'queued')
  assert.equal(added.task.workspaceTitle, 'WS')
  assert.equal(added.task.workspacePath, 'D:\\ws')
  assert.equal(added.task.goal, store.get(added.task.id).goal)
  assert.ok(store.data.events.some(event => event.type === 'task.added' && event.data.id === added.task.id))

  assert.equal(engine.addTask({ workspaceId: 'w1', title: 'T', goal: 'G', priority: 1 }).task.priority, 1)
  assert.equal(engine.addTask({ workspaceId: 'w1', title: 'T', goal: 'G', priority: 3 }).task.priority, 3)
  assert.equal(engine.addTask({ workspaceId: 'w1', title: 'T', goal: 'G', priority: '3' }).task.priority, 3)
  assert.equal(engine.addTask({ workspaceId: 'w1', title: 'T', goal: 'G', priority: 0 }).task.priority, 2)

  const long = engine.addTask({
    workspaceId: 'w1',
    title: 'a'.repeat(250),
    goal: 'g'.repeat(9000),
    acceptance: 'c'.repeat(5000),
  })
  assert.equal(long.task.title.length, 200)
  assert.ok(long.task.title.endsWith('…'))
  assert.equal(long.task.goal.length, 8000)
  assert.equal(long.task.acceptance.length, 4000)
})

test('engine: retry / stop / remove enforce their status constraints', async () => {
  const { engine, store, sessions } = await setup()
  const done = seed(store, {
    status: 'done',
    startedAt: 1,
    finishedAt: 2,
    report: report(),
    review: { verdict: 'done', note: 'ok', at: 3 },
    question: { text: 'old', at: 4 },
    reviewRounds: 2,
  })
  const retried = engine.retry(done.id)
  assert.ok(retried.task)
  assert.equal(retried.task.status, 'queued')
  assert.equal(retried.task.attempts, 0)
  assert.equal(retried.task.report, null)
  assert.equal(retried.task.review, null)
  assert.equal(retried.task.question, null)
  assert.equal(store.get(done.id).reviewRounds, 0)
  assert.equal(retried.task.startedAt, null)
  assert.equal(retried.task.finishedAt, null)
  assert.equal(store.get(done.id).log.at(-1).kind, 'retry')
  assert.equal(store.get(done.id).progress.at(-1).text, '已重新排队')

  for (const status of ['running', 'reviewing']) {
    const task = seed(store, { status })
    assert.equal(engine.retry(task.id).error, 'busy')
    assert.equal(store.get(task.id).status, status)
  }
  assert.equal(engine.retry('missing').error, 'unknown_task')
  assert.equal(engine.stopTask('missing').error, 'unknown_task')
  assert.equal(engine.removeTask('missing').error, 'unknown_task')

  const running = seed(store, { status: 'running', startedAt: Date.now() - 1000 })
  const stopped = engine.stopTask(running.id)
  assert.equal(stopped.task.status, 'cancelled')
  assert.equal(stopped.task.finishedAt === null, false)
  assert.equal(stopped.task.question, null)
  assert.equal(store.get(running.id).log.at(-1).kind, 'stop')
  assert.equal(store.get(running.id).progress.at(-1).text, '已停止')
  assert.ok(sessions.calls.some(call => call.name === 'cancel' && call.sessionId === running.workerSessionId))

  const cancelCount = sessions.calls.filter(call => call.name === 'cancel').length
  const finished = seed(store, { status: 'done' })
  assert.equal(engine.stopTask(finished.id).task.status, 'done')
  assert.equal(engine.stopTask('missing')?.error, 'unknown_task')
  assert.equal(sessions.calls.filter(call => call.name === 'cancel').length, cancelCount)

  const reviewing = seed(store, { status: 'reviewing' })
  engine.reviewQueue = [reviewing.id, 'other']
  engine.stopTask(reviewing.id)
  assert.equal(store.get(reviewing.id).status, 'cancelled')
  assert.deepEqual(engine.reviewQueue, ['other'])

  const removable = seed(store, { status: 'running' })
  engine.reviewQueue = [removable.id]
  const removed = engine.removeTask(removable.id)
  assert.deepEqual(removed, { ok: true })
  assert.equal(store.get(removable.id), undefined)
  assert.deepEqual(engine.reviewQueue, [])
  assert.ok(sessions.calls.some(call => call.name === 'cancel' && call.sessionId === removable.workerSessionId))
})

test('engine: applyReview maps done / fail / needs_you onto the task status', async () => {
  const { engine, store } = await setup()

  const done = seed(store, { status: 'reviewing', startedAt: Date.now() - 1000, report: report() })
  assert.deepEqual(engine.applyReview({ task_id: done.id, verdict: 'done', note: '验收通过' }), {
    ok: true,
    task_id: done.id,
    verdict: 'done',
  })
  const doneAfter = store.get(done.id)
  assert.equal(doneAfter.status, 'done')
  assert.equal(doneAfter.review.verdict, 'done')
  assert.equal(doneAfter.review.note, '验收通过')
  assert.equal(typeof doneAfter.finishedAt, 'number')
  assert.equal(doneAfter.progress.at(-1).text, '主管验收通过，任务完成')
  assert.ok(store.data.events.some(event => event.type === 'task.reviewed' && event.data.id === done.id && event.data.verdict === 'done'))

  const doneNoNote = seed(store, { status: 'reviewing', report: report() })
  engine.applyReview({ task_id: doneNoNote.id, verdict: 'done' })
  assert.equal(store.get(doneNoNote.id).review.note, '验收通过')

  const failed = seed(store, { status: 'reviewing', report: report('failed') })
  engine.applyReview({ task_id: failed.id, verdict: 'fail' })
  const failedAfter = store.get(failed.id)
  assert.equal(failedAfter.status, 'failed')
  assert.equal(failedAfter.review.verdict, 'fail')
  assert.equal(failedAfter.review.note, '主管判定无法继续')
  assert.equal(failedAfter.progress.at(-1).text, '主管判定失败')

  const needs = seed(store, { status: 'reviewing', report: report('needs_decision', { question: 'Report question' }) })
  engine.applyReview({ task_id: needs.id, verdict: 'needs_you', question: 'Which option?' })
  const needsAfter = store.get(needs.id)
  assert.equal(needsAfter.status, 'needs_you')
  assert.equal(needsAfter.question.text, 'Which option?')
  assert.equal(needsAfter.review.verdict, 'needs_you')
  assert.equal(needsAfter.finishedAt, null)

  const fromReport = seed(store, { status: 'reviewing', report: report('needs_decision', { question: 'Report question' }) })
  engine.applyReview({ task_id: fromReport.id, verdict: 'needs_you' })
  assert.equal(store.get(fromReport.id).question.text, 'Report question')

  const fallback = seed(store, { status: 'reviewing', report: report('blocked') })
  engine.applyReview({ task_id: fallback.id, verdict: 'needs_you' })
  assert.match(store.get(fallback.id).question.text, /这一步需要你决定/)

  const invalidVerdict = seed(store, { status: 'reviewing', report: report() })
  const invalidResult = engine.applyReview({ task_id: invalidVerdict.id, verdict: 'bogus' })
  assert.equal(invalidResult.verdict, 'needs_you')
  assert.equal(store.get(invalidVerdict.id).status, 'needs_you')

  assert.equal(engine.applyReview({ task_id: 'missing', verdict: 'done' }).ok, false)
  const queued = seed(store, {})
  assert.equal(engine.applyReview({ task_id: queued.id, verdict: 'done' }).ok, false)
  assert.equal(store.get(queued.id).status, 'queued')
})

test('engine: continue queues under pause and more than two rounds forces needs_you', async () => {
  const { engine, store, sessions } = await setup()
  const task = seed(store, { status: 'reviewing', startedAt: Date.now() - 1000, report: report() })
  const result = engine.applyReview({
    task_id: task.id,
    verdict: 'continue',
    note: 'one more step',
    continue_instruction: 'Fix the failing test',
  })
  assert.equal(result.verdict, 'continue')
  const after = store.get(task.id)
  assert.equal(after.status, 'queued')
  assert.equal(after.reviewRounds, 1)
  assert.equal(after.report, null)
  assert.equal(after.question, null)
  assert.equal(after.finishedAt, null)
  assert.equal(after.review.verdict, 'continue')
  assert.equal(after.review.note, 'one more step')
  assert.equal(after.progress.at(-1).text, '主管要求继续一步')
  assert.equal(sessions.calls.some(call => call.name === 'prompt'), false)
  store.setSettings({ paused: false })
  await engine.pump()
  assert.ok(await waitFor(() => sessions.calls.some(call => call.name === 'prompt')))
  const prompt = sessions.calls.find(call => call.name === 'prompt')
  assert.match(prompt.text, /Fix the failing test/)
  assert.match(prompt.text, /continue_instruction/)
  assert.equal(prompt.sessionId, store.get(task.id).workerSessionId)

  const capped = seed(store, { status: 'reviewing', reviewRounds: 2, report: report() })
  const cappedResult = engine.applyReview({ task_id: capped.id, verdict: 'continue', note: 'again' })
  assert.equal(cappedResult.verdict, 'needs_you')
  assert.equal(store.get(capped.id).status, 'needs_you')
  assert.equal(store.get(capped.id).reviewRounds, 2)
  assert.equal(store.get(capped.id).review.verdict, 'needs_you')
})

test('engine: settle completes ready reports and asks the user for everything else', async () => {
  const { engine, store } = await setup()
  const ready = seed(store, { status: 'reviewing', report: report('ready') })
  engine.settle(ready.id, 'fallback reason')
  const readyAfter = store.get(ready.id)
  assert.equal(readyAfter.status, 'done')
  assert.equal(readyAfter.review.verdict, 'done')
  assert.equal(readyAfter.review.note, 'fallback reason')
  assert.equal(typeof readyAfter.finishedAt, 'number')
  assert.equal(readyAfter.progress.at(-1).text, '结算完成（未经主管）')
  assert.ok(store.data.events.some(event => event.type === 'task.settled' && event.data.id === ready.id))

  const blocked = seed(store, { status: 'reviewing', report: report('blocked', { question: 'Need credentials' }) })
  engine.settle(blocked.id, 'no supervisor')
  assert.equal(store.get(blocked.id).status, 'needs_you')
  assert.equal(store.get(blocked.id).question.text, 'Need credentials')
  assert.equal(store.get(blocked.id).review.verdict, 'needs_you')
  assert.equal(store.get(blocked.id).log.at(-1).text, 'fallback: blocked (no supervisor)')

  const failed = seed(store, { status: 'reviewing', report: report('failed') })
  engine.settle(failed.id, 'no supervisor')
  assert.equal(store.get(failed.id).status, 'needs_you')
  assert.equal(store.get(failed.id).question.text, 'worker summary')

  const noReport = seed(store, { status: 'reviewing' })
  engine.settle(noReport.id, 'no report')
  assert.equal(store.get(noReport.id).status, 'needs_you')
  assert.match(store.get(noReport.id).question.text, /没有正常结束/)

  engine.settle('missing', 'nothing')
})

test('engine: recordReport clamps input, rejects stale states and defaults bad enums to ready', async () => {
  const { engine, store } = await setup()
  const task = seed(store, { status: 'running' })
  const accepted = engine.recordReport(task.id, {
    state: 'ready',
    summary: '  did the work  ',
    deliverables: ['a.txt', 42, 'b.txt'],
    question: '   ',
  })
  assert.deepEqual(accepted, { ok: true, recorded: true, next: 'report recorded; end the turn now' })
  const after = store.get(task.id)
  assert.equal(after.report.state, 'ready')
  assert.equal(after.report.summary, 'did the work')
  assert.deepEqual(after.report.deliverables, ['a.txt', 'b.txt'])
  assert.equal('question' in after.report, false)
  assert.equal(after.log.at(-1).kind, 'report')
  assert.equal(after.progress.at(-1).text, '执行会话报告完成')

  const needs = seed(store, { status: 'running' })
  engine.recordReport(needs.id, { state: 'needs_decision', summary: 'pick', question: '  Which one?  ' })
  assert.equal(store.get(needs.id).report.state, 'needs_decision')
  assert.equal(store.get(needs.id).report.question, 'Which one?')

  const badState = seed(store, { status: 'running' })
  engine.recordReport(badState.id, { state: 'unknown', summary: 'ok' })
  assert.equal(store.get(badState.id).report.state, 'ready')

  const empty = seed(store, { status: 'running' })
  assert.deepEqual(engine.recordReport(empty.id, { state: 'ready', summary: '   ' }), {
    ok: false,
    error: 'summary must not be empty',
  })
  assert.equal(store.get(empty.id).report, null)

  const stale = seed(store, { status: 'done' })
  const staleResult = engine.recordReport(stale.id, { state: 'ready', summary: 'late' })
  assert.equal(staleResult.ok, false)
  assert.match(staleResult.error, /no longer running/)
  assert.equal(store.get(stale.id).report, null)

  const reviewing = seed(store, { status: 'reviewing' })
  assert.equal(engine.recordReport(reviewing.id, { state: 'ready', summary: 'late report' }).ok, false)
  assert.equal(store.get(reviewing.id).report, null)

  assert.equal(engine.recordReport('missing', { state: 'ready', summary: 'x' }).ok, false)

  const long = seed(store, { status: 'running' })
  engine.recordReport(long.id, {
    state: 'ready',
    summary: 's'.repeat(1300),
    deliverables: Array.from({ length: 25 }, () => 'd'.repeat(600)),
  })
  assert.equal(store.get(long.id).report.summary.length, 1200)
  assert.ok(store.get(long.id).report.summary.endsWith('…'))
  assert.equal(store.get(long.id).report.deliverables.length, 20)
  assert.equal(store.get(long.id).report.deliverables[0].length, 500)
  assert.ok(store.get(long.id).report.deliverables[0].endsWith('…'))
})

test('engine: recover queues interrupted runs and re-enqueues interrupted reviews', async () => {
  const { engine, store } = await setup()
  const running = seed(store, { status: 'running', startedAt: 123 })
  const reviewing = seed(store, { status: 'reviewing', report: report() })
  const done = seed(store, { status: 'done' })
  engine.reviewRunning = true
  await engine.recover()

  assert.equal(store.get(running.id).status, 'queued')
  assert.equal(store.get(running.id).startedAt, null)
  assert.ok(store.get(running.id).log.some(entry => entry.kind === 'recover'))
  assert.match(store.get(running.id).progress.at(-1).text, /重启恢复/)
  assert.equal(store.get(reviewing.id).status, 'reviewing')
  assert.ok(engine.reviewQueue.includes(reviewing.id))
  assert.ok(store.get(reviewing.id).log.some(entry => entry.kind === 'recover'))
  assert.equal(store.get(done.id).status, 'done')
  assert.ok(store.data.events.some(event => event.type === 'engine.recovered'))
})

test('engine: tick times out long runs, cancels their session and prunes the review queue', async () => {
  const { engine, store, sessions } = await setup({ config: { maxTaskMinutes: 0.001 } })
  const stale = seed(store, { status: 'running', startedAt: Date.now() - 10_000 })
  const fresh = seed(store, { status: 'running', startedAt: Date.now() })
  engine.reviewQueue = ['missing']
  await engine.tick()

  assert.equal(store.get(stale.id).status, 'needs_you')
  assert.match(store.get(stale.id).question.text, /0\.001 分钟/)
  assert.equal(store.get(stale.id).log.at(-1).kind, 'timeout')
  assert.equal(store.get(stale.id).progress.at(-1).text, '执行超时，需要你决定')
  assert.ok(sessions.calls.some(call => call.name === 'cancel' && call.sessionId === stale.workerSessionId))
  assert.equal(store.get(fresh.id).status, 'running')
  assert.equal(sessions.calls.some(call => call.name === 'cancel' && call.sessionId === fresh.workerSessionId), false)
  assert.deepEqual(engine.reviewQueue, [])
})

test('engine: start installs the scheduler and listeners', async () => {
  const { engine, sessions, ctx, store } = await setup()
  await engine.start()
  assert.ok(engine.timer)
  assert.equal(engine.stopped, false)
  assert.ok(sessions.calls.some(call => call.name === 'start'))
  assert.equal(ctx.listenerCount('agent/status'), 1)
  assert.equal(ctx.listenerCount('agent/error'), 1)
  assert.equal(store.settings.paused, true)
  engine.stop()
})

test('engine: lifecycle stop() clears the scheduler and sessions', async () => {
  const { engine, sessions } = await setup()
  await engine.start()
  assert.ok(engine.timer)
  engine.stop()
  assert.equal(engine.stopped, true)
  assert.equal(engine.timer, null)
  assert.equal(sessions.calls.some(call => call.name === 'stop'), true)
})

test('engine: a worker reply without superagent_report asks the user instead of auto-completing', async () => {
  const agents = new Map()
  const { engine, store, sessions } = await setup({ agents })
  const task = seed(store, { status: 'running', startedAt: Date.now() - 1000 })
  agents.set(task.workerSessionId, { id: task.workerSessionId, status: 'idle' })
  sessions.turnInfo = () => ({ turnEndAt: task.startedAt + 10, lastAssistantAt: task.startedAt + 5 })
  sessions.lastTurnEnd = () => 'completed'
  sessions.lastAssistantText = () => '工作完成，测试通过'
  store.setSettings({ autoReview: false })

  await engine.onWorkerIdle(task.id)

  const after = store.get(task.id)
  assert.equal(after.report.state, 'needs_decision')
  assert.equal(after.report.synthetic, true)
  assert.equal(after.report.summary, '工作完成，测试通过')
  assert.equal(after.status, 'needs_you')
  assert.equal(after.review.verdict, 'needs_you')
  assert.equal(after.finishedAt === null, false)
  assert.equal(engine.finalizing.size, 0)
})

test('engine: board/taskDetail expose the contract projection without internal logs', async () => {
  const agents = new Map()
  const { engine, store } = await setup({
    agents,
    services: {},
    workspaces: [{ id: 'w1', title: 'WS', path: 'D:\\ws', sessions: ['a', 'b'] }],
  })
  engine.version = '9.9.9'
  engine.stateDir = 'C:\\state'
  const running = seed(store, { status: 'running', startedAt: 100 })
  const needs = seed(store, { status: 'needs_you', question: { text: 'Q', at: 1 } })
  seed(store, { status: 'failed' })
  seed(store, { status: 'done', startedAt: 100, finishedAt: 250 })
  const board = engine.board()
  assert.equal(board.version, '9.9.9')
  assert.equal(board.stateDir, 'C:\\state')
  assert.equal(board.settings.maxWorkers, 2)
  assert.equal(board.workspaces.length, 1)
  assert.equal(board.workspaces[0].sessions, 2)
  assert.equal(board.live.running, 1)
  assert.equal(board.live.needsYou, 1)
  assert.equal(board.live.failed, 1)
  assert.equal(board.live.done, 1)
  assert.equal(board.live.capacity, 2)
  assert.equal(typeof board.live.attention, 'number')
  assert.match(board.supervisor.sessionId, /^sa-supervisor-[a-z0-9]{5}$/)
  assert.equal(board.supervisor.running, false)
  assert.equal('log' in board.tasks.find(task => task.id === running.id), false)
  assert.equal(board.tasks.find(task => task.id === needs.id).question.text, 'Q')
  assert.equal(board.tasks.find(task => task.status === 'done').durationMs, 150)

  const detail = engine.taskDetail(running.id)
  assert.equal(detail.task.id, running.id)
  assert.ok(Array.isArray(detail.log))
  assert.equal(detail.workerSessionId, running.workerSessionId)
  assert.equal(engine.taskDetail('missing'), undefined)
})

const CATALOG = {
  default: { provider: 'p', model: 'fast' },
  groups: [
    { id: 'p', name: 'Provider P', models: [{ id: 'fast', name: 'Fast' }, { id: 'smart', name: 'Smart' }] },
    { id: 'q', name: 'Provider Q', models: [{ id: 'big', name: 'Big' }] },
  ],
  failures: [],
}

test('engine: model settings are validated against the Host catalog and retarget the supervisor', async () => {
  const { engine, store, sessions } = await setup({
    services: { sessionController: { modelCatalog: async () => CATALOG } },
  })
  const saved = await engine.saveSettings({
    models: {
      supervisor: { provider: 'p', model: 'fast' },
      workers: [{ provider: 'p', model: 'smart' }, { provider: 'q', model: 'big' }],
    },
  })
  assert.deepEqual(saved.settings.models, {
    supervisor: { provider: 'p', model: 'fast' },
    workers: [{ provider: 'p', model: 'smart' }, { provider: 'q', model: 'big' }],
  })
  assert.ok(sessions.calls.some(call => call.name === 'applyModel' && call.sessionId === engine.supervisorId))
  assert.ok(store.data.events.some(event => event.type === 'settings.saved'))

  const invalid = await engine.saveSettings({ models: { supervisor: { provider: 'p', model: 'nope' } } })
  assert.equal(invalid.error, 'invalid_model')
  assert.match(invalid.message, /p\/nope/)
  assert.deepEqual(store.settings.models.supervisor, { provider: 'p', model: 'fast' })

  // A partial patch keeps the fields it does not mention.
  const partial = await engine.saveSettings({ models: { supervisor: null } })
  assert.equal(partial.settings.models.supervisor, null)
  assert.equal(partial.settings.models.workers.length, 2)

  const catalog = await engine.modelCatalog()
  assert.equal(catalog.available, true)
  assert.equal(catalog.groups.length, 2)
  assert.deepEqual(catalog.models, partial.settings.models)
})

test('engine: model catalog reports unavailable when the Host has no model service', async () => {
  const { engine } = await setup()
  const catalog = await engine.modelCatalog()
  assert.equal(catalog.available, false)
  assert.deepEqual(catalog.groups, [])
  assert.match(catalog.reason, /模型目录/)
  const saved = await engine.saveSettings({ models: { workers: [{ provider: 'x', model: 'y' }] } })
  assert.deepEqual(saved.settings.models.workers, [{ provider: 'x', model: 'y' }])
})

test('engine: workers run on the first configured model, and a task override must stay in range', async () => {
  const { engine, store, sessions } = await setup()
  store.setSettings({
    models: { workers: [{ provider: 'p', model: 'fast' }, { provider: 'q', model: 'big' }] },
  })

  const first = seed(store, { status: 'queued' })
  await engine.dispatch(first.id)
  assert.deepEqual(store.get(first.id).workerModel, { provider: 'p', model: 'fast' })
  const firstEnsure = sessions.calls.find(call => call.name === 'ensure' && call.sessionId === store.get(first.id).workerSessionId)
  assert.deepEqual(firstEnsure.options.model, { provider: 'p', model: 'fast' })
  assert.match(store.get(first.id).log.at(-1).text, /p\/fast/)

  const overridden = seed(store, { status: 'queued', workerModel: { provider: 'q', model: 'big' } })
  await engine.dispatch(overridden.id)
  assert.deepEqual(store.get(overridden.id).workerModel, { provider: 'q', model: 'big' })

  const stale = seed(store, { status: 'queued', workerModel: { provider: 'z', model: 'gone' } })
  await engine.dispatch(stale.id)
  assert.deepEqual(store.get(stale.id).workerModel, { provider: 'p', model: 'fast' })
})

test('engine: the supervisor may switch the worker model only within the configured range', async () => {
  const { engine, store, sessions } = await setup()
  store.setSettings({
    models: { workers: [{ provider: 'p', model: 'fast' }, { provider: 'q', model: 'big' }] },
  })
  const task = seed(store, {
    status: 'reviewing',
    startedAt: Date.now() - 1000,
    workerModel: { provider: 'p', model: 'fast' },
    report: report(),
  })

  const rejected = engine.applyReview({
    task_id: task.id,
    verdict: 'continue',
    continue_instruction: 'try again',
    worker_model: 'q/huge',
  })
  assert.equal(rejected.ok, false)
  assert.match(rejected.error, /工作代理模型范围/)
  assert.equal(store.get(task.id).status, 'reviewing')

  const accepted = engine.applyReview({
    task_id: task.id,
    verdict: 'continue',
    continue_instruction: 'try again',
    worker_model: 'q/big',
  })
  assert.equal(accepted.verdict, 'continue')
  assert.deepEqual(store.get(task.id).workerModel, { provider: 'q', model: 'big' })
  assert.ok(store.get(task.id).log.some(entry => entry.kind === 'review' && entry.text.includes('q/big')))
  assert.ok(store.get(task.id).progress.some(entry => entry.text.includes('q/big')))
  assert.equal(store.get(task.id).status, 'queued')
  store.setSettings({ paused: false })
  await engine.pump()
  assert.ok(await waitFor(() => sessions.calls.some(call => (
    call.name === 'ensure' && call.options.model && call.options.model.provider === 'q'
  ))))
})
