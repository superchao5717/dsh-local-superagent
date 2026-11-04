/**
 * Shared fixtures for the Local Superagent tests.
 *
 * Only this `test/` directory is touched: every temporary directory is created
 * under `test/` and removed by the test file that created it.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

export async function makeTempDir(prefix = 'tmp-') {
  return mkdtemp(join(here, `.lsa-${prefix}`))
}

export async function cleanupDir(dir) {
  if (!dir) return
  await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 20 })
}

/** Minimal fake DSH-like context. Unknown services return undefined. */
export function fakeCtx({ workspaces = [], agents = new Map(), services = {} } = {}) {
  const listeners = new Map()
  return {
    listeners,
    on(event, listener) {
      const list = listeners.get(event) ?? []
      list.push(listener)
      listeners.set(event, list)
      return () => {
        const current = listeners.get(event) ?? []
        const index = current.indexOf(listener)
        if (index >= 0) current.splice(index, 1)
      }
    },
    get(service) {
      if (service === 'workspaceRegistry') {
        return {
          list: () => workspaces,
          create: async (path, title) => ({ id: 'w-created', path, title: title ?? path }),
        }
      }
      if (service === 'agents') {
        return { get: id => agents.get(id), list: () => [...agents.values()] }
      }
      if (service === 'workingDirectory') return { defaultDirectory: 'D:\\ws' }
      return services[service]
    },
    emit(event, payload) {
      for (const listener of [...(listeners.get(event) ?? [])]) listener(payload)
    },
    listenerCount(event) {
      return (listeners.get(event) ?? []).length
    },
  }
}

/** Minimal fake Sessions implementation; every call is recorded in `calls`. */
export function fakeSessions(overrides = {}) {
  const calls = []
  const base = {
    start: async () => { calls.push({ name: 'start' }) },
    stop: () => { calls.push({ name: 'stop' }) },
    status: () => 'idle',
    ensure: async options => {
      calls.push({ name: 'ensure', sessionId: options.sessionId, options })
      return { id: options.sessionId, status: 'idle' }
    },
    prompt: async (sessionId, requestId, text, mode) => {
      calls.push({ name: 'prompt', sessionId, requestId, text, mode })
    },
    cancel: sessionId => {
      calls.push({ name: 'cancel', sessionId })
      return true
    },
    isLive: () => true,
    waitIdle: async () => 'idle',
    turnInfo: () => ({ turnEndAt: undefined, lastAssistantAt: undefined }),
    lastAssistantText: () => '',
    lastTurnEnd: () => undefined,
    supervisorTitle: () => 'Supervisor',
  }
  return Object.assign(base, overrides, { calls })
}

export async function waitFor(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return true
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  return predicate()
}
