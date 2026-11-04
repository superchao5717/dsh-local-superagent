import test from 'node:test'
import assert from 'node:assert/strict'
import { Sessions } from '../lib/sessions.js'
import { fakeCtx } from './support.js'

/**
 * Minimal Agent stand-in: `ctx.on` records routing listeners so a test can run
 * the request waterfall by hand, and `session.append` records durable events.
 */
function fakeAgent(id = 'sa-task-1') {
  const listeners = new Map()
  const appended = []
  const agent = {
    id,
    session: {
      append: (type, data) => { appended.push({ type, data }) },
    },
    ctx: {
      on(name, listener, options) {
        const list = listeners.get(name) ?? []
        list.push({ listener, options })
        listeners.set(name, list)
        return () => {
          const current = listeners.get(name) ?? []
          const index = current.findIndex(item => item.listener === listener)
          if (index >= 0) current.splice(index, 1)
        }
      },
      get(service) {
        if (service === 'tools') return { register: () => () => {} }
        return undefined
      },
    },
  }
  return { agent, listeners, appended }
}

function makeSessions(agents) {
  const ctx = fakeCtx({ agents })
  const logs = []
  const sessions = new Sessions({ ctx, log: message => logs.push(message) })
  sessions.shared = { disposers: new Map() }
  return { sessions, ctx, logs }
}

/** Run one request waterfall: the innermost next returns the deployment default. */
async function routeRequest(entries, base) {
  const stack = entries.map(item => item.listener).reverse()
  let index = 0
  const next = async () => {
    const listener = stack[index]
    index += 1
    if (!listener) return { ...base }
    return listener({}, next)
  }
  return next()
}

test('sessions: a configured model wins over the deployment default route', async () => {
  const { agent, listeners, appended } = fakeAgent()
  const agents = new Map([[agent.id, agent]])
  const { sessions } = makeSessions(agents)
  sessions.describe(agent.id, {
    role: 'worker',
    systemPrompt: 'prompt',
    tools: [],
    model: { provider: 'p', model: 'smart', reasoningEffort: 'high' },
  })
  sessions.decorate(agent)
  sessions.applyModel(agent.id, { provider: 'p', model: 'smart', reasoningEffort: 'high' })

  const requests = listeners.get('agent/request')
  assert.ok(requests && requests.length === 1)
  assert.deepEqual(requests[0].options, { prepend: true })
  const routed = await routeRequest(requests, {
    provider: 'deepseek-account',
    model: 'deepseek-flash',
    reasoningEffort: 'max',
  })
  assert.deepEqual(routed, { provider: 'p', model: 'smart', reasoningEffort: 'high' })

  // The system-prompt variables follow the same route.
  const assemblies = listeners.get('system-prompt/assemble')
  assert.ok(assemblies && assemblies.length === 1)
  let inner = 0
  const assembleNext = async () => {
    inner += 1
    if (inner > 1) return { variables: { cwd: 'D:\\ws' } }
    const listener = assemblies[0].listener
    return listener({}, {}, assembleNext)
  }
  const assembled = await assembleNext()
  assert.deepEqual(assembled.variables, { cwd: 'D:\\ws', provider: 'p', model: 'smart' })

  assert.deepEqual(appended[0], {
    type: 'model/selection',
    data: { provider: 'p', model: 'smart', reasoningEffort: 'high' },
  })
  // Re-applying the same model records nothing new.
  sessions.applyModel(agent.id, { provider: 'p', model: 'smart', reasoningEffort: 'high' })
  assert.equal(appended.length, 1)
})

test('sessions: changing or clearing the model retargets the next request', async () => {
  const { agent, listeners, appended } = fakeAgent('sa-task-2')
  const agents = new Map([[agent.id, agent]])
  const { sessions } = makeSessions(agents)
  sessions.describe(agent.id, { role: 'worker', systemPrompt: 'p', tools: [], model: { provider: 'p', model: 'fast' } })
  sessions.decorate(agent)

  sessions.applyModel(agent.id, { provider: 'q', model: 'big' })
  assert.deepEqual(appended.at(-1).data, { provider: 'q', model: 'big' })
  const routed = await routeRequest(listeners.get('agent/request'), { provider: 'p', model: 'fast', reasoningEffort: 'low' })
  assert.deepEqual(routed, { provider: 'q', model: 'big' })

  // Clearing the setting falls back to the deployment route, without an event.
  sessions.applyModel(agent.id, null)
  assert.equal(appended.length, 1)
  assert.deepEqual(await routeRequest(listeners.get('agent/request'), { provider: 'default', model: 'default' }), {
    provider: 'default',
    model: 'default',
  })
})

test('sessions: ensure carries the model into the spec for a Session that is created later', async () => {
  const { agent } = fakeAgent('sa-task-3')
  const agents = new Map()
  const { sessions } = makeSessions(agents)
  const created = []
  const ctx = sessions.ctx
  ctx.get = service => {
    if (service === 'agents') return { get: id => agents.get(id), create: async options => {
      created.push(options)
      return { agent }
    } }
    if (service === 'sessionController') {
      return {
        create: async () => { agents.set(agent.id, agent) },
        resolveAgent: async () => ({ agent }),
        rename: async () => {},
      }
    }
    return undefined
  }
  await sessions.ensure({
    sessionId: agent.id,
    role: 'worker',
    cwd: 'D:\\ws',
    title: 'T',
    model: { provider: 'p', model: 'smart' },
  })
  assert.deepEqual(sessions.specs.get(agent.id).model, { provider: 'p', model: 'smart' })
  assert.ok(sessions.decorated.has(agent.id))
  assert.equal(created.length, 0, 'the session controller path is preferred over direct creation')
})
