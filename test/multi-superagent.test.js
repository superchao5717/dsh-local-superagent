import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Store } from '../lib/store.js'
import { Engine } from '../lib/engine.js'
import { Api } from '../lib/api.js'
import { supervisorTools, workerTools } from '../lib/tools.js'
import { defaultWorkerModel, effectiveWorkerModels } from '../lib/models.js'
import { makeTempDir, cleanupDir, fakeCtx, fakeSessions, waitFor } from './support.js'

async function setup(t) {
  const dir = await makeTempDir('multi-')
  const store = await new Store({ file: join(dir, 'board.json') }).load()
  const sessions = fakeSessions({ waitTurnEnd: async () => 'completed' })
  const ctx = fakeCtx({ workspaces: [{ id: 'w1', title: 'One', path: 'D:\\one' }, { id: 'w2', title: 'Two', path: 'D:\\two' }] })
  const engine = new Engine({ ctx, store, sessions, log: () => {} })
  engine.safeReviews = () => {}
  engine.safePump = () => {}
  const a = engine.addSuperagent({ workspaceId: 'w1', title: 'A' }).superagent
  const b = engine.addSuperagent({ workspaceId: 'w1', title: 'B' }).superagent
  const c = engine.addSuperagent({ workspaceId: 'w2', title: 'C' }).superagent
  store.setSettings({ paused: true })
  t.after(async () => { engine.stop(); await store.close(); await cleanupDir(dir) })
  const add = (owner = a, patch = {}) => {
    const result = engine.addTask({ superagentId: owner.id, workspaceId: owner.workspaceId, title: 'T', goal: 'G' })
    const task = store.get(result.task.id)
    store.update(task.id, patch)
    return task
  }
  const eligible = (owner = a) => {
    store.setSettings({ paused: false, autonomy: { enabled: true, waitMinutes: 1 } })
    return add(owner, { status: 'needs_you', question: { text: '选择蓝色还是绿色？', at: Date.now() - 120000, requiresHuman: false }, report: { state: 'needs_decision', summary: '配色选择', at: Date.now() } })
  }
  return { store, sessions, engine, a, b, c, add, eligible }
}
const payload = text => JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))

test('multi: same/different workspace supervisors share settings but sessions and context stay isolated', async t => {
  const { engine, store, sessions, a, b, c, add } = await setup(t)
  assert.equal(engine.addTask({ workspaceId: 'w1', title: 'T', goal: 'G' }).error, 'ambiguous_superagent')
  assert.equal(engine.addTask({ superagentId: c.id, workspaceId: 'w1', title: 'T', goal: 'G' }).error, 'workspace_mismatch')
  await engine.saveSettings({ paused: false, maxWorkers: 2, models: { supervisor: { provider: 'p', model: 'shared' } } })
  const ta = add(a), tb = add(b), tc = add(c)
  add(a); add(b); add(b)
  await engine.pump()
  assert.equal(engine.board().superagents.find(x => x.id === a.id).live.running, 2)
  assert.equal(engine.board().superagents.find(x => x.id === b.id).live.running, 2)
  assert.equal(tc.status, 'running')
  assert.equal(ta.workerModel.model, 'shared'); assert.equal(tb.workerModel.model, 'shared')
  assert.equal(tc.workerModel.model, 'shared')
  assert.equal(store.settingsFor(c.id).paused, false)
  assert.equal(engine.board().live.capacity, 6)
  assert.equal(engine.board().settingsScope, 'global')
  await engine.ensureSupervisor(a.id); await engine.ensureSupervisor(b.id); await engine.ensureSupervisor(c.id)
  const ensures = sessions.calls.filter(x => x.name === 'ensure' && x.options.role === 'supervisor')
  assert.equal(new Set(ensures.map(x => x.sessionId)).size, 3)
  assert.deepEqual(ensures.map(x => x.options.workspaceId), ['w1', 'w1', 'w2'])
  assert.match(ensures[0].options.title, /A/)
  assert.ok(engine.supervisorBoard(a.id).tasks.every(x => store.get(x.task_id).superagentId === a.id))
  const view = engine.board(); view.superagents[0].settings.autonomy.enabled = true; view.tasks[0].progress.push({ text: 'tamper' })
  assert.equal(store.settingsFor(a.id).autonomy.enabled, false)
  assert.ok(!store.list().some(x => x.progress.some(p => p.text === 'tamper')))
})

test('multi: legacy migration retains all tasks/config and is idempotent across reloads', async t => {
  const dir = await makeTempDir('migration-'), file = join(dir, 'board.json')
  const legacy = { settings: { paused: true, maxWorkers: 3, autoReview: false, models: { supervisor: { provider: 'p', model: 'm' }, workers: [] } }, tasks: ['w1', 'w1', 'w2'].map((workspaceId, i) => ({ id: `t${i}`, workspaceId, title: 'T', goal: 'G', status: i ? 'done' : 'needs_you', question: { text: 'Q', at: 1 } })) }
  await writeFile(file, JSON.stringify(legacy))
  const s = await new Store({ file }).load()
  assert.equal(s.superagents().length, 2); assert.equal(s.list().length, 3)
  assert.equal(s.get('t0').superagentId, s.get('t1').superagentId)
  assert.notEqual(s.get('t0').superagentId, s.get('t2').superagentId)
  for (const a of s.superagents()) { const settings = s.settingsFor(a.id); assert.equal(settings.maxWorkers, 3); assert.equal(settings.models.supervisor.model, 'm'); assert.equal(settings.autoReview, false) }
  const snapshot = structuredClone(s.data)
  await s.close()
  const again = await new Store({ file }).load()
  assert.deepEqual(again.data, snapshot)
  await again.close(); await cleanupDir(dir)
})

test('multi: worker empty range inherits supervisor, both empty means DSH default', () => {
  assert.deepEqual(defaultWorkerModel({ supervisor: { provider: 'p', model: 'm', reasoningEffort: 'high' }, workers: [] }), { provider: 'p', model: 'm', reasoningEffort: 'high' })
  assert.equal(defaultWorkerModel({}), null)
  assert.deepEqual(effectiveWorkerModels({ supervisor: { provider: 'p', model: 'm' } }), [{ provider: 'p', model: 'm' }])
  assert.equal(defaultWorkerModel({ supervisor: { provider: 'p', model: 'm' }, workers: [{ provider: 'x', model: 'y' }] }).model, 'y')
})

test('multi: API supervisor CRUD, global settings/catalog, tombstone preserves finished attribution', async t => {
  const { engine, store, a, add } = await setup(t)
  const api = new Api({ engine, log: () => {} })
  const created = await api.handle({ action: 'superagent.add', workspaceId: 'w2', title: 'D' })
  assert.equal(created.ok, true)
  const renamed = await api.handle({ action: 'superagent.update', id: a.id, title: 'A renamed' })
  assert.equal(renamed.data.superagent.title, 'A renamed')
  assert.equal((await api.handle({ action: 'settings.save', maxWorkers: 1 })).ok, true)
  await api.handle({ action: 'settings.save', autonomy: { enabled: true, waitMinutes: 9999 } })
  assert.deepEqual(store.settingsFor(a.id).autonomy, { enabled: true, waitMinutes: 1440 })
  await api.handle({ action: 'settings.save', autonomy: { waitMinutes: 0 } })
  assert.equal(store.settingsFor(a.id).autonomy.waitMinutes, 1)
  assert.equal((await api.handle({ action: 'models.catalog', superagentId: a.id })).ok, true)
  const task = add(a)
  assert.equal(engine.removeSuperagent(a.id).error, 'busy')
  store.update(task.id, { status: 'done' })
  assert.equal(engine.removeSuperagent(a.id).ok, true)
  assert.equal(store.get(task.id).superagentId, a.id)
  assert.equal(engine.taskView(task).superagentTitle, 'A renamed')
  assert.equal(engine.board().superagents.some(x => x.id === a.id), false)
  assert.equal(engine.retry(task.id).error, 'unknown_superagent')
})

test('autonomy: timeout asks supervisor exactly once and continues without fabricating user answer', async t => {
  const { engine, store, sessions, a, eligible } = await setup(t)
  const task = eligible()
  engine.considerAutonomy(); engine.considerAutonomy()
  assert.equal(task.autonomy.attempted, true); assert.equal(engine.reviewQueue.length, 1)
  const oldHolder = globalThis.__dshLocalSuperagent
  globalThis.__dshLocalSuperagent = { engine }
  t.after(() => { globalThis.__dshLocalSuperagent = oldHolder })
  sessions.prompt = async (sid, requestId, text) => {
    sessions.calls.push({ name: 'prompt', sessionId: sid, text })
    if (!text.includes('review_queue')) return
    const item = payload(text).review_queue[0]
    assert.equal(item.autonomy_timeout, true); assert.ok(item.unanswered_question)
    const tools = supervisorTools(a.id, sid)
    const result = await tools[1].execute({ task_id: task.id, review_token: item.review_token, verdict: 'continue', note: '选蓝色可逆方案', continue_instruction: '使用蓝色，保持可逆' })
    assert.equal(result.ok, true)
  }
  await engine.processReviews(); await engine.pump()
  assert.equal(task.status, 'running')
  const worker = sessions.calls.find(x => x.name === 'prompt' && x.sessionId === task.workerSessionId)
  assert.ok(worker); assert.doesNotMatch(worker.text, /user_answer/); assert.match(worker.text, /用户未回答/)
  store.update(task.id, { status: 'needs_you', question: { text: '第二个方案选择？', at: 1, requiresHuman: false } })
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
})

test('autonomy: denied or unanswered review is one-shot and original question timestamp survives reload', async t => {
  const { engine, store, sessions, eligible } = await setup(t)
  const task = eligible(), at = task.question.at
  sessions.waitTurnEnd = async () => 'timeout'
  engine.considerAutonomy(); await engine.processReviews()
  assert.equal(task.status, 'needs_you'); assert.equal(task.question.at, at)
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
  await store.flush()
  const reload = await new Store({ file: store.file }).load()
  assert.equal(reload.get(task.id).autonomy.attempted, true)
  assert.equal(reload.get(task.id).question.at, at)
  await reload.close()
})

test('autonomy: default off, requiresHuman, blocked/failed and login/payment/security never enter auto review', async t => {
  const { engine, store, a, add } = await setup(t)
  const task = add(a, { status: 'needs_you', question: { text: '普通方案？', at: 1, requiresHuman: false } })
  store.setSettings({ paused: false })
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
  store.setSettings({ autonomy: { enabled: true } })
  for (const question of ['请登录网站', 'permission denied', '付款？', '安全授权？', '输入密码', '人工批准']) {
    store.update(task.id, { question: { text: question, at: 1, requiresHuman: false } })
    engine.considerAutonomy(); assert.equal(task.status, 'needs_you'); assert.equal(task.autonomy.attempted, false)
  }
  for (const state of ['blocked', 'failed']) {
    store.update(task.id, { question: { text: '选一个方案？', at: 1, requiresHuman: false }, report: { state, summary: 'external condition' } })
    engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
  }
  store.update(task.id, { report: null, question: { text: '普通？', at: 1 } })
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
})

test('autonomy: capacity and pause apply both to decision eligibility and continuation dispatch', async t => {
  const { engine, store, a, add, eligible } = await setup(t)
  const task = eligible()
  store.setSettings({ maxWorkers: 1 })
  const busy = add(a, { status: 'running' })
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
  store.update(busy.id, { status: 'done' })
  store.setSettings({ paused: true })
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
  store.setSettings({ paused: false })
  engine.considerAutonomy(); assert.equal(task.status, 'reviewing')
  store.update(busy.id, { status: 'running' })
  engine.applyReview({ task_id: task.id, verdict: 'continue', continue_instruction: '选择蓝色' })
  await engine.pump(); assert.equal(task.status, 'queued')
  store.update(busy.id, { status: 'done' })
  await engine.pump(); assert.equal(task.status, 'running')
})

test('autonomy: human answer wins ABA against old tool verdict and fallback; stop/disable cannot revive task', async t => {
  const { engine, store, sessions, a, eligible } = await setup(t)
  const task = eligible()
  let release, oldItem
  sessions.waitTurnEnd = () => new Promise(resolve => { release = resolve })
  sessions.prompt = async (_sid, _rid, text) => { oldItem = payload(text).review_queue[0] }
  engine.considerAutonomy()
  const runningReview = engine.processReviews()
  assert.ok(await waitFor(() => !!release))
  assert.equal(engine.answer(task.id, '用绿色').task.status, 'queued')
  await engine.pump()
  store.update(task.id, { status: 'reviewing', report: { state: 'ready', summary: '绿色已完成' } })
  const result = engine.applyReview({ task_id: task.id, review_token: oldItem.review_token, verdict: 'continue', continue_instruction: '旧蓝色决策' }, { superagentId: a.id, sessionId: engine.sessionFor(a.id) })
  assert.equal(result.ok, false)
  release('timeout'); await runningReview
  assert.equal(task.status, 'reviewing'); assert.equal(task.report.summary, '绿色已完成')
  const stopped = eligible(); engine.considerAutonomy(); engine.stopTask(stopped.id)
  assert.equal(engine.answer(stopped.id, '复活').error, 'not_waiting')
  await engine.saveSettings({ autonomy: { enabled: false } })
  assert.equal(stopped.status, 'cancelled')
})

test('autonomy: disable then reenable invalidates in-flight decision and keeps original wait', async t => {
  const { engine, store, a, eligible } = await setup(t)
  const task = eligible(), at = task.question.at
  engine.considerAutonomy()
  await engine.saveSettings({ autonomy: { enabled: false } })
  assert.equal(task.status, 'needs_you'); assert.equal(task.question.at, at)
  await engine.saveSettings({ autonomy: { enabled: true } })
  assert.equal(engine.applyReview({ task_id: task.id, verdict: 'continue', continue_instruction: 'stale' }).ok, false)
  engine.considerAutonomy(); assert.equal(task.status, 'needs_you')
  assert.equal(store.get(task.id).autonomy.attempted, true)
})

test('tools: supervisor cannot read/judge another agent task; stale worker attempt is rejected', async t => {
  const { engine, store, a, b, add } = await setup(t)
  const ta = add(a, { status: 'reviewing' }), tb = add(b, { status: 'reviewing' })
  const old = globalThis.__dshLocalSuperagent; globalThis.__dshLocalSuperagent = { engine }
  t.after(() => { globalThis.__dshLocalSuperagent = old })
  engine.activeReviews.set(a.id, new Map([[ta.id, { epoch: ta.reviewEpoch, token: 'tokenA' }]]))
  const tools = supervisorTools(a.id, engine.sessionFor(a.id))
  assert.ok((await tools[0].execute({ superagentId: b.id })).tasks.every(x => x.task_id !== tb.id))
  assert.equal((await tools[1].execute({ task_id: tb.id, review_token: 'tokenA', verdict: 'done', superagentId: b.id })).ok, false)
  assert.equal((await supervisorTools()[1].execute({ task_id: ta.id, review_token: 'tokenA', verdict: 'done' })).ok, false)
  assert.equal((await tools[1].execute({ task_id: ta.id, review_token: 'bad', verdict: 'done' })).ok, false)
  assert.equal((await tools[1].execute({ task_id: ta.id, review_token: 'tokenA', verdict: 'done' })).ok, true)
  const worker = add(a, { status: 'running' })
  const reportTool = workerTools(worker.id, worker.workerSessionId)[0]
  store.update(worker.id, { workerSessionId: 'new-attempt' })
  assert.equal((await reportTool.execute({ state: 'ready', summary: 'old' })).ok, false)
  assert.equal(worker.report, null)
})

test('multi: a slow supervisor never blocks review of another supervisor', async t => {
  const { engine, sessions, a, b, add } = await setup(t)
  const ta = add(a, { status: 'reviewing', report: { state: 'ready', summary: 'A' } })
  const tb = add(b, { status: 'reviewing', report: { state: 'ready', summary: 'B' } })
  let release
  sessions.waitTurnEnd = sid => sid === engine.sessionFor(a.id) ? new Promise(resolve => { release = resolve }) : Promise.resolve('completed')
  sessions.prompt = async (sid, _rid, text) => {
    const item = payload(text).review_queue[0]
    if (sid === engine.sessionFor(b.id)) engine.applyReview({ task_id: tb.id, review_token: item.review_token, verdict: 'done' }, { superagentId: b.id, sessionId: sid })
  }
  engine.reviewQueue = [ta.id, tb.id]
  const processing = engine.processReviews()
  assert.ok(await waitFor(() => tb.status === 'done' && !!release))
  assert.equal(ta.status, 'reviewing'); release('timeout'); await processing
})

test('global: configuration applies to all current and future supervisors without snapshots', async t => {
  const { engine, store, a, b, c } = await setup(t)
  const configured = await engine.saveSettings({ maxWorkers: 3, autoReview: false, paused: true,
    autonomy: { enabled: true, waitMinutes: 7 }, models: { supervisor: { provider: 'p', model: 'shared' }, workers: [] } })
  assert.equal(configured.settings.maxWorkers, 3)
  for (const id of [a.id, b.id, c.id]) assert.deepEqual(store.settingsFor(id), store.settings)
  const future = engine.addSuperagent({ workspaceId: 'w2', title: 'Future' }).superagent
  assert.deepEqual(future.settings, store.settings)
  assert.equal('settings' in store.superagent(future.id), false)
  await engine.saveSettings({ maxWorkers: 1, autonomy: { waitMinutes: 12 } })
  assert.equal(store.settingsFor(future.id).maxWorkers, 1)
  assert.equal(store.settingsFor(a.id).autonomy.waitMinutes, 12)
  const board = engine.board()
  assert.equal(board.settingsScope, 'global'); assert.equal(board.live.capacity, 4)
  for (const agent of board.superagents) {
    assert.deepEqual(agent.settings, board.settings); assert.equal(agent.live.capacity, 1)
  }
  board.settings.models.supervisor.model = 'tamper'
  board.superagents[0].settings.autonomy.waitMinutes = 99
  assert.equal(store.settings.models.supervisor.model, 'shared')
  assert.equal(store.settings.autonomy.waitMinutes, 12)
})

test('global: scoped writes are rejected before any mutation and catalog ignores legacy ids', async t => {
  const { engine, store, a } = await setup(t)
  const api = new Api({ engine, log: () => {} }), before = structuredClone(store.data)
  for (const superagentId of [a.id, 'deleted-or-unknown', null, '']) {
    const result = await api.handle({ action: 'settings.save', superagentId, paused: false, maxWorkers: 4 })
    assert.equal(result.code, 'settings_scope_changed')
    assert.deepEqual(store.data, before)
  }
  assert.throws(() => store.setSettings({ maxWorkers: 4 }, a.id), /settings_scope_changed/)
  const catalog = await api.handle({ action: 'models.catalog', superagentId: 'unknown' })
  assert.equal(catalog.ok, true); assert.deepEqual(catalog.data.models, store.settings.models)
})

test('global: schema2 archives exact supervisor settings and retains all task history idempotently', async t => {
  const { store, a, b, add } = await setup(t)
  const task = add(a, { status: 'needs_you', createdAt: 101, updatedAt: 202, startedAt: 303, finishedAt: 404,
    question: { text: 'Pick B?', at: 505, requiresHuman: false },
    report: { state: 'needs_decision', summary: 'Report', question: 'Pick B?', deliverables: ['file'], at: 606 },
    review: { verdict: 'needs_you', note: 'Choice', at: 707 } })
  const original = structuredClone(task)
  const legacyA = { paused: false, maxWorkers: 4, models: { supervisor: { provider: 'a', model: 'a' }, workers: [] }, extraAudit: 'preserved' }
  const legacyB = { paused: true, maxWorkers: 1, models: { supervisor: { provider: 'b', model: 'b' }, workers: [] } }
  const raw = structuredClone(store.data)
  raw.schema = 2; delete raw.settingsMigration
  raw.settings = { paused: true, maxWorkers: 2, autoReview: false, models: { supervisor: { provider: 'global', model: 'template' }, workers: [] }, autonomy: { enabled: false, waitMinutes: 30 } }
  raw.superagents.find(x => x.id === a.id).settings = legacyA
  raw.superagents.find(x => x.id === b.id).settings = legacyB
  await writeFile(store.file, JSON.stringify(raw))
  const migrated = await new Store({ file: store.file }).load()
  assert.equal(migrated.data.schema, 3)
  assert.deepEqual(migrated.superagent(a.id).legacySettings, legacyA)
  assert.deepEqual(migrated.superagent(b.id).legacySettings, legacyB)
  assert.equal('settings' in migrated.superagent(a.id), false)
  assert.equal(migrated.settingsFor(a.id).models.supervisor.provider, 'global')
  assert.equal(migrated.settingsFor(b.id).maxWorkers, 2)
  assert.deepEqual(migrated.get(task.id), original)
  assert.equal(migrated.data.settingsMigration.fromSchema, 2)
  assert.equal(migrated.data.settingsMigration.settingsSource, 'board.settings')
  assert.match(migrated.data.settingsMigration.message, /global/)
  migrated.setSettings({ maxWorkers: 3 })
  assert.deepEqual(migrated.superagent(a.id).legacySettings, legacyA)
  const snapshot = structuredClone(migrated.data)
  await migrated.close()
  const again = await new Store({ file: store.file }).load()
  assert.deepEqual(again.data, snapshot)
  await again.close()
})

test('global: pause stops all new dispatch, preserves active workers and revokes every autonomy claim', async t => {
  const { engine, store, sessions, a, b, c, eligible, add } = await setup(t)
  const ta = eligible(a), tb = eligible(b), tc = eligible(c)
  const busy = add(a, { status: 'running' })
  const queued = add(b)
  engine.considerAutonomy()
  assert.ok([ta, tb, tc].every(task => task.status === 'reviewing'))
  const epochs = [ta, tb, tc].map(task => task.reviewEpoch)
  engine.stopTask(tc.id)
  sessions.calls.length = 0
  await engine.saveSettings({ paused: true })
  await engine.pump()
  assert.equal(busy.status, 'running'); assert.equal(queued.status, 'queued')
  assert.equal(sessions.calls.some(x => x.name === 'cancel' || x.name === 'prompt'), false)
  assert.ok([ta, tb].every(task => task.status === 'needs_you' && !task.autonomyReview))
  assert.equal(tc.status, 'cancelled')
  assert.ok([ta, tb, tc].every((task, i) => task.reviewEpoch > epochs[i]))
  await engine.saveSettings({ paused: false, autonomy: { enabled: false } })
  assert.ok([ta, tb].every(task => task.status === 'needs_you' && task.autonomy.attempted))
  assert.equal(tc.status, 'cancelled')
})

test('global: model save retargets every supervisor but not the current worker attempt', async t => {
  const { engine, store, sessions, a, b, c, add } = await setup(t)
  store.setSettings({ paused: false, maxWorkers: 1, models: { supervisor: { provider: 'p', model: 'old' }, workers: [] } })
  const active = add(a)
  await engine.pump()
  const oldSession = active.workerSessionId
  assert.equal(active.workerModel.model, 'old')
  sessions.calls.length = 0
  await engine.saveSettings({ models: { supervisor: { provider: 'p', model: 'new' }, workers: [] } })
  for (const id of [a.id, b.id, c.id]) assert.ok(sessions.calls.some(call => call.name === 'applyModel' && call.sessionId === engine.sessionFor(id) && call.model.model === 'new'))
  assert.equal(sessions.calls.some(call => call.name === 'applyModel' && call.sessionId === oldSession), false)
  assert.equal(sessions.calls.some(call => call.name === 'cancel'), false)
  assert.equal(active.workerModel.model, 'old')
  const nextB = add(b), nextC = add(c)
  await engine.pump()
  assert.equal(nextB.workerModel.model, 'new'); assert.equal(nextC.workerModel.model, 'new')
  store.update(active.id, { status: 'queued', pendingInput: { continueInstruction: 'Next step' } })
  await engine.pump()
  assert.equal(active.workerModel.model, 'new'); assert.notEqual(active.workerSessionId, oldSession)
  await engine.saveSettings({ models: { supervisor: { provider: 'p', model: 'new', reasoningEffort: 'high' } } })
  store.update(active.id, { status: 'queued' })
  await engine.pump()
  assert.equal(active.workerModel.reasoningEffort, 'high')
})
