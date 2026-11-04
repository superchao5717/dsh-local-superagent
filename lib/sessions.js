/**
 * DSH Session plumbing for the Local Superagent.
 *
 * Creates two kinds of Sessions through the live Host services and decorates
 * each one before its first turn:
 *  - worker:     one persistent Session per task, pinned to the task workspace;
 *  - supervisor: one persistent Session that only reviews worker reports.
 *
 * Decoration registers the role's system prompt, its tools, and its tool policy.
 * Everything is registered on the agent's own context, so disposing the agent
 * removes it; the disposers are also tracked here for plugin shutdown.
 */
import { SUPERVISOR_TITLE, supervisorSystemPrompt, workerSystemPrompt, workerTitle } from './prompts.js'

/** Tools a worker may not use; the alternative is reporting the need instead. */
const WORKER_DENY = new Set([
  'ask_user_question',
  'present',
  'exit_plan_mode',
  'create_goal',
  'update_goal',
  'goal',
  'schedule_create',
  'schedule_update',
  'schedule_delete',
  'plugin_manager',
  'spawn_teammate',
  'team_task_create',
  'team_task_update',
  'workflow',
  'local_superagent',
])

export class Sessions {
  /** @param {{ ctx: any, log: (message: string) => void }} options */
  constructor({ ctx, log }) {
    this.ctx = ctx
    this.log = log
    this.specs = new Map()
    this.decorated = new Map()
    this.preset = undefined
    this.listener = undefined
  }

  /** Learn which agent preset new Sessions should use, then listen for new agents. */
  async start() {
    // A previous plugin instance in this Host may have left registrations on
    // still-live agent contexts (the Host keeps our Sessions alive across a
    // plugin reload). Dispose those first so every tool and prompt belongs to
    // this instance.
    const shared = globalThis.__dshLocalSuperagent ??= { disposers: new Map() }
    for (const [id, disposers] of shared.disposers) {
      shared.disposers.delete(id)
      for (const dispose of disposers.splice(0).reverse()) {
        try {
          dispose()
        } catch {
          /* a stale registration may already be gone */
        }
      }
    }
    this.shared = shared
    const presets = this.ctx.get('agentPresets')
    if (presets?.list) {
      try {
        const list = await presets.list()
        const ids = new Set((list ?? []).map(item => item.id ?? item.agentPreset).filter(Boolean))
        this.preset = ids.has('standard') ? 'standard' : undefined
      } catch (error) {
        this.log(`could not read the agent preset registry: ${String(error)}`)
      }
    }
    this.listener = this.ctx.on('agent/created', ({ agent }) => {
      try {
        this.decorate(agent)
      } catch (error) {
        this.log(`could not decorate Session ${agent.id}: ${String(error)}`)
      }
    })
    this.ctx.on('agent/disposed', ({ agent }) => {
      const disposers = this.decorated.get(agent.id)
      if (!disposers) return
      this.decorated.delete(agent.id)
      this.shared.disposers.delete(agent.id)
      for (const dispose of disposers.splice(0).reverse()) {
        try {
          dispose()
        } catch {
          /* disposal must not fail the Host */
        }
      }
      this.specs.delete(agent.id)
    })
  }

  stop() {
    for (const [id, disposers] of this.decorated) {
      this.decorated.delete(id)
      this.shared?.disposers.delete(id)
      for (const dispose of disposers.splice(0).reverse()) {
        try {
          dispose()
        } catch {
          /* ignore */
        }
      }
    }
  }

  /** Register the spec a Session should be decorated with before it is created. */
  describe(sessionId, spec) {
    this.specs.set(sessionId, spec)
  }

  /** Base spec for a role; the caller may override the tools. */
  specFor(role) {
    if (role === 'supervisor') {
      return {
        role,
        systemPrompt: supervisorSystemPrompt(),
        tools: [],
        allow: ['superagent_board_read', 'superagent_review'],
      }
    }
    return {
      role: 'worker',
      systemPrompt: workerSystemPrompt(),
      tools: [],
      deny: WORKER_DENY,
    }
  }

  /**
   * Resolve or create the Session `sessionId`, pin its workspace, permission and
   * preset, rename it, and decorate it.
   *
   * @param {{ sessionId: string, role: 'worker' | 'supervisor', workspaceId?: string,
   *   cwd?: string, title: string, tools?: object[], allow?: string[], deny?: Set<string> }} options
   * @returns {Promise<any>} the live Agent
   */
  async ensure(options) {
    const { sessionId, role, workspaceId, cwd, title } = options
    const base = this.specFor(role)
    this.describe(sessionId, {
      role,
      systemPrompt: base.systemPrompt,
      tools: options.tools ?? base.tools,
      ...(options.allow ?? base.allow ? { allow: options.allow ?? base.allow } : {}),
      ...(options.deny ?? base.deny ? { deny: options.deny ?? base.deny } : {}),
    })

    const agents = this.ctx.get('agents')
    let agent = agents?.get?.(sessionId)
    const controller = this.ctx.get('sessionController')
    if (!agent && controller) {
      try {
        const resolved = await controller.resolveAgent(sessionId)
        if (resolved && !resolved.error) agent = resolved.agent
      } catch {
        /* not an existing Session: create it below */
      }
      if (!agent) {
        try {
          await controller.create({
            sessionId,
            ...(workspaceId ? { workspaceId } : {}),
            ...(!workspaceId && cwd ? { cwd } : {}),
            ...(this.preset ? { agentPreset: this.preset } : {}),
          })
        } catch (error) {
          this.log(`Session creation failed for ${sessionId}: ${String(error)}`)
        }
        try {
          const resolved = await controller.resolveAgent(sessionId)
          if (resolved && !resolved.error) agent = resolved.agent
        } catch (error) {
          this.log(`Session resume failed for ${sessionId}: ${String(error)}`)
        }
      }
    }
    if (!agent) {
      // Fallback for a Host without the session controller Remote: create through the agent loop.
      try {
        const handle = await agents.create({
          sessionId,
          meta: { ...(cwd ? { cwd } : {}), ...(this.preset ? { agentPreset: this.preset } : {}) },
          setup: (_agentCtx, created) => {
            this.decorate(created)
          },
        })
        agent = handle.agent
      } catch (error) {
        this.log(`agent creation failed for ${sessionId}: ${String(error)}`)
      }
    }
    if (!agent) throw new Error(`无法创建执行会话 ${sessionId}`)

    this.decorate(agent)
    try {
      this.ctx.get('permissionPresets')?.set?.(agent.session, 'danger-full-access')
    } catch (error) {
      this.log(`could not pin permissions on ${sessionId}: ${String(error)}`)
    }
    try {
      await controller?.rename?.({ sessionId, title })
    } catch {
      /* renaming is cosmetic */
    }
    return agent
  }

  /** Register the prompt, tools and policy for a live agent (idempotent). */
  decorate(agent) {
    if (this.decorated.has(agent.id)) return
    const spec = this.specs.get(agent.id)
    if (!spec) return
    const disposers = []
    try {
      disposers.push(agent.ctx.get('systemPrompt')?.section({
        name: `local-superagent-${spec.role}`,
        order: 950,
        text: spec.systemPrompt,
      }))
    } catch (error) {
      this.log(`could not add the ${spec.role} prompt to ${agent.id}: ${String(error)}`)
    }
    const tools = agent.ctx.get('tools')
    for (const tool of spec.tools) {
      try {
        disposers.push(tools?.register(tool))
      } catch (error) {
        this.log(`could not register tool ${tool.name} on ${agent.id}: ${String(error)}`)
      }
    }
    if (spec.allow) {
      try {
        disposers.push(tools?.restrict({ allow: spec.allow }))
      } catch (error) {
        this.log(`could not restrict the tools of ${agent.id}: ${String(error)}`)
      }
    } else if (spec.deny) {
      const deny = spec.deny
      try {
        disposers.push(tools?.guard(execution => deny.has(execution.name)
          ? '本地 Superagent 的执行会话只能通过 superagent_report 把需要人决定的事交出去；不要直接向用户提问。'
          : undefined))
      } catch (error) {
        this.log(`could not guard the tools of ${agent.id}: ${String(error)}`)
      }
    }
    this.decorated.set(agent.id, disposers.filter(Boolean))
    this.shared?.disposers.set(agent.id, disposers.filter(Boolean))
  }

  /** Queue one user message into the Session. */
  async prompt(sessionId, requestId, text, mode = 'queue') {
    const controller = this.ctx.get('sessionController')
    if (!controller?.prompt) throw new Error('session controller unavailable')
    await controller.prompt(
      { sessionId, requestId, mode, content: [{ type: 'text', text }] },
      AbortSignal.timeout(30_000),
    )
  }

  /** Cancel the running turn of a Session, keeping its history. */
  cancel(sessionId) {
    const agent = this.ctx.get('agents')?.get?.(sessionId)
    if (!agent) return false
    try {
      agent.cancel?.({ kind: 'user' }, { keepInbox: false })
      return true
    } catch (error) {
      this.log(`could not cancel ${sessionId}: ${String(error)}`)
      return false
    }
  }

  /** Text of the newest assistant message in the Session, or ''. */
  lastAssistantText(agent) {
    const events = agent?.session?.snapshotEvents?.() ?? []
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (event?.type !== 'assistant/message') continue
      const blocks = event.data?.message?.content ?? []
      const text = blocks.filter(block => block?.type === 'text').map(block => block.text).join('\n').trim()
      if (text) return text
    }
    return ''
  }

  /** Reason kind of the newest `turn/end`, or undefined. */
  lastTurnEnd(agent) {
    const events = agent?.session?.snapshotEvents?.() ?? []
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (event?.type !== 'turn/end') continue
      return event.data?.reason?.kind ?? 'unknown'
    }
    return undefined
  }

  /** Times of the newest finished turn and newest assistant message, for idle guards. */
  turnInfo(agent) {
    const events = agent?.session?.snapshotEvents?.() ?? []
    let turnEndAt
    let lastAssistantAt
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (turnEndAt === undefined && event?.type === 'turn/end') turnEndAt = event.time
      if (lastAssistantAt === undefined && event?.type === 'assistant/message') lastAssistantAt = event.time
      if (turnEndAt !== undefined && lastAssistantAt !== undefined) break
    }
    return { turnEndAt, lastAssistantAt }
  }

  status(sessionId) {
    return this.ctx.get('agents')?.get?.(sessionId)?.status
  }

  isLive(sessionId) {
    return this.ctx.get('agents')?.get?.(sessionId) !== undefined
  }

  /** Resolve on the next idle transition of `sessionId` (or timeout). */
  waitIdle(sessionId, timeoutMs = 180_000) {
    const agent = this.ctx.get('agents')?.get?.(sessionId)
    if (!agent) return Promise.resolve('missing')
    if (agent.status === 'idle') return Promise.resolve('idle')
    return new Promise(resolve => {
      let dispose = () => {}
      const timer = setTimeout(() => {
        dispose()
        resolve('timeout')
      }, timeoutMs)
      timer.unref?.()
      dispose = this.ctx.on('agent/status', payload => {
        if (payload.agent?.id !== sessionId || payload.status !== 'idle') return
        clearTimeout(timer)
        dispose()
        resolve('idle')
      })
    })
  }

  /**
   * Resolve when the Session finishes a turn whose `turn/end` is newer than
   * `sinceTime`. Unlike `waitIdle`, this cannot mistake an idle Session that has
   * not started the prompted turn for a finished one.
   */
  waitTurnEnd(sessionId, sinceTime, timeoutMs = 180_000) {
    const agent = this.ctx.get('agents')?.get?.(sessionId)
    if (!agent) return Promise.resolve('missing')
    const turnEndAt = () => this.turnInfo(agent).turnEndAt ?? 0
    if (turnEndAt() > sinceTime) return Promise.resolve('turn-end')
    return new Promise(resolve => {
      let settled = false
      let dispose = () => {}
      let timer
      let poll
      const finish = value => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        clearInterval(poll)
        dispose()
        resolve(value)
      }
      timer = setTimeout(() => finish('timeout'), timeoutMs)
      timer.unref?.()
      poll = setInterval(() => {
        const live = this.ctx.get('agents')?.get?.(sessionId)
        if (!live) return finish('missing')
        if ((this.turnInfo(live).turnEndAt ?? 0) > sinceTime) finish('turn-end')
      }, 500)
      poll.unref?.()
      dispose = this.ctx.on('session/event', (session, event) => {
        if (session?.id !== sessionId || event?.type !== 'turn/end') return
        if (event.time > sinceTime) finish('turn-end')
      })
    })
  }

  workerTitleFor(task) {
    return workerTitle(task.title)
  }

  supervisorTitle() {
    return SUPERVISOR_TITLE
  }
}
