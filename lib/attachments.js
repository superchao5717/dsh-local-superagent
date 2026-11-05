/** Owner-only bounded intake over DSH's native immutable attachment services.
 * Browser values are never durable references: only short-lived Host-minted
 * capabilities can be atomically bound to a task. Native CAS objects are not deleted.
 */
import { randomUUID } from 'node:crypto'

const MiB = 1024 * 1024
export const ATTACHMENT_LIMITS = Object.freeze({ maxFileBytes: 100 * MiB, maxImageBytes: 20 * MiB,
  maxAttachments: 20, maxTotalBytes: 200 * MiB, uploadTtlMs: 30 * 60_000 })
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const ID = /^sha256:[a-f0-9]{64}$/
const MAX_PENDING = 64
const MAX_CONCURRENT = 4

export class AttachmentFailure extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const fail = (code, message) => { throw new AttachmentFailure(code, message) }
export const questionKey = task => task?.question ? JSON.stringify([task.question.at, task.question.text]) : null
export const isAnswerable = task => task && (task.status === 'needs_you' || (task.status === 'reviewing' && !!task.autonomyReview)) && !!task.question

/** Display-only leaf; never interpreted as an input filesystem path. */
export function attachmentName(value) {
  const leaf = typeof value === 'string' ? value.split(/[\\/]/).at(-1) : ''
  const clean = (leaf || 'file').replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_').trim().replace(/[. ]+$/g, '')
  return Array.from(clean).slice(0, 180).join('') || 'file'
}

/** Validate native canonical names without changing their storage identity.
 * Intake/display sanitization must never be reapplied to a durable file alias.
 */
function validDurableName(name, kind) {
  if (typeof name !== 'string' || !name || name === '.' || name === '..' || name.trim() !== name || /[\\/\u0000-\u001f\u007f]/.test(name)) return false
  if (kind !== 'file') return name.length <= 255
  const stem = name.split('.')[0].replace(/[. ]+$/g, '')
  return Buffer.byteLength(name, 'utf8') <= 255 && !/[<>:"|?*]/.test(name) && !/[. ]$/.test(name)
    && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)
}

/** Ledger normalization is deliberately a closed projection: no path, URL or inline bytes survive. */
export function normalizeAttachment(value) {
  if (!value || !['image', 'file'].includes(value.kind) || !ID.test(value.attachmentId) || !Number.isSafeInteger(value.bytes) || value.bytes < 0 || !validDurableName(value.name, value.kind)) return null
  if (value.kind === 'image' && (!IMAGE_TYPES.has(value.mediaType) || !Number.isSafeInteger(value.width) || value.width < 1 || !Number.isSafeInteger(value.height) || value.height < 1)) return null
  const sourceBytes = Number.isSafeInteger(value.sourceBytes) && value.sourceBytes >= 0 ? value.sourceBytes : value.bytes
  return { kind: value.kind, attachmentId: value.attachmentId, name: value.name, bytes: value.bytes,
    sourceBytes,
    ...(value.kind === 'image' ? { mediaType: value.mediaType, width: value.width, height: value.height,
      ...(Number.isSafeInteger(value.originalDimensions?.width) && Number.isSafeInteger(value.originalDimensions?.height)
        ? { originalDimensions: { width: value.originalDimensions.width, height: value.originalDimensions.height } } : {}) } : {}),
    ...(value.source === 'initial' || value.source === 'answer' ? { source: value.source } : {}),
    ...(Number.isFinite(value.at) ? { at: value.at } : {}) }
}

function publicFailure(error) {
  if (error instanceof AttachmentFailure) return error
  const code = error?.code
  if (code === 'ATTACHMENT_NOT_FOUND') return new AttachmentFailure('attachment_missing', '原生附件已不存在，请重新上传。')
  if (code === 'ATTACHMENT_CORRUPT' || code === 'INVALID_ATTACHMENT_REF') return new AttachmentFailure('attachment_corrupt', '原生附件引用或完整性校验失败。')
  if (['IMAGE_TOO_LARGE', 'IMAGES_TOO_LARGE', 'IMAGE_TOO_MANY_PIXELS', 'IMAGE_DIMENSION_TOO_LARGE'].includes(code)) return new AttachmentFailure('attachment_too_large', '图片超过原生字节或像素限制。')
  return new AttachmentFailure('invalid_attachment', '附件处理失败或格式不受支持，请重新上传。')
}

export class Attachments {
  constructor({ ctx, store, clock = Date.now, limits = ATTACHMENT_LIMITS }) {
    this.ctx = ctx; this.store = store; this.clock = clock; this.policy = { ...ATTACHMENT_LIMITS, ...limits }
    this.uploads = new Map(); this.active = 0; this.closed = false; this.controllers = new Set()
  }
  get native() { return this.ctx.get('attachments') }
  get files() { return this.ctx.get('fileUploads') }
  capability() {
    const a = this.native
    const available = !this.closed && !!a && ['saveImages', 'saveFileStream', 'readImage', 'readFileStream'].every(key => typeof a[key] === 'function') && typeof this.files?.uploadStream === 'function'
    const caps = [a?.imageLimits?.maxImageBytes, a?.imageLimits?.maxMessageImageBytes].filter(value => Number.isSafeInteger(value) && value > 0)
    return { available, limits: { ...this.policy, maxImageBytes: Math.min(this.policy.maxImageBytes, ...caps) },
      ...(!available ? { reason: '当前 Host 未提供完整原生附件/文件上传服务；文本任务仍可使用。' } : {}) }
  }
  requireNative() { if (!this.capability().available) fail('attachments_unsupported', '当前 Host 不支持原生附件；请继续使用文本任务或更新 Host。') }
  close() { this.closed = true; this.uploads.clear(); for (const controller of this.controllers) controller.abort(); this.controllers.clear() }
  prune() { const at = this.clock(); for (const [id, row] of this.uploads) if (row.expiresAt <= at) this.uploads.delete(id) }
  scope(taskId, expectedKey) {
    if (!taskId) {
      if (expectedKey) fail('attachment_scope_mismatch', '新任务上传不能携带回答问题标识。')
      return { taskId: null, questionKey: null }
    }
    const task = this.store.get(taskId)
    if (!isAnswerable(task) || typeof expectedKey !== 'string' || questionKey(task) !== expectedKey) fail('attachment_question_changed', '问题已变化或任务不再等待回答，请刷新后重新上传。')
    return { taskId, questionKey: expectedKey }
  }
  checkScope(scope) { if (scope.taskId) this.scope(scope.taskId, scope.questionKey) }

  async upload(request) {
    this.requireNative(); this.prune()
    if (this.active >= MAX_CONCURRENT || this.uploads.size + this.active >= MAX_PENDING) fail('attachment_upload_busy', '待绑定附件或同时上传过多，请稍后重试。')
    const url = new URL(request.url), kind = url.searchParams.get('kind')
    if (!['image', 'file'].includes(kind) || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/octet-stream') fail('invalid_attachment', '附件必须以 image/file 类型和原始二进制流上传。')
    // No aliases for filesystem paths, remote fetches, base64 or client-generated refs.
    const allowed = new Set(['kind', 'name', 'mediaType', 'taskId', 'questionKey'])
    if ([...url.searchParams.keys()].some(key => !allowed.has(key))) fail('invalid_attachment', '附件上传参数不受支持。')
    const scope = this.scope(url.searchParams.get('taskId'), url.searchParams.get('questionKey'))
    const name = attachmentName(url.searchParams.get('name'))
    const mediaType = url.searchParams.get('mediaType')
    if (kind === 'image' && !IMAGE_TYPES.has(mediaType)) fail('invalid_attachment', '图片类型不受支持。')
    const limits = this.capability().limits, cap = kind === 'image' ? limits.maxImageBytes : limits.maxFileBytes
    const declared = request.headers.get('content-length')
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > cap)) fail('attachment_too_large', '附件超过单文件字节限制。')
    const controller = new AbortController()
    const signal = AbortSignal.any([request.signal, controller.signal])
    this.controllers.add(controller)
    let bytes = 0, streamFailure
    const source = async function* () {
      if (!request.body) return
      const reader = request.body.getReader()
      const abort = () => { void reader.cancel(signal.reason).catch(() => {}) }
      signal.addEventListener('abort', abort, { once: true })
      let complete = false
      try {
        for (;;) {
          signal.throwIfAborted()
          const chunk = await reader.read()
          if (chunk.done) { complete = true; break }
          signal.throwIfAborted()
          if (!(chunk.value instanceof Uint8Array)) fail('invalid_attachment', '附件流必须由原始字节组成。')
          bytes += chunk.value.byteLength
          if (bytes > cap) { streamFailure = new AttachmentFailure('attachment_too_large', '附件超过单文件字节限制。'); throw streamFailure }
          yield chunk.value
        }
      } finally {
        signal.removeEventListener('abort', abort)
        if (!complete) await reader.cancel().catch(() => {})
        reader.releaseLock()
      }
    }
    this.active++
    try {
      let ref
      if (kind === 'file') ref = await this.native.saveFileStream({ data: source(), name, signal })
      else {
        const chunks = []; for await (const chunk of source()) chunks.push(Buffer.from(chunk))
        const refs = await this.native.saveImages([{ data: new Uint8Array(Buffer.concat(chunks)), mediaType, name }])
        ref = refs[0]
      }
      signal.throwIfAborted()
      if (this.closed) fail('attachments_unsupported', '附件服务已停止，请刷新后重试。')
      this.checkScope(scope)
      const attachment = normalizeAttachment({ ...ref, kind, name: ref?.name ?? name, sourceBytes: bytes })
      if (!attachment || attachment.bytes > cap || (kind === 'file' && attachment.bytes !== bytes)) fail('invalid_attachment', '原生附件服务返回了无效引用。')
      const uploadId = randomUUID(), expiresAt = this.clock() + limits.uploadTtlMs
      this.prune(); this.uploads.set(uploadId, { attachment, expiresAt, ...scope })
      return { uploadId, attachment: structuredClone(attachment), expiresAt, ...(scope.taskId ? { questionKey: scope.questionKey } : {}) }
    } catch (error) {
      if (signal.aborted) throw new AttachmentFailure('invalid_attachment', '附件上传已取消。')
      throw streamFailure ?? publicFailure(error)
    } finally { this.active--; this.controllers.delete(controller) }
  }

  /** Synchronous whole-batch validation followed by an atomic, no-await consume. */
  prepare(ids, { task = null, source = 'initial' } = {}) {
    if (ids === undefined) ids = []
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || id.length > 100) || new Set(ids).size !== ids.length) fail('invalid_attachment', '附件参数必须是不重复的上传标识列表。')
    if (ids.length) this.requireNative()
    const at = this.clock(), existing = task?.attachments ?? []
    if (existing.length + ids.length > this.policy.maxAttachments) fail('too_many_attachments', '任务累计附件超过数量限制。')
    const rows = ids.map(id => {
      const row = this.uploads.get(id)
      if (!row) fail('attachment_expired', '附件上传标识未知、已使用或已过期，请重新上传。')
      if (row.expiresAt <= at) fail('attachment_expired', '附件上传已过期，请重新上传。')
      if (source === 'initial' ? row.taskId !== null : row.taskId !== task?.id) fail('attachment_scope_mismatch', '新任务与回答附件不能跨入口或任务复用。')
      if (source === 'answer') this.checkScope(row)
      return row
    })
    const images = [...existing, ...rows.map(row => row.attachment)].filter(ref => ref.kind === 'image')
    const nativeLimits = this.native?.imageLimits
    if (ids.length && (images.length > (nativeLimits?.maxImagesPerMessage ?? this.policy.maxAttachments)
      || images.reduce((n, ref) => n + Math.max(ref.sourceBytes ?? ref.bytes, ref.bytes), 0) > (nativeLimits?.maxMessageImageBytes ?? this.policy.maxTotalBytes))) fail('attachment_too_large', '图片批次超过原生消息限制。')
    const budget = ref => Math.max(ref.sourceBytes ?? ref.bytes, ref.bytes)
    const total = existing.reduce((n, ref) => n + budget(ref), 0) + rows.reduce((n, row) => n + budget(row.attachment), 0)
    if (total > this.policy.maxTotalBytes) fail('attachment_too_large', '任务累计附件超过总字节限制。')
    return { attachments: rows.map(row => ({ ...structuredClone(row.attachment), source, at })),
      consume: () => { for (const id of ids) this.uploads.delete(id) } }
  }

  async workerParts(sessionId, refs, signal = AbortSignal.timeout(120_000)) {
    if (!refs?.length) return []
    this.requireNative()
    const agent = this.ctx.get('agents')?.get?.(sessionId)
    if (!agent?.session || agent.session.header?.origin === 'subagent') fail('attachments_unsupported', '附件只能交给本任务的普通执行会话。')
    const parts = []
    try {
      for (const ref of refs) {
        signal.throwIfAborted()
        if (this.ctx.get('agents')?.get?.(sessionId) !== agent) fail('invalid_attachment', '执行会话已变化，附件未发送。')
        if (ref.kind === 'image') {
          const stored = await this.native.readImage(ref, signal)
          parts.push({ type: 'image', mediaType: stored.ref.mediaType, data: Buffer.from(stored.data).toString('base64'), name: ref.name })
        } else {
          const upload = await this.files.uploadStream({ sessionId, name: ref.name, data: this.native.readFileStream(ref, signal), signal })
          if (!upload || typeof upload.receiptId !== 'string') fail('invalid_attachment', '原生文件服务没有返回当前会话收据。')
          parts.push({ type: 'file', receiptId: upload.receiptId })
        }
      }
      if (this.ctx.get('agents')?.get?.(sessionId) !== agent) fail('invalid_attachment', '执行会话已变化，附件未发送。')
      return parts
    } catch (error) { throw publicFailure(error) }
  }

  async download(request) {
    this.requireNative()
    const params = new URL(request.url).searchParams
    if ([...params.keys()].some(key => !['taskId', 'attachmentId'].includes(key))) fail('invalid_attachment', '附件读取参数无效。')
    const task = this.store.get(params.get('taskId'))
    const id = params.get('attachmentId')
    const ref = ID.test(id ?? '') && task?.attachments?.find(item => item.attachmentId === id)
    if (!ref) fail('attachment_missing', '任务没有引用这个附件。')
    const headers = { 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "sandbox; default-src 'none'" }
    try {
      if (ref.kind === 'image') {
        const stored = await this.native.readImage(ref, request.signal)
        return new Response(stored.data, { headers: { ...headers, 'content-type': stored.ref.mediaType } })
      }
      const iterator = this.native.readFileStream(ref, request.signal)[Symbol.asyncIterator]()
      // Resolve the first native read before returning headers, so missing files
      // become a structured error rather than a misleading successful download.
      const first = await iterator.next()
      const body = new ReadableStream({
        start(controller) { if (first.done) controller.close(); else controller.enqueue(first.value) },
        async pull(controller) { try { const part = await iterator.next(); if (part.done) controller.close(); else controller.enqueue(part.value) } catch (error) { controller.error(error) } },
        async cancel() { await iterator.return?.() },
      })
      return new Response(body, { headers: { ...headers, 'content-type': 'application/octet-stream',
        'content-disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(attachmentName(ref.name)).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`)}` } })
    } catch (error) { throw publicFailure(error) }
  }
}

/** Registered separately so optional attachment services never deactivate the text board. */
export async function attachmentHttp(manager, request, connection) {
  const admission = connection.admit(request)
  if ('rejection' in admission || admission.peer.principal.kind !== 'owner') return Response.json({ ok: false, code: 'forbidden', message: 'Owner access required.' }, { status: 403 })
  try {
    if (request.method === 'GET') return await manager.download(request)
    if (request.method !== 'POST') return Response.json({ ok: false, code: 'invalid_request', message: 'Method not allowed.' }, { status: 405 })
    return Response.json({ ok: true, data: await manager.upload(request) }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const failure = publicFailure(error)
    return Response.json({ ok: false, code: failure.code, message: failure.message }, { status: failure.code === 'attachment_too_large' ? 413 : 400,
      headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } })
  }
}
