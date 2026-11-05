/**
 * Durable task ledger for the Local Superagent.
 *
 * One JSON file is the single source of truth (`board.json` inside the plugin's
 * state directory). Mutations are synchronous in memory and persisted by a
 * debounced atomic write, so a Host crash loses at most the last write window
 * and never leaves a half-written ledger. Bounded logs keep the file small.
 */
import { keepNewest, now, readJson, taskId, writeJsonAtomic } from './util.js'
import { normalizeModels, normalizeSelection } from './models.js'
import { normalizeAttachment } from './attachments.js'

export const SCHEMA = 3
export const STATUSES = ['queued', 'running', 'reviewing', 'needs_you', 'done', 'failed', 'cancelled']
export const OPEN_STATUSES = new Set(['queued', 'running', 'reviewing', 'needs_you'])

/** Detached copy of one selection (the ledger must never leak internal rows). */
const copySelection = selection => selection ? { ...selection } : null
const MAX_PROGRESS = 8
const MAX_LOG = 60
const MAX_EVENTS = 200
const SAVE_DEBOUNCE_MS = 150

const asInt = (value, fallback, min, max) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback
}

/** Coerce a loaded task row into the current shape; drops unusable rows. */
function normalizeTask(raw) {
  if (!raw || typeof raw !== 'object') return undefined
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.goal !== 'string') return undefined
  const status = STATUSES.includes(raw.status) ? raw.status : 'queued'
  const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : now()
  const progress = Array.isArray(raw.progress)
    ? raw.progress.filter(entry => entry && typeof entry.text === 'string').map(entry => ({
        at: Number.isFinite(entry.at) ? entry.at : createdAt,
        text: String(entry.text).slice(0, 400),
      }))
    : []
  const log = Array.isArray(raw.log)
    ? raw.log.filter(entry => entry && typeof entry.text === 'string').map(entry => ({
        at: Number.isFinite(entry.at) ? entry.at : createdAt,
        kind: typeof entry.kind === 'string' ? entry.kind : 'event',
        text: String(entry.text).slice(0, 800),
      }))
    : []
  return {
    id: raw.id,
    superagentId: typeof raw.superagentId === 'string' ? raw.superagentId : '',
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normalizeAttachment).filter(Boolean) : [],
    autonomy: raw.autonomy && typeof raw.autonomy === 'object' ? { ...raw.autonomy } : { attempted: false },
    pendingInput: raw.pendingInput ?? null,
    autonomyReview: raw.autonomyReview ?? null,
    reviewEpoch: Number.isSafeInteger(raw.reviewEpoch) ? raw.reviewEpoch : 0,
    workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId : '',
    workspaceTitle: typeof raw.workspaceTitle === 'string' ? raw.workspaceTitle : '',
    workspacePath: typeof raw.workspacePath === 'string' ? raw.workspacePath : '',
    title: raw.title.slice(0, 200),
    goal: raw.goal.slice(0, 8000),
    acceptance: typeof raw.acceptance === 'string' ? raw.acceptance.slice(0, 4000) : '',
    priority: asInt(raw.priority, 2, 1, 3),
    status,
    createdAt,
    updatedAt: Number.isFinite(raw.updatedAt) ? raw.updatedAt : createdAt,
    attempts: asInt(raw.attempts, 0, 0, 99),
    startedAt: Number.isFinite(raw.startedAt) ? raw.startedAt : null,
    finishedAt: Number.isFinite(raw.finishedAt) ? raw.finishedAt : null,
    workerSessionId: typeof raw.workerSessionId === 'string' ? raw.workerSessionId : '',
    workerModel: normalizeSelection(raw.workerModel),
    report: raw.report && typeof raw.report === 'object' ? {
      state: ['ready', 'needs_decision', 'blocked', 'failed'].includes(raw.report.state) ? raw.report.state : 'ready',
      summary: typeof raw.report.summary === 'string' ? raw.report.summary.slice(0, 1200) : '',
      deliverables: Array.isArray(raw.report.deliverables) ? raw.report.deliverables.filter(item => typeof item === 'string').slice(0, 20) : [],
      ...(typeof raw.report.question === 'string' ? { question: raw.report.question.slice(0, 800) } : {}),
      at: Number.isFinite(raw.report.at) ? raw.report.at : createdAt,
    } : null,
    review: raw.review && typeof raw.review === 'object' ? {
      verdict: ['done', 'continue', 'needs_you', 'fail'].includes(raw.review.verdict) ? raw.review.verdict : 'done',
      note: typeof raw.review.note === 'string' ? raw.review.note.slice(0, 500) : '',
      at: Number.isFinite(raw.review.at) ? raw.review.at : createdAt,
    } : null,
    question: raw.question && typeof raw.question.text === 'string' ? {
      text: raw.question.text.slice(0, 800),
      at: Number.isFinite(raw.question.at) ? raw.question.at : createdAt,
      requiresHuman: raw.question.requiresHuman !== false,
    } : null,
    reviewRounds: asInt(raw.reviewRounds, 0, 0, 99),
    progress: keepNewest(progress, MAX_PROGRESS),
    log: keepNewest(log, MAX_LOG),
  }
}

export function normalizeSettings(settings = {}) {
  settings = settings && typeof settings === 'object' ? settings : {}
  return { paused: settings.paused === true, maxWorkers: asInt(settings.maxWorkers, 2, 1, 4),
    autoReview: settings.autoReview !== false, models: normalizeModels(settings.models),
    autonomy: { enabled: settings.autonomy?.enabled === true, waitMinutes: asInt(settings.autonomy?.waitMinutes, 30, 1, 1440) } }
}
function normalize(raw) {
  const settings = normalizeSettings(raw?.settings)
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks.map(normalizeTask).filter(Boolean) : []
  // Only board.settings is authoritative. Preserve former per-agent values as
  // audit data, never as active configuration or a new-agent snapshot.
  const superagents = Array.isArray(raw?.superagents) ? raw.superagents
    .filter(a => a && typeof a.id === 'string' && typeof a.workspaceId === 'string')
    .map(({ settings: legacy, ...agent }) => ({
      ...agent,
      ...(!('legacySettings' in agent) && legacy !== undefined ? { legacySettings: structuredClone(legacy) } : {}),
    })) : []
  const settingsMigration = raw?.settingsMigration ?? (raw && (raw.schema ?? 1) < SCHEMA ? {
    fromSchema: raw.schema ?? 1, toSchema: SCHEMA, at: now(), settingsSource: 'board.settings',
    message: 'Settings are now global for all Superagents. The prior board.settings template is authoritative; former per-supervisor settings are retained in legacySettings for audit only. maxWorkers remains a per-supervisor limit.',
  } : null)
  for (const task of tasks) {
    if (!superagents.some(a => a.id === task.superagentId && a.workspaceId === task.workspaceId)) {
      let agent = superagents.find(a => a.workspaceId === task.workspaceId && !a.deletedAt)
      if (!agent) { agent = { id: `sa-default-${encodeURIComponent(task.workspaceId)}`, workspaceId: task.workspaceId, title: task.workspaceTitle || '默认主管' }; superagents.push(agent) }
      task.superagentId = agent.id
    }
  }
  return {
    schema: SCHEMA,
    superagents,
    revision: Number.isFinite(raw?.revision) ? raw.revision : 0,
    settings,
    settingsMigration,
    tasks,
    events: Array.isArray(raw?.events) ? keepNewest(raw.events.filter(event => event && typeof event.type === 'string'), MAX_EVENTS) : [],
    supervisors: Array.isArray(raw?.supervisors) ? raw.supervisors.filter(id => typeof id === 'string') : [],
  }
}

export class Store {
  /** @param {{ file: string, log?: (message: string) => void }} options */
  constructor({ file, log = () => {} }) {
    this.file = file
    /** Diagnostic sink; named `debug` so the `log()` task-log method is not shadowed. */
    this.debug = log
    this.data = normalize(undefined)
    this.saveTimer = null
    this.saving = Promise.resolve()
    this.closed = false
  }

  async load() {
    this.data = normalize(await readJson(this.file, undefined, this.debug))
    return this
  }

  get settings() {
    const settings = this.data.settings
    return {
      ...settings,
      autonomy: { ...settings.autonomy },
      models: {
        supervisor: copySelection(settings.models.supervisor),
        workers: settings.models.workers.map(item => ({ ...item })),
      },
    }
  }

  /** All tasks, most recently updated first. */
  list() {
    return [...this.data.tasks].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  get(id) {
    return this.data.tasks.find(task => task.id === id)
  }

  count(status) {
    return this.data.tasks.filter(task => task.status === status).length
  }

  /** Supervisor Session ids seen by earlier plugin generations (archived on start). */
  get supervisors() {
    return [...this.data.supervisors]
  }

  set supervisors(ids) {
    this.data.supervisors = [...new Set(ids)]
    this.commit()
  }

  openCount() {
    return this.data.tasks.filter(task => OPEN_STATUSES.has(task.status)).length
  }

  add(input) {
    const at = now()
    const agent = input.superagentId ? this.superagent(input.superagentId) : this.ensureDefault(input.workspaceId, input.workspaceTitle)
    const task = normalizeTask({
      superagentId: agent.id,
      attachments: input.attachments,
      id: taskId(),
      workspaceId: input.workspaceId,
      workspaceTitle: input.workspaceTitle,
      workspacePath: input.workspacePath,
      title: input.title,
      goal: input.goal,
      acceptance: input.acceptance ?? '',
      priority: input.priority ?? 2,
      status: 'queued',
      createdAt: at,
      updatedAt: at,
      attempts: 0,
      workerSessionId: `sa-task-${at.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    })
    if (!task) throw new Error('invalid task input: title and goal are required')
    this.data.tasks.push(task)
    this.progress(task, '已接单，等待空闲执行位')
    this.commit()
    return task
  }

  update(id, patch) {
    const task = this.get(id)
    if (!task) return undefined
    const next = 'workerModel' in patch ? { ...patch, workerModel: normalizeSelection(patch.workerModel) } : patch
    const invalidatesReview = ['status', 'report', 'question', 'pendingInput', 'autonomyReview'].some(key => key in patch)
    Object.assign(task, next, { updatedAt: now(), reviewEpoch: task.reviewEpoch + (invalidatesReview ? 1 : 0) })
    this.commit()
    return task
  }

  progress(taskOrId, text) {
    const task = typeof taskOrId === 'string' ? this.get(taskOrId) : taskOrId
    if (!task) return
    task.progress.push({ at: now(), text: String(text).slice(0, 400) })
    task.progress = keepNewest(task.progress, MAX_PROGRESS)
  }

  log(id, kind, text) {
    const task = this.get(id)
    if (!task) return
    task.log.push({ at: now(), kind, text: String(text).slice(0, 800) })
    task.log = keepNewest(task.log, MAX_LOG)
    task.updatedAt = now()
    this.commit()
  }

  event(type, data = {}) {
    this.data.events.push({ at: now(), type, data })
    this.data.events = keepNewest(this.data.events, MAX_EVENTS)
    this.commit()
  }

  superagent(id) { return this.data.superagents.find(a => a.id === id) }
  superagents() { return this.data.superagents.filter(a => !a.deletedAt) }
  ensureDefault(workspaceId, title) {
    return this.superagents().find(a => a.workspaceId === workspaceId) ?? this.addSuperagent(workspaceId, title || '默认主管')
  }
  addSuperagent(workspaceId, title) {
    const agent = { id: `agent-${taskId().slice(3)}`, workspaceId, title }
    this.data.superagents.push(agent); this.commit(); return agent
  }
  /** Compatibility read alias: configuration is always global, regardless of id. */
  settingsFor(_id) { return this.settings }
  setSettings(patch, superagentId) {
    if (superagentId !== undefined) throw new Error('settings_scope_changed: settings are global; omit superagentId')
    const next = this.settings
    if (typeof patch.paused === 'boolean') next.paused = patch.paused
    if (patch.maxWorkers !== undefined) next.maxWorkers = asInt(patch.maxWorkers, next.maxWorkers, 1, 4)
    if (typeof patch.autoReview === 'boolean') next.autoReview = patch.autoReview
    if (patch.models !== undefined) next.models = normalizeModels(patch.models)
    if (patch.autonomy !== undefined) next.autonomy = normalizeSettings({ autonomy: { ...next.autonomy, ...patch.autonomy } }).autonomy
    this.data.settings = next
    this.commit()
    return this.settings
  }

  remove(id) {
    const index = this.data.tasks.findIndex(task => task.id === id)
    if (index < 0) return false
    this.data.tasks.splice(index, 1)
    this.commit()
    return true
  }

  /** Mark the ledger changed and schedule one debounced atomic write. */
  commit() {
    this.data.revision += 1
    if (this.closed) return
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      void this.flush()
    }, SAVE_DEBOUNCE_MS)
    this.saveTimer.unref?.()
  }

  /** Serialize and write the ledger now; concurrent flushes queue up. */
  flush() {
    const snapshot = JSON.parse(JSON.stringify(this.data))
    this.saving = this.saving
      .then(() => writeJsonAtomic(this.file, snapshot))
      .catch(error => this.debug(`could not persist the task ledger: ${String(error)}`))
    return this.saving
  }

  async close() {
    this.closed = true
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    await this.flush()
  }
}
