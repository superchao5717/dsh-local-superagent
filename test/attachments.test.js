import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { Attachments, ATTACHMENT_LIMITS, attachmentHttp, questionKey, normalizeAttachment } from '../lib/attachments.js'
import { Store } from '../lib/store.js'
import { Engine } from '../lib/engine.js'
import { Sessions } from '../lib/sessions.js'
import { Api } from '../lib/api.js'
import { makeTempDir, cleanupDir, fakeCtx, fakeSessions, waitFor } from './support.js'

const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`
const png = Buffer.from([137, 80, 78, 71])
const owner = { admit: () => ({ peer: { principal: { kind: 'owner' } } }) }
const waiting = task => ({ taskId: task.id, questionKey: questionKey(task) })
function request({ bytes = Buffer.from('abc'), kind = 'file', name = 'video.mp4', ...params } = {}, signal) {
  const query = new URLSearchParams({ kind, name, ...params })
  return new Request(`http://localhost/api/local-superagent/attachment?${query}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: bytes, duplex: 'half', signal })
}
function nativeFixture() {
  const objects = new Map(), receipts = [], calls = []
  const native = {
    imageLimits: { maxImageBytes: 20 * 1024 * 1024, maxImagesPerMessage: 20, maxMessageImageBytes: 200 * 1024 * 1024 },
    async saveFileStream({ data, name, signal }) {
      calls.push(['saveFileStream', name]); const chunks = []
      for await (const part of data) { signal?.throwIfAborted(); chunks.push(Buffer.from(part)) }
      const bytes = Buffer.concat(chunks), ref = { attachmentId: hash(bytes), name, bytes: bytes.length }
      objects.set(`${ref.attachmentId}:${name}`, { ref, bytes })
      if (native.hold) await native.hold()
      return ref
    },
    async saveImages(inputs) {
      calls.push(['saveImages', inputs])
      if (native.imageError) throw Object.assign(new Error('Native image validation refused'), { code: native.imageError })
      return inputs.map(input => {
        if (!Buffer.from(input.data).equals(png) || input.mediaType !== 'image/png') throw Object.assign(new Error('Bad image'), { code: 'INVALID_IMAGE' })
        const ref = { attachmentId: hash(input.data), name: input.name, bytes: input.data.length, mediaType: 'image/png', width: 1, height: 1 }
        objects.set(ref.attachmentId, { ref, bytes: Buffer.from(input.data) }); return ref
      })
    },
    async readImage(ref) {
      calls.push(['readImage', ref.attachmentId])
      const item = objects.get(ref.attachmentId)
      if (!item) throw Object.assign(new Error('Missing'), { code: 'ATTACHMENT_NOT_FOUND' })
      if (native.corrupt) throw Object.assign(new Error('Mismatch'), { code: 'ATTACHMENT_CORRUPT' })
      return { ref: item.ref, data: item.bytes }
    },
    async *readFileStream(ref, signal) {
      calls.push(['readFileStream', ref.attachmentId]); signal?.throwIfAborted()
      const item = objects.get(`${ref.attachmentId}:${ref.name}`)
      if (!item) throw Object.assign(new Error('Missing'), { code: 'ATTACHMENT_NOT_FOUND' })
      if (native.corrupt) throw Object.assign(new Error('Mismatch'), { code: 'ATTACHMENT_CORRUPT' })
      yield item.bytes
    },
  }
  const files = { async uploadStream(input) {
    const file = await native.saveFileStream(input)
    const receiptId = `receipt-${receipts.length + 1}`
    receipts.push({ sessionId: input.sessionId, receiptId, file })
    return { receiptId, file }
  } }
  return { native, files, objects, receipts, calls }
}
async function setup(t, limits) {
  const dir = await makeTempDir('attachments-'), store = await new Store({ file: join(dir, 'board.json') }).load()
  store.setSettings({ paused: true })
  const fixture = nativeFixture(), agents = new Map()
  const ctx = fakeCtx({ agents, workspaces: [{ id: 'w1', title: 'One', path: 'D:\\one' }, { id: 'w2', title: 'Two', path: 'D:\\two' }], services: { attachments: fixture.native, fileUploads: fixture.files } })
  const sessions = fakeSessions()
  sessions.ensure = async options => {
    sessions.calls.push({ name: 'ensure', sessionId: options.sessionId, options })
    const agent = { id: options.sessionId, session: { header: {} } }; agents.set(agent.id, agent); return agent
  }
  const engine = new Engine({ ctx, store, sessions, log: () => {} })
  engine.safePump = () => {}; engine.safeReviews = () => {}
  if (limits) engine.attachments = new Attachments({ ctx, store, limits })
  const a = engine.addSuperagent({ workspaceId: 'w1', title: 'A' }).superagent
  const b = engine.addSuperagent({ workspaceId: 'w2', title: 'B' }).superagent
  const add = (ids = [], agent = a) => engine.addTask({ superagentId: agent.id, workspaceId: agent.workspaceId, title: 'T', goal: 'G', attachments: ids })
  const ask = task => store.update(task.id, { status: 'needs_you', question: { text: 'Which one?', at: Date.now(), requiresHuman: false }, report: { state: 'needs_decision', summary: 'Need reference', at: Date.now() } })
  t.after(async () => { engine.stop(); await store.close(); await cleanupDir(dir) })
  return { ...fixture, dir, store, agents, ctx, sessions, engine, manager: engine.attachments, a, b, add, ask }
}

test('attachments: raw upload uses native CAS, returns metadata only and new-task tokens survive supervisor selection', async t => {
  const { manager, engine, b, add, native } = await setup(t)
  const file = await manager.upload(request({ name: '../../safe.html', bytes: Buffer.from('<script>unsafe</script>') }))
  assert.equal(file.attachment.kind, 'file'); assert.equal(file.attachment.name, 'safe.html')
  assert.equal('data' in file.attachment, false); assert.equal('path' in file.attachment, false)
  const image = await manager.upload(request({ kind: 'image', name: 'sample.png', bytes: png, mediaType: 'image/png' }))
  assert.equal(image.attachment.width, 1)
  const result = add([file.uploadId, image.uploadId], b)
  assert.equal(result.task.superagentId, b.id); assert.equal(result.task.attachments.length, 2)
  assert.ok(result.task.attachments.every(ref => ref.source === 'initial' && typeof ref.at === 'number'))
  assert.equal(manager.uploads.size, 0)
  assert.equal(add([file.uploadId]).error, 'attachment_expired')
  assert.equal(engine.board().attachments.available, true)
  native.imageLimits.maxImageBytes = 6
  assert.equal(manager.capability().limits.maxImageBytes, 6)
})

test('attachments: durable native reserved-name aliases retain their exact identity through reload and reads', async t => {
  const { manager, native, store, add, agents } = await setup(t)
  const inputName = `CON.${'x'.repeat(176)}`, canonicalName = `_${inputName}`
  assert.equal(inputName.length, 180); assert.equal(canonicalName.length, 181)
  const save = native.saveFileStream.bind(native)
  native.saveFileStream = input => save({ ...input, name: /^CON\./i.test(input.name) ? `_${input.name}` : input.name })
  const read = native.readFileStream.bind(native)
  native.readFileStream = async function* (ref, signal) { assert.equal(ref.name, canonicalName); yield* read(ref, signal) }
  const upload = await manager.upload(request({ name: inputName }))
  assert.equal(upload.attachment.name, canonicalName)
  const task = store.get(add([upload.uploadId]).task.id)
  assert.equal(task.attachments[0].name, canonicalName)
  await store.flush()
  const loaded = await new Store({ file: store.file }).load()
  assert.equal(loaded.get(task.id).attachments[0].name, canonicalName)
  agents.set('native-worker', { id: 'native-worker', session: { header: {} } })
  const parts = await manager.workerParts('native-worker', loaded.get(task.id).attachments)
  assert.equal(parts[0].type, 'file')
  const download = await manager.download(new Request(`http://localhost/api/local-superagent/attachment?${new URLSearchParams({ taskId: task.id, attachmentId: upload.attachment.attachmentId })}`))
  assert.equal(await download.text(), 'abc')
  await loaded.close()
  for (const name of ['../secret', 'folder\\file', '.', '..', 'CON.txt', 'NUL', 'bad\u0000file', ' leading', 'trailing ', 'trailing.', 'a'.repeat(256)]) {
    assert.equal(normalizeAttachment({ ...upload.attachment, name }), null, `reject noncanonical durable name: ${JSON.stringify(name)}`)
  }
})

test('attachments: owner admission, invalid shapes/path/url/ref and duplicate batches cannot mutate tasks', async t => {
  const { manager, store, add, calls } = await setup(t)
  for (const admission of [{ rejection: true }, { peer: { principal: { kind: 'guest' } } }]) {
    const response = await attachmentHttp(manager, request(), { admit: () => admission })
    assert.equal(response.status, 403)
  }
  assert.equal(calls.length, 0)
  assert.equal((await attachmentHttp(manager, request({ path: 'C:/secret' }), owner)).status, 400)
  const uploaded = await manager.upload(request())
  const before = structuredClone(store.data)
  for (const ids of [[uploaded.uploadId, 'unknown'], [uploaded.uploadId, uploaded.uploadId], [{ attachmentId: uploaded.attachment.attachmentId }], 'C:/secret', ['https://evil/file']]) {
    assert.ok(add(ids).error); assert.deepEqual(store.data, before)
    assert.equal(manager.uploads.has(uploaded.uploadId), true)
  }
  assert.ok(add([uploaded.uploadId]).task)
})

test('attachments: chunked hard limit defeats missing/false length and abort releases readers and slots', async t => {
  const { manager, calls } = await setup(t, { maxFileBytes: 5, maxImageBytes: 4 })
  let cancelled = false
  const body = new ReadableStream({ start(c) { c.enqueue(Buffer.from('abc')); c.enqueue(Buffer.from('def')); }, cancel() { cancelled = true } })
  const req = request({ bytes: body })
  await assert.rejects(manager.upload(req), { code: 'attachment_too_large' })
  assert.equal(cancelled, true); assert.equal(manager.active, 0); assert.equal(manager.uploads.size, 0)
  const oversized = request({ bytes: Buffer.from('abcdef') })
  oversized.headers.set('content-length', '1')
  await assert.rejects(manager.upload(oversized), { code: 'attachment_too_large' })
  const declared = request(); declared.headers.set('content-length', '999')
  const count = calls.length; await assert.rejects(manager.upload(declared), { code: 'attachment_too_large' }); assert.equal(calls.length, count)
  let abortCancelled = false
  const controller = new AbortController()
  const hanging = new ReadableStream({ cancel() { abortCancelled = true } })
  const promise = manager.upload(request({ bytes: hanging }, controller.signal))
  controller.abort()
  await assert.rejects(promise, { code: 'invalid_attachment' })
  assert.equal(abortCancelled, true); assert.equal(manager.active, 0)
})

test('attachments: native image pixels/type are validated, and videos are exact files not vision', async t => {
  const { manager, native, calls, add, store, engine, receipts } = await setup(t)
  await assert.rejects(manager.upload(request({ kind: 'image', bytes: Buffer.from('video'), mediaType: 'video/mp4' })), { code: 'invalid_attachment' })
  native.imageError = 'IMAGE_TOO_MANY_PIXELS'
  await assert.rejects(manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' })), { code: 'attachment_too_large' })
  assert.ok(calls.some(([name]) => name === 'saveImages')); native.imageError = null
  await assert.rejects(manager.upload(request({ kind: 'image', bytes: Buffer.from('fake'), mediaType: 'image/png' })), { code: 'invalid_attachment' })
  const video = await manager.upload(request({ bytes: Buffer.from('raw-video'), name: 'movie.mp4' }))
  const task = store.get(add([video.uploadId]).task.id)
  store.setSettings({ paused: false }); await engine.pump()
  assert.equal(task.status, 'running'); assert.equal(receipts.length, 1)
  assert.equal(receipts[0].file.attachmentId, hash(Buffer.from('raw-video')))
})

test('attachments: expiry, count, aggregate and native image batch limits are whole-batch atomic', async t => {
  const { manager, store, add, ask, engine, native } = await setup(t, { maxFileBytes: 8, maxTotalBytes: 7, maxAttachments: 2 })
  let now = 100; manager.clock = () => now
  const one = await manager.upload(request({ bytes: Buffer.from('abcd') }))
  const two = await manager.upload(request({ bytes: Buffer.from('efgh') }))
  assert.equal(add([one.uploadId, two.uploadId]).error, 'attachment_too_large')
  assert.equal(manager.uploads.size, 2)
  const task = store.get(add([one.uploadId]).task.id); ask(task)
  const answerFile = await manager.upload(request({ bytes: Buffer.from('ab'), ...waiting(task) }))
  assert.ok(engine.answer(task.id, '', [answerFile.uploadId], questionKey(task)).task)
  ask(task)
  const third = await manager.upload(request({ bytes: Buffer.from('z'), ...waiting(task) }))
  assert.equal(engine.answer(task.id, 'yes', [third.uploadId]).error, 'too_many_attachments')
  assert.equal(task.attachments.length, 2); assert.equal(manager.uploads.has(third.uploadId), true)
  now += ATTACHMENT_LIMITS.uploadTtlMs + 1
  assert.equal(add([two.uploadId]).error, 'attachment_expired'); manager.prune(); assert.equal(manager.uploads.size, 0)
  manager.policy.maxTotalBytes = 100; manager.policy.maxAttachments = 20
  native.imageLimits.maxImagesPerMessage = 1
  const i1 = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  const i2 = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  assert.equal(add([i1.uploadId, i2.uploadId]).error, 'attachment_too_large')
})

test('attachments: normalized image size cannot bypass source-byte total or native message budgets', async t => {
  const { manager, native, add, store } = await setup(t, { maxTotalBytes: 7 })
  native.saveImages = async inputs => inputs.map(input => ({ attachmentId: hash(Buffer.from('normalized')), name: input.name, bytes: 1, mediaType: 'image/png', width: 1, height: 1 }))
  const one = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  const two = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  assert.equal(one.attachment.bytes, 1); assert.equal(one.attachment.sourceBytes, 4)
  assert.equal(add([one.uploadId, two.uploadId]).error, 'attachment_too_large')
  assert.equal(store.list().length, 0); assert.equal(manager.uploads.size, 2)
  manager.policy.maxTotalBytes = 100
  native.imageLimits.maxMessageImageBytes = 7
  assert.equal(add([one.uploadId, two.uploadId]).error, 'attachment_too_large')
  native.imageLimits.maxMessageImageBytes = 3
  assert.equal(manager.capability().limits.maxImageBytes, 3)
  await assert.rejects(manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' })), { code: 'attachment_too_large' })
  native.imageLimits.maxMessageImageBytes = 100
  const accepted = add([one.uploadId])
  assert.equal(accepted.task.attachments[0].sourceBytes, 4)
  await store.flush()
  const loaded = await new Store({ file: store.file }).load()
  assert.equal(loaded.get(accepted.task.id).attachments[0].sourceBytes, 4)
  await loaded.close()
})

test('attachments: pending registry and concurrent intake are bounded and stop aborts active streams', async t => {
  const { manager } = await setup(t)
  manager.clock = () => 100
  for (let i = 0; i < 64; i++) manager.uploads.set(`pending-${i}`, { expiresAt: 1000 })
  await assert.rejects(manager.upload(request()), { code: 'attachment_upload_busy' })
  manager.uploads.clear()
  let cancelled = 0
  const pending = Array.from({ length: 4 }, () => manager.upload(request({ bytes: new ReadableStream({ cancel() { cancelled++ } }) })))
  await assert.rejects(manager.upload(request()), { code: 'attachment_upload_busy' })
  manager.close()
  const results = await Promise.allSettled(pending)
  assert.ok(results.every(result => result.status === 'rejected'))
  assert.equal(cancelled, 4); assert.equal(manager.active, 0); assert.equal(manager.uploads.size, 0)
})

test('attachments: answer uploads lock task and exact question before/during/after upload; no cross-entry replay', async t => {
  const { manager, native, store, engine, add, ask } = await setup(t)
  const t1 = store.get(add().task.id), t2 = store.get(add().task.id); ask(t1); ask(t2)
  const initial = await manager.upload(request())
  assert.equal(engine.answer(t1.id, '', [initial.uploadId]).error, 'attachment_scope_mismatch')
  const reply = await manager.upload(request({ ...waiting(t1) }))
  assert.equal(add([reply.uploadId]).error, 'attachment_scope_mismatch')
  assert.equal(engine.answer(t2.id, 'yes', [reply.uploadId]).error, 'attachment_scope_mismatch')
  store.update(t1.id, { question: { text: 'New question', at: t1.question.at + 1 } })
  assert.equal(engine.answer(t1.id, 'yes', [reply.uploadId]).error, 'attachment_question_changed')
  assert.equal(t1.status, 'needs_you'); assert.equal(manager.uploads.has(reply.uploadId), true)
  await assert.rejects(manager.upload(request({ taskId: t1.id })), { code: 'attachment_question_changed' })
  let release; native.hold = () => new Promise(resolve => { release = resolve })
  const pending = manager.upload(request({ ...waiting(t1) }))
  assert.ok(await waitFor(() => !!release)); engine.stopTask(t1.id); release()
  await assert.rejects(pending, { code: 'attachment_question_changed' })
  assert.equal(t1.status, 'cancelled')
})

test('attachments: attachment-only answers are atomic, preserve original context and invalidate old review epochs', async t => {
  const { manager, store, engine, add, ask } = await setup(t)
  const task = store.get(add().task.id); ask(task)
  const key = questionKey(task), epoch = task.reviewEpoch
  const upload = await manager.upload(request({ ...waiting(task) }))
  const snapshot = structuredClone(task)
  assert.equal(engine.answer(task.id, 'yes', [upload.uploadId, 'bad'], key).error, 'attachment_expired')
  assert.deepEqual(task, snapshot)
  const result = engine.answer(task.id, '', [upload.uploadId], key)
  assert.equal(result.task.status, 'queued'); assert.equal(task.attachments[0].source, 'answer')
  assert.equal(task.pendingInput.previousQuestion, 'Which one?'); assert.equal(task.pendingInput.previousReport, 'Need reference')
  assert.equal(task.pendingInput.attachmentReply, true); assert.ok(task.reviewEpoch > epoch)
  assert.equal(manager.uploads.has(upload.uploadId), false)
  assert.equal(engine.answer(task.id, '', []).error, 'not_waiting')
})

test('attachments: every new worker round re-stages durable refs, never persisted receipts, including recovery', async t => {
  const { manager, store, engine, sessions, add, ask, receipts, ctx } = await setup(t)
  const image = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png', name: 'reference.png' }))
  const video = await manager.upload(request())
  const task = store.get(add([image.uploadId, video.uploadId]).task.id)
  store.setSettings({ paused: false })
  await engine.pump()
  function verifyLast() {
    const prompt = sessions.calls.filter(call => call.name === 'prompt').at(-1)
    assert.deepEqual(prompt.attachmentParts.map(part => part.type), ['image', 'file'])
    assert.equal(prompt.attachmentParts[0].data, png.toString('base64'))
    assert.equal(prompt.attachmentParts[1].receiptId, receipts.at(-1).receiptId)
    assert.equal(receipts.at(-1).sessionId, task.workerSessionId)
    return prompt
  }
  verifyLast()
  ask(task)
  const reply = await manager.upload(request({ bytes: Buffer.from('extra'), ...waiting(task) }))
  assert.ok(engine.answer(task.id, 'B', [reply.uploadId], questionKey(task)).task)
  await engine.pump()
  assert.equal(sessions.calls.filter(call => call.name === 'prompt').at(-1).attachmentParts.length, 3)
  store.update(task.id, { status: 'reviewing', report: { state: 'ready', summary: 'More', at: Date.now() } })
  engine.applyReview({ task_id: task.id, verdict: 'continue', continue_instruction: 'Finish' }); await engine.pump()
  assert.equal(sessions.calls.filter(call => call.name === 'prompt').at(-1).attachmentParts.length, 3)
  ask(task); store.setSettings({ autonomy: { enabled: true, waitMinutes: 1 } })
  store.update(task.id, { question: { text: 'Choose colour', at: 1, requiresHuman: false } }); engine.considerAutonomy()
  engine.applyReview({ task_id: task.id, verdict: 'continue', continue_instruction: 'Use blue' }); await engine.pump()
  assert.equal(task.attachments.length, 3)
  assert.equal(sessions.calls.filter(call => call.name === 'prompt').at(-1).attachmentParts.length, 3)
  engine.stopTask(task.id); engine.retry(task.id); await engine.pump()
  assert.equal(sessions.calls.filter(call => call.name === 'prompt').at(-1).attachmentParts.length, 3)
  await store.flush()
  const loaded = await new Store({ file: store.file }).load()
  t.after(() => loaded.close())
  assert.deepEqual(loaded.get(task.id).attachments, task.attachments)
  assert.equal(JSON.stringify(loaded.data).includes('receipt-'), false)
  const restoredSessions = fakeSessions({ ensure: sessions.ensure })
  const restored = new Engine({ ctx, store: loaded, sessions: restoredSessions, log: () => {} })
  restored.safeReviews = () => {}; restored.safePump = () => {}
  await restored.recover(); await restored.pump()
  assert.equal(restoredSessions.calls.filter(call => call.name === 'prompt').at(-1).attachmentParts.length, 3)
  assert.equal(new Set(receipts.map(item => item.receiptId)).size, receipts.length)
  restored.stop()
})

test('attachments: stale dispatch cannot prompt after stop while files are being staged', async t => {
  const { manager, engine, store, sessions, native, add } = await setup(t)
  const file = await manager.upload(request())
  const task = store.get(add([file.uploadId]).task.id)
  let release; native.hold = () => new Promise(resolve => { release = resolve })
  store.setSettings({ paused: false }); const dispatch = engine.pump()
  assert.ok(await waitFor(() => !!release)); engine.stopTask(task.id); release(); await dispatch
  assert.equal(task.status, 'cancelled')
  assert.equal(sessions.calls.some(call => call.name === 'prompt'), false)
})

test('attachments: native missing/corrupt objects and subagent targets fail clearly without a fake success', async t => {
  const { manager, objects, native, agents, engine, store, add } = await setup(t)
  const image = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  const task = store.get(add([image.uploadId]).task.id)
  agents.set('subagent', { id: 'subagent', session: { header: { origin: 'subagent' } } })
  await assert.rejects(manager.workerParts('subagent', task.attachments), { code: 'attachments_unsupported' })
  objects.clear(); store.setSettings({ paused: false }); await engine.pump()
  assert.equal(task.status, 'needs_you'); assert.match(task.question.text, /附件已不存在/)
  const file = await manager.upload(request()); task.attachments = [{ ...file.attachment, source: 'initial', at: 1 }]
  native.corrupt = true
  agents.set('ordinary', { id: 'ordinary', session: { header: {} } })
  await assert.rejects(manager.workerParts('ordinary', task.attachments), { code: 'attachment_corrupt' })
})

test('attachments: owner-only downloads require a task reference and force safe image/file headers', async t => {
  const { manager, store, add, calls } = await setup(t)
  const image = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  const file = await manager.upload(request({ name: 'evil.html', bytes: Buffer.from('<script>unsafe</script>') }))
  const task = store.get(add([image.uploadId, file.uploadId]).task.id)
  const get = id => new Request(`http://localhost/api/local-superagent/attachment?${new URLSearchParams({ taskId: task.id, attachmentId: id })}`)
  assert.equal((await attachmentHttp(manager, get(image.attachment.attachmentId), owner)).headers.get('content-type'), 'image/png')
  const downloaded = await attachmentHttp(manager, get(file.attachment.attachmentId), owner)
  assert.equal(downloaded.headers.get('content-type'), 'application/octet-stream')
  assert.match(downloaded.headers.get('content-disposition'), /^attachment;/)
  assert.equal(downloaded.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(await downloaded.text(), '<script>unsafe</script>')
  const before = calls.length
  const denied = await attachmentHttp(manager, get(image.attachment.attachmentId), { admit: () => ({ rejection: true }) })
  assert.equal(denied.status, 403); assert.equal(calls.length, before)
  assert.equal((await attachmentHttp(manager, get('sha256:' + '0'.repeat(64)), owner)).status, 400)
  assert.equal((await attachmentHttp(manager, new Request('http://localhost/api/local-superagent/attachment?path=C:/private'), owner)).status, 400)
})

test('attachments: optional native services never disable text board, and API awaits async attachment-aware methods', async t => {
  const dir = await makeTempDir('text-only-'), store = await new Store({ file: join(dir, 'board.json') }).load()
  const engine = new Engine({ ctx: fakeCtx({ workspaces: [{ id: 'w', path: 'D:/w' }] }), store, sessions: fakeSessions(), log: () => {} })
  engine.safePump = () => {}
  t.after(async () => { engine.stop(); await store.close(); await cleanupDir(dir) })
  assert.equal(engine.board().attachments.available, false)
  assert.ok(engine.addTask({ workspaceId: 'w', title: 'T', goal: 'G' }).task)
  const response = await attachmentHttp(engine.attachments, request(), owner)
  assert.equal((await response.json()).code, 'attachments_unsupported')
  const calls = []
  const api = new Api({ engine: { addTask: async args => { calls.push(args); return { task: { id: 'async' } } }, answer: async (...args) => { calls.push(args); return { task: { id: 'answer' } } } }, log: () => {} })
  assert.equal((await api.handle({ action: 'task.add', attachments: ['token'] })).data.task.id, 'async')
  assert.equal((await api.handle({ action: 'task.answer', id: 'x', text: '', attachments: ['token'], questionKey: 'key' })).data.task.id, 'answer')
  assert.deepEqual(calls[1], ['x', '', ['token'], 'key'])
})

test('attachments: a model refusing image input becomes a clear wait, never text-only success', async t => {
  const { manager, store, engine, sessions, add } = await setup(t)
  const image = await manager.upload(request({ kind: 'image', bytes: png, mediaType: 'image/png' }))
  const task = store.get(add([image.uploadId]).task.id)
  sessions.prompt = async (_sessionId, _requestId, _text, _mode, parts) => {
    assert.equal(parts[0].type, 'image')
    throw new Error('Model does not support image input (MODEL_DOES_NOT_SUPPORT_IMAGES)')
  }
  store.setSettings({ paused: false }); await engine.pump()
  assert.equal(task.status, 'needs_you')
  assert.match(task.question.text, /does not support image input/)
  assert.equal(task.attachments.length, 1); assert.equal(task.report, null)
})

test('sessions: prompt sends native image and current-session file receipt parts unmodified', async () => {
  let accepted
  const ctx = fakeCtx({ services: { sessionController: { prompt: async request => { accepted = request } } } })
  const sessions = new Sessions({ ctx, log: () => {} })
  const parts = [{ type: 'image', mediaType: 'image/png', data: png.toString('base64'), name: 'i.png' }, { type: 'file', receiptId: 'native-receipt' }]
  await sessions.prompt('worker', 'request', 'Task', 'queue', parts)
  assert.deepEqual(accepted.content, [{ type: 'text', text: 'Task' }, ...parts])
})
