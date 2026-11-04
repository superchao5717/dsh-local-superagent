/**
 * Durable task ledger for the Local Superagent.
 *
 * One JSON file is the single source of truth (`board.json` inside the plugin's
 * state directory). Mutations are synchronous in memory and persisted by a
 * debounced atomic write, so a Host crash loses at most the last write window
 * and never leaves a half-written ledger. Bounded logs keep the file small.
 */
import { keepNewest, now, readJson, taskId, writeJsonAtomic } from './util.js'

export const SCHEMA = 1
export const STATUSES = ['queued', 'running', 'reviewing', 'needs_you', 'done', 'failed', 'cancelled']
export const OPEN_STATUSES = new Set(['queued', 'running', 'reviewing', 'needs_you'])

const DEFAULT_SETTINGS = { paused: false, maxWorkers: 2, autoReview: true }
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
    } : null,
    reviewRounds: asInt(raw.reviewRounds, 0, 0, 99),
    progress: keepNewest(progress, MAX_PROGRESS),
    log: keepNewest(log, MAX_LOG),
  }
}

function normalize(raw) {
  const settings = raw && typeof raw.settings === 'object' ? raw.settings : {}
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks.map(normalizeTask).filter(Boolean) : []
  return {
    schema: SCHEMA,
    revision: Number.isFinite(raw?.revision) ? raw.revision : 0,
    settings: {
      paused: settings.paused === true,
      maxWorkers: asInt(settings.maxWorkers, DEFAULT_SETTINGS.maxWorkers, 1, 4),
      autoReview: settings.autoReview !== false,
    },
    tasks,
    events: Array.isArray(raw?.events) ? keepNewest(raw.events.filter(event => event && typeof event.type === 'string'), MAX_EVENTS) : [],
    supervisors: Array.isArray(raw?.supervisors) ? raw.supervisors.filter(id => typeof id === 'string').slice(-10) : [],
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
    return { ...this.data.settings }
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
    this.data.supervisors = [...new Set(ids)].slice(-10)
    this.commit()
  }

  openCount() {
    return this.data.tasks.filter(task => OPEN_STATUSES.has(task.status)).length
  }

  add(input) {
    const at = now()
    const task = normalizeTask({
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
    Object.assign(task, patch, { updatedAt: now() })
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

  setSettings(patch) {
    const next = { ...this.data.settings }
    if (typeof patch.paused === 'boolean') next.paused = patch.paused
    if (patch.maxWorkers !== undefined) next.maxWorkers = asInt(patch.maxWorkers, next.maxWorkers, 1, 4)
    if (typeof patch.autoReview === 'boolean') next.autoReview = patch.autoReview
    this.data.settings = next
    this.commit()
    return { ...next }
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
