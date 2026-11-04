import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Store, SCHEMA, STATUSES } from '../lib/store.js'
import { cleanupDir, makeTempDir } from './support.js'

const dirs = []
const stores = []

after(async () => {
  for (const store of stores) {
    try {
      await store.close()
    } catch {
      /* a failed test may already have closed it */
    }
  }
  for (const dir of dirs) await cleanupDir(dir)
})

async function makeFile() {
  const dir = await makeTempDir('store-')
  dirs.push(dir)
  return { dir, file: join(dir, 'board.json') }
}

async function makeStore(log = () => {}) {
  const { dir, file } = await makeFile()
  const store = new Store({ file, log })
  stores.push(store)
  return { dir, file, store }
}

const sample = (overrides = {}) => ({
  workspaceId: 'w1',
  workspaceTitle: 'WS',
  workspacePath: 'D:\\ws',
  title: 'task title',
  goal: 'task goal',
  acceptance: 'done when green',
  priority: 2,
  ...overrides,
})

test('store: missing / empty / bad JSON files load defaults instead of throwing', async () => {
  const missing = await makeStore(() => {})
  await missing.store.load()
  assert.deepEqual(missing.store.settings, { paused: false, maxWorkers: 2, autoReview: true })
  assert.deepEqual(missing.store.list(), [])

  const empty = await makeFile()
  await writeFile(empty.file, '', 'utf8')
  const emptyLogs = []
  const emptyStore = new Store({ file: empty.file, log: message => emptyLogs.push(message) })
  stores.push(emptyStore)
  await emptyStore.load()
  assert.deepEqual(emptyStore.settings, { paused: false, maxWorkers: 2, autoReview: true })
  assert.deepEqual(emptyStore.list(), [])
  assert.ok(emptyLogs.some(message => message.includes('could not read')))

  const bad = await makeFile()
  await writeFile(bad.file, '{ this is not json', 'utf8')
  const badLogs = []
  const badStore = new Store({ file: bad.file, log: message => badLogs.push(message) })
  stores.push(badStore)
  await badStore.load()
  assert.deepEqual(badStore.settings, { paused: false, maxWorkers: 2, autoReview: true })
  assert.deepEqual(badStore.list(), [])
  assert.ok(badLogs.some(message => message.includes('could not read')))
})

test('store: loaded rows are normalized and unusable rows are dropped', async () => {
  const { file, store } = await makeStore()
  await writeFile(file, JSON.stringify({
    schema: 99,
    revision: 7,
    settings: { paused: 'yes', maxWorkers: 99, autoReview: 0 },
    tasks: [
      null,
      { id: 1, title: 'numeric id', goal: 'g' },
      { id: 't1', title: 'T', goal: 'G', status: 'weird', priority: 9, attempts: -4, createdAt: 'nope' },
    ],
    events: [{ type: 'kept' }, { bad: 1 }],
  }), 'utf8')
  await store.load()
  assert.equal(store.settings.paused, false)
  assert.equal(store.settings.maxWorkers, 4)
  assert.equal(store.settings.autoReview, true)
  assert.equal(store.list().length, 1)
  const task = store.get('t1')
  assert.equal(task.status, 'queued')
  assert.equal(task.priority, 3)
  assert.equal(task.attempts, 0)
  assert.equal(typeof task.createdAt, 'number')
  assert.deepEqual(task.progress, [])
  assert.deepEqual(task.log, [])
  assert.equal(store.data.revision, 7)
  assert.equal(store.data.events.length, 1)
  assert.equal(store.data.events[0].type, 'kept')
})

test('store: add/update/remove and board counts use the public task shape', async () => {
  const { store } = await makeStore()
  const task = store.add(sample({ title: '  spaced  ', priority: 1 }))
  assert.match(task.id, /^sa-[0-9a-f]{8}$/)
  assert.match(task.workerSessionId, /^sa-task-/)
  assert.equal(task.title, '  spaced  ')
  assert.equal(task.status, 'queued')
  assert.equal(task.priority, 1)
  assert.equal(task.attempts, 0)
  assert.equal(task.acceptance, 'done when green')
  assert.equal(task.report, null)
  assert.equal(task.review, null)
  assert.equal(task.question, null)
  assert.equal(task.reviewRounds, 0)
  assert.equal(task.finishedAt, null)
  assert.equal(task.progress.length, 1)
  assert.match(task.progress[0].text, /已接单/)
  assert.equal(store.get(task.id), task)
  assert.equal(store.remove('nope'), false)

  const before = task.updatedAt
  const updated = store.update(task.id, { status: 'running', startedAt: 42 })
  assert.equal(updated.status, 'running')
  assert.equal(updated.startedAt, 42)
  assert.ok(updated.updatedAt >= before)
  assert.equal(store.update('nope', { status: 'done' }), undefined)

  assert.equal(store.count('running'), 1)
  assert.equal(store.openCount(), 1)
  assert.equal(store.remove(task.id), true)
  assert.equal(store.get(task.id), undefined)
  assert.equal(store.list().length, 0)
})

test('store: progress and log are capped to the newest entries', async () => {
  const { store } = await makeStore()
  const task = store.add(sample())
  for (let index = 0; index < 20; index += 1) store.progress(task, `p-${index}`)
  assert.equal(task.progress.length, 8)
  assert.equal(task.progress[0].text, 'p-12')
  assert.equal(task.progress[7].text, 'p-19')

  for (let index = 0; index < 80; index += 1) store.log(task.id, 'event', `l-${index}`)
  assert.equal(task.log.length, 60)
  assert.equal(task.log[0].text, 'l-20')
  assert.equal(task.log[59].text, 'l-79')
  assert.equal(store.log('nope', 'event', 'ignored'), undefined)
})

test('store: settings are clamped and only booleans change booleans', async () => {
  const { store } = await makeStore()
  assert.equal(store.setSettings({ maxWorkers: 0 }).maxWorkers, 1)
  assert.equal(store.setSettings({ maxWorkers: 9 }).maxWorkers, 4)
  assert.equal(store.setSettings({ maxWorkers: 2.6 }).maxWorkers, 3)
  assert.equal(store.setSettings({ maxWorkers: 'not a number' }).maxWorkers, 3)
  assert.equal(store.setSettings({ maxWorkers: Number.NaN }).maxWorkers, 3)
  assert.equal(store.setSettings({ paused: 'yes' }).paused, false)
  assert.equal(store.setSettings({ paused: true }).paused, true)
  assert.equal(store.setSettings({ paused: 1 }).paused, true)
  assert.equal(store.setSettings({ autoReview: 0 }).autoReview, true)
  assert.equal(store.setSettings({ autoReview: false }).autoReview, false)
  const copy = store.settings
  copy.maxWorkers = 1
  assert.equal(store.settings.maxWorkers, 3)
})

test('store: flush writes atomically and a reload round-trips every persisted field', async () => {
  const { dir, file, store } = await makeStore()
  const first = store.add(sample({ title: 'first', goal: 'one' }))
  store.add(sample({ title: 'second', goal: 'two', priority: 3 }))
  store.update(first.id, {
    status: 'done',
    startedAt: 111,
    finishedAt: 222,
    acceptance: 'ok',
    report: {
      state: 'needs_decision',
      summary: 'need a decision',
      deliverables: ['a.txt', 'b/c.txt'],
      question: 'Which option?',
      at: 333,
    },
    review: { verdict: 'needs_you', note: 'ask user', at: 444 },
    question: { text: 'Which option?', at: 555 },
    reviewRounds: 2,
  })
  store.log(first.id, 'custom', 'log text')
  store.progress(first, 'progress text')
  store.setSettings({ paused: true, maxWorkers: 3, autoReview: false })
  await store.flush()

  const raw = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(raw.schema, SCHEMA)
  assert.equal(raw.tasks.length, 2)
  assert.equal(raw.settings.maxWorkers, 3)
  assert.equal(raw.settings.paused, true)
  assert.equal(raw.settings.autoReview, false)
  assert.ok(raw.revision > 0)
  const entries = await readdir(dir)
  assert.deepEqual(entries.filter(name => name.endsWith('.tmp')), [])

  const reloaded = new Store({ file })
  stores.push(reloaded)
  await reloaded.load()
  assert.deepEqual(reloaded.get(first.id), store.get(first.id))
  assert.equal(reloaded.get(first.id).report.question, 'Which option?')
  assert.equal(reloaded.get(first.id).review.verdict, 'needs_you')
  assert.equal(reloaded.get(first.id).question.text, 'Which option?')
  assert.equal(reloaded.get(first.id).reviewRounds, 2)
  assert.equal(reloaded.get(first.id).log.at(-1).text, 'log text')
  assert.equal(reloaded.get(first.id).progress.at(-1).text, 'progress text')
})

test('store: close flushes a pending debounced write and list is newest-first', async () => {
  const { file, store } = await makeStore()
  const first = store.add(sample({ title: 'first' }))
  const second = store.add(sample({ title: 'second' }))
  store.get(first.id).updatedAt = 100
  store.get(second.id).updatedAt = 200
  const listed = store.list()
  assert.equal(listed[0].id, second.id)
  assert.equal(listed[1].id, first.id)
  assert.ok(listed[0].updatedAt >= listed[1].updatedAt)
  await store.close()
  const raw = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(raw.tasks.length, 2)
  assert.ok(STATUSES.includes('needs_you'))
})
