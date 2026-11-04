import test from 'node:test'
import assert from 'node:assert/strict'
import { Api } from '../lib/api.js'

function makeEngine(overrides = {}) {
  const calls = []
  const defaults = {
    board: () => ({ version: '0.1.0', tasks: [] }),
    addTask: () => ({ task: { id: 'sa-new' } }),
    taskDetail: id => (id === 't1' ? { task: { id: 't1' }, log: [], workerSessionId: 'sa-task-t1' } : undefined),
    answer: () => ({ task: { id: 't1' } }),
    retry: () => ({ task: { id: 't1' } }),
    stopTask: () => ({ task: { id: 't1' } }),
    removeTask: () => ({ ok: true }),
    saveSettings: patch => ({ settings: { paused: false, maxWorkers: 2, autoReview: true, ...patch } }),
    addWorkspace: async (path, title) => ({ workspace: { id: 'w1', path, title } }),
  }
  const methods = { ...defaults, ...overrides }
  const engine = {}
  for (const name of Object.keys(methods)) {
    engine[name] = (...args) => {
      calls.push({ name, args })
      return methods[name](...args)
    }
  }
  return { engine, calls }
}

function makeApi(overrides, logs = []) {
  const { engine, calls } = makeEngine(overrides)
  return { api: new Api({ engine, log: message => logs.push(message) }), calls, logs }
}

test('api: board and the undocumented status alias return the engine board', async () => {
  const { api, calls } = makeApi()
  const board = await api.handle({ action: 'board' })
  assert.equal(board.ok, true)
  assert.deepEqual(board.data, { version: '0.1.0', tasks: [] })
  const status = await api.handle({ action: 'status' })
  assert.equal(status.ok, true)
  assert.equal(calls.length, 2)
  assert.deepEqual(calls.map(call => call.name), ['board', 'board'])
})

test('api: task actions map names and parameters onto engine methods', async () => {
  const { api, calls } = makeApi()

  const added = await api.handle({ action: 'task.add', workspaceId: 'w1', title: 'T', goal: 'G', acceptance: 'A', priority: 3 })
  assert.deepEqual(added, { ok: true, data: { task: { id: 'sa-new' } } })
  assert.equal(calls[0].name, 'addTask')
  assert.equal(calls[0].args.length, 1)
  assert.equal(calls[0].args[0].action, 'task.add')
  assert.equal(calls[0].args[0].workspaceId, 'w1')
  assert.equal(calls[0].args[0].priority, 3)

  const detail = await api.handle({ action: 'task.get', id: 't1' })
  assert.deepEqual(detail, {
    ok: true,
    data: { task: { id: 't1' }, log: [], workerSessionId: 'sa-task-t1' },
  })
  assert.equal(calls[1].name, 'taskDetail')
  assert.deepEqual(calls[1].args, ['t1'])

  const missing = await api.handle({ action: 'task.get', id: 'nope' })
  assert.deepEqual(missing, { ok: false, code: 'unknown_task', message: '任务不存在。' })

  assert.deepEqual(await api.handle({ action: 'task.answer', id: 't1', text: 'yes' }), { ok: true, data: { task: { id: 't1' } } })
  assert.deepEqual(calls.at(-1), { name: 'answer', args: ['t1', 'yes'] })

  assert.deepEqual(await api.handle({ action: 'task.retry', id: 't1' }), { ok: true, data: { task: { id: 't1' } } })
  assert.deepEqual(calls.at(-1), { name: 'retry', args: ['t1'] })

  assert.deepEqual(await api.handle({ action: 'task.stop', id: 't1' }), { ok: true, data: { task: { id: 't1' } } })
  assert.deepEqual(calls.at(-1), { name: 'stopTask', args: ['t1'] })

  assert.deepEqual(await api.handle({ action: 'task.remove', id: 't1' }), { ok: true, data: { ok: true } })
  assert.deepEqual(calls.at(-1), { name: 'removeTask', args: ['t1'] })
})

test('api: settings.save forwards only recognised fields and clamps nothing itself', async () => {
  const { api, calls } = makeApi()
  const result = await api.handle({ action: 'settings.save', paused: true, maxWorkers: '3', autoReview: false, extra: 'x' })
  assert.equal(result.ok, true)
  assert.deepEqual(calls[0], {
    name: 'saveSettings',
    args: [{ paused: true, maxWorkers: '3', autoReview: false }],
  })

  await api.handle({ action: 'settings.save', paused: 'yes', autoReview: 1 })
  assert.deepEqual(calls[1], { name: 'saveSettings', args: [{}] })
  await api.handle({ action: 'settings.save' })
  assert.deepEqual(calls[2], { name: 'saveSettings', args: [{}] })
})

test('api: workspace.add awaits the engine and forwards path and title', async () => {
  const { api, calls } = makeApi()
  const result = await api.handle({ action: 'workspace.add', path: 'D:\\workspace', title: 'workspace' })
  assert.deepEqual(result, { ok: true, data: { workspace: { id: 'w1', path: 'D:\\workspace', title: 'workspace' } } })
  assert.equal(calls[0].name, 'addWorkspace')
  assert.deepEqual(calls[0].args, ['D:\\workspace', 'workspace'])

  const rejected = makeApi({ addWorkspace: async () => { throw new Error('denied') } })
  const failed = await rejected.api.handle({ action: 'workspace.add', path: '/x' })
  assert.equal(failed.ok, false)
  assert.equal(failed.code, 'internal')
  assert.match(failed.message, /denied/)
  assert.ok(rejected.logs.some(message => message.includes('workspace.add')))
})

test('api: domain errors become {ok:false,code,message}; thrown and empty results stay internal', async () => {
  const notWaiting = makeApi({ answer: () => ({ error: 'not_waiting', message: '这个任务现在不在等待你回答。' }) })
  assert.deepEqual(await notWaiting.api.handle({ action: 'task.answer', id: 't1', text: 'x' }), {
    ok: false,
    code: 'not_waiting',
    message: '这个任务现在不在等待你回答。',
  })

  const noMessage = makeApi({ retry: () => ({ error: 'busy' }) })
  assert.deepEqual(await noMessage.api.handle({ action: 'task.retry', id: 't1' }), {
    ok: false,
    code: 'busy',
    message: '操作失败。',
  })

  const emptyResult = makeApi({ removeTask: () => null })
  assert.deepEqual(await emptyResult.api.handle({ action: 'task.remove', id: 't1' }), {
    ok: false,
    code: 'internal',
    message: 'Host 没有返回结果。',
  })

  const boomLogs = []
  const boom = makeApi({ board: () => { throw new Error('kaboom') } }, boomLogs)
  const failed = await boom.api.handle({ action: 'board' })
  assert.equal(failed.ok, false)
  assert.equal(failed.code, 'internal')
  assert.match(failed.message, /kaboom/)
  assert.ok(boomLogs.some(message => message.includes('operation board failed')))
})

test('api: missing or malformed action and unknown actions are rejected without calling the engine', async () => {
  const { api, calls } = makeApi()
  for (const args of [undefined, null, {}, 'board', 42, [], { action: 42 }]) {
    assert.deepEqual(await api.handle(args), { ok: false, code: 'invalid_request', message: '缺少 action。' })
  }
  const unknown = await api.handle({ action: 'task.nope' })
  assert.equal(unknown.ok, false)
  assert.equal(unknown.code, 'unknown_action')
  assert.match(unknown.message, /task\.nope/)
  assert.equal(calls.length, 0)
})

test('api: wrap keeps the exact contract narrowness', async () => {
  const { api } = makeApi()
  assert.deepEqual(api.ok(1), { ok: true, data: 1 })
  assert.deepEqual(api.fail('forbidden', 'no'), { ok: false, code: 'forbidden', message: 'no' })
  assert.deepEqual(api.wrap({ error: 'bad', message: 'nope' }), { ok: false, code: 'bad', message: 'nope' })
  assert.deepEqual(api.wrap({ data: 1 }), { ok: true, data: { data: 1 } })
  assert.deepEqual(api.wrap(undefined), { ok: false, code: 'internal', message: 'Host 没有返回结果。' })
})
