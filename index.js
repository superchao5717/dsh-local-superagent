/**
 * Local Superagent - Host half.
 *
 * A local, non-Git task board: the user places tasks in their own DSH
 * workspaces, this plugin dispatches each task to its own worker Session,
 * reviews the worker's report through one supervisor Session, and only asks the
 * user when a decision is genuinely needed.
 *
 * Files:
 *  - lib/store.js     durable JSON ledger (the single source of truth)
 *  - lib/sessions.js  worker/supervisor DSH Session creation and decoration
 *  - lib/engine.js    scheduling, worker lifecycle, reviews, recovery
 *  - lib/prompts.js   role prompts and message formats
 *  - lib/tools.js     the worker report tool and the supervisor review tools
 *  - lib/api.js       same-origin JSON operations for the Client half
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { Api } from './lib/api.js'
import { Engine } from './lib/engine.js'
import { Sessions } from './lib/sessions.js'
import { Store } from './lib/store.js'

export const name = 'dsh-local-superagent'

/** Host services this plugin must have; the plugin stays inactive without them. */
export const inject = ['connection']

const VERSION = '0.4.0'
const ROUTE = '/api/local-superagent/invoke'

const json = (value, status = 200) => Response.json(value, {
  status,
  headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
})

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {{ stateDir?: string, maxTaskMinutes?: number } | undefined} config
 */
export function apply(ctx, config) {
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const stateDir = config?.stateDir ?? join(dshHome, 'state', 'local-superagent')
  const log = (message) => {
    try {
      ctx.logger?.info?.('local-superagent: %s', message)
    } catch {
      console.log(`[local-superagent] ${message}`)
    }
  }

  const store = new Store({ file: join(stateDir, 'board.json'), log })
  const sessions = new Sessions({ ctx, log })
  const engine = new Engine({ ctx, store, sessions, log, config })
  engine.version = VERSION
  engine.stateDir = stateDir
  // Process-global holder: Sessions outlive plugin reloads, so their tools and
  // decoration helpers resolve the live engine through this object. It is only
  // published after the ledger is loaded, so a tool call during a reload can
  // never hit a half-initialised engine.
  const shared = globalThis.__dshLocalSuperagent ??= { disposers: new Map() }
  shared.engine = undefined
  const api = new Api({ engine, log })

  // Boot once: load the ledger, then start listening for worker completions.
  const ready = (async () => {
    await store.load()
    await engine.start()
    shared.engine = engine
    log(`ready (${store.list().length} task(s), state ${stateDir})`)
  })().catch(error => {
    log(`startup failed: ${String(error)}`)
  })

  ctx.effect(() => {
    const dispose = ctx.connection.fetch.register({
      path: ROUTE,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        const admission = ctx.connection.admit(request)
        if ('rejection' in admission || admission.peer.principal.kind !== 'owner') {
          return json({ ok: false, code: 'forbidden', message: 'Owner access required.' }, 403)
        }
        let args
        try {
          args = await request.json()
        } catch {
          return json({ ok: false, code: 'invalid_request', message: 'Invalid JSON body.' }, 400)
        }
        await ready
        return json(await api.handle(args))
      },
    })
    return () => {
      try {
        dispose?.()
      } catch (error) {
        log(`could not remove the API route: ${String(error)}`)
      }
      engine.stop()
      if (shared.engine === engine) shared.engine = undefined
      void store.close()
    }
  })

  // The board as an agent tool: any Session in this profile can read the board
  // or place a task the user explicitly asked for from chat. Answering a
  // `needs_you` question stays a UI-only action, because it grants authority.
  ctx.inject(['tools'], toolsCtx => {
    toolsCtx.effect(() => toolsCtx.tools.register({
      name: 'local_superagent',
      description: 'Local Superagent board (a Host-side task board whose supervisor dispatches and reviews tasks on its own). action=board returns the current tasks and counts. action=add_task creates one task in a DSH workspace, which the superagent will dispatch automatically; only use it when the user explicitly asked to place a task. action=task returns one task detail. This tool cannot answer a needs_you question: that stays a user decision in the UI.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['board', 'add_task', 'task'] },
          superagentId: { type: 'string', description: 'explicit supervisor id; required if workspace has multiple supervisors' },
          workspaceId: { type: 'string', description: 'target DSH workspace id (see board workspaces)' },
          title: { type: 'string', description: 'short task title' },
          goal: { type: 'string', description: 'what must be done; concrete and self-contained' },
          acceptance: { type: 'string', description: 'how to verify the result' },
          priority: { type: 'number', enum: [1, 2, 3], description: '1 low, 2 normal, 3 high' },
          taskId: { type: 'string', description: 'task id for action=task' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      execute: async args => {
        if (args.action === 'board') {
          const result = await api.handle({ action: 'board' })
          if (!result.ok) return result
          const board = result.data
          return {
            settings: board.settings,
            settingsScope: board.settingsScope,
            settingsMigration: board.settingsMigration,
            live: board.live,
            workspaces: board.workspaces,
            superagents: board.superagents,
            tasks: board.tasks.map(task => ({
              id: task.id,
              superagentId: task.superagentId,
              title: task.title,
              status: task.status,
              workspace: task.workspaceTitle,
              priority: task.priority,
              attempts: task.attempts,
              question: task.question?.text ?? null,
              report: task.report ? `${task.report.state}: ${task.report.summary}` : null,
              review: task.review ? `${task.review.verdict}: ${task.review.note}` : null,
            })),
          }
        }
        if (args.action === 'task') return api.handle({ action: 'task.get', id: args.taskId })
        if (args.action === 'add_task') {
          if (!args.workspaceId || !args.title || !args.goal) {
            return { ok: false, code: 'invalid_request', message: 'workspaceId, title and goal are required' }
          }
          const result = await api.handle({
            action: 'task.add',
            workspaceId: args.workspaceId,
            superagentId: args.superagentId,
            title: args.title,
            goal: args.goal,
            acceptance: args.acceptance,
            priority: args.priority,
          })
          if (!result.ok) return result
          return { ok: true, task: result.data.task, note: 'task created; the superagent dispatches it automatically' }
        }
        return { ok: false, code: 'unknown_action' }
      },
      isConcurrencySafe: args => args?.action === 'board' || args?.action === 'task',
    }))
  })
}
