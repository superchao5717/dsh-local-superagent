/**
 * Model-selection helpers for the Local Superagent.
 *
 * A selection is the provider-owned route pair DSH uses for one request:
 * `{ provider, model, reasoningEffort? }`. The board stores two model settings:
 *  - `supervisor`: the one model the review Session runs on (null = DSH default);
 *  - `workers`: an ordered range of models the supervisor may choose from; the
 *    first entry is the default model for a fresh worker attempt (empty inherits
 *    the supervisor selection; both empty means the DSH deployment default).
 *
 * Everything here is pure data normalization so the ledger, the API, the model
 * tools and the browser half all agree on one shape.
 */

export const MAX_WORKER_MODELS = 8
const MAX_PROVIDER = 120
const MAX_MODEL = 200
const MAX_EFFORT = 60

const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''

/** Normalize one `{ provider, model, reasoningEffort? }` selection, or null. */
export function normalizeSelection(value) {
  if (!value || typeof value !== 'object') return null
  const provider = text(value.provider, MAX_PROVIDER)
  const model = text(value.model, MAX_MODEL)
  if (!provider || !model) return null
  const reasoningEffort = text(value.reasoningEffort, MAX_EFFORT)
  return { provider, model, ...(reasoningEffort ? { reasoningEffort } : {}) }
}

/** `provider/model`, the compact key used by settings and model tools. */
export function formatSelection(selection) {
  return selection ? `${selection.provider}/${selection.model}` : ''
}

/** Parse `provider/model` into a selection (reasoning effort is never implied). */
export function parseSelection(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  const slash = trimmed.indexOf('/')
  if (slash <= 0 || slash === trimmed.length - 1) return null
  return normalizeSelection({ provider: trimmed.slice(0, slash), model: trimmed.slice(slash + 1) })
}

/** Two selections route to the same provider/model pair (effort ignored). */
export function sameRoute(left, right) {
  return Boolean(left && right && left.provider === right.provider && left.model === right.model)
}

const selectionKey = selection => `${selection.provider}\u0000${selection.model}`

/** Normalize the whole model-settings block; dedupes the range and keeps order. */
export function normalizeModels(value) {
  const source = value && typeof value === 'object' ? value : {}
  const supervisor = normalizeSelection(source.supervisor)
  const seen = new Set()
  const workers = []
  for (const item of Array.isArray(source.workers) ? source.workers : []) {
    const selection = normalizeSelection(item)
    if (!selection) continue
    const key = selectionKey(selection)
    if (seen.has(key)) continue
    seen.add(key)
    workers.push(selection)
    if (workers.length >= MAX_WORKER_MODELS) break
  }
  return { supervisor, workers }
}

/** The default model for a fresh worker attempt: the first configured range entry. */
export function defaultWorkerModel(models) {
  const normalized = normalizeModels(models)
  return normalized.workers[0] ?? normalized.supervisor
}

export function effectiveWorkerModels(models) {
  const normalized = normalizeModels(models)
  return normalized.workers.length ? normalized.workers : normalized.supervisor ? [normalized.supervisor] : []
}

/** Whether `selection` is one of the configured worker-range entries (accepts the models block or the bare range). */
export function withinWorkerRange(models, selection) {
  if (!selection) return false
  const range = Array.isArray(models)
    ? normalizeModels({ workers: models }).workers
    : effectiveWorkerModels(models)
  return range.some(item => sameRoute(item, selection))
}

const trimModelEntry = model => {
  if (!model || typeof model !== 'object' || typeof model.id !== 'string' || !model.id) return null
  const reasoning = model.reasoning && typeof model.reasoning === 'object' ? model.reasoning : undefined
  const efforts = Array.isArray(reasoning?.efforts)
    ? reasoning.efforts
      .filter(effort => effort && typeof effort.id === 'string' && effort.id)
      .slice(0, 20)
      .map(effort => ({
        id: effort.id,
        name: typeof effort.name === 'string' && effort.name ? effort.name.slice(0, 120) : effort.id,
        ...(typeof effort.description === 'string' && effort.description ? { description: effort.description.slice(0, 300) } : {}),
      }))
    : []
  return {
    id: model.id.slice(0, MAX_MODEL),
    name: typeof model.name === 'string' && model.name ? model.name.slice(0, 200) : model.id.slice(0, MAX_MODEL),
    ...(typeof model.description === 'string' && model.description ? { description: model.description.slice(0, 300) } : {}),
    ...(efforts.length > 0
      ? {
          reasoning: {
            efforts,
            ...(typeof reasoning?.defaultEffort === 'string' && reasoning.defaultEffort
              ? { defaultEffort: reasoning.defaultEffort.slice(0, MAX_EFFORT) }
              : {}),
          },
        }
      : {}),
  }
}

/** Project the Host model catalog onto the compact shape the browser half needs. */
export function trimCatalog(value) {
  const source = value && typeof value === 'object' ? value : {}
  const groups = []
  for (const group of Array.isArray(source.groups) ? source.groups : []) {
    if (!group || typeof group !== 'object' || typeof group.id !== 'string' || !group.id) continue
    const models = (Array.isArray(group.models) ? group.models : []).map(trimModelEntry).filter(Boolean)
    if (!models.length) continue
    groups.push({
      id: group.id.slice(0, MAX_PROVIDER),
      name: typeof group.name === 'string' && group.name ? group.name.slice(0, 160) : group.id.slice(0, MAX_PROVIDER),
      models,
    })
    if (groups.length >= 20) break
  }
  const failures = (Array.isArray(source.failures) ? source.failures : [])
    .filter(item => item && typeof item === 'object')
    .slice(0, 10)
    .map(item => ({
      id: typeof item.id === 'string' ? item.id.slice(0, MAX_PROVIDER) : 'unknown',
      name: typeof item.name === 'string' ? item.name.slice(0, 160) : 'unknown',
      message: typeof item.message === 'string' ? item.message.slice(0, 400) : '',
    }))
  return {
    available: groups.length > 0,
    default: normalizeSelection(source.default),
    groups,
    failures,
  }
}
