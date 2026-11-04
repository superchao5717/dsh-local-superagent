/**
 * Same-origin JSON operations for the Local Superagent Client half.
 *
 * One thin dispatcher: validate the operation, call the engine method, and
 * return `{ ok, data }` or `{ ok: false, code, message }`. The Client half has
 * no other Host coupling.
 */
export class Api {
  /** @param {{ engine: any, log: (message: string) => void }} options */
  constructor({ engine, log }) {
    this.engine = engine
    this.log = log
  }

  /** @returns {Promise<{ok: true, data: any} | {ok: false, code: string, message: string}>} */
  async handle(args) {
    if (!args || typeof args !== 'object' || typeof args.action !== 'string') {
      return this.fail('invalid_request', '缺少 action。')
    }
    try {
      switch (args.action) {
        case 'board':
          return this.ok(this.engine.board())
        case 'status':
          return this.ok(this.engine.board())
        case 'task.add':
          return this.wrap(this.engine.addTask(args))
        case 'task.get': {
          const detail = this.engine.taskDetail(args.id)
          return detail ? this.ok(detail) : this.fail('unknown_task', '任务不存在。')
        }
        case 'task.answer':
          return this.wrap(this.engine.answer(args.id, args.text))
        case 'task.retry':
          return this.wrap(this.engine.retry(args.id))
        case 'task.stop':
          return this.wrap(this.engine.stopTask(args.id))
        case 'task.remove':
          return this.wrap(this.engine.removeTask(args.id))
        case 'settings.save':
          return this.wrap(this.engine.saveSettings({
            ...(typeof args.paused === 'boolean' ? { paused: args.paused } : {}),
            ...(args.maxWorkers !== undefined ? { maxWorkers: args.maxWorkers } : {}),
            ...(typeof args.autoReview === 'boolean' ? { autoReview: args.autoReview } : {}),
          }))
        case 'workspace.add': {
          const result = await this.engine.addWorkspace(args.path, args.title)
          return this.wrap(result)
        }
        default:
          return this.fail('unknown_action', `未知操作：${args.action}`)
      }
    } catch (error) {
      this.log(`operation ${args.action} failed: ${String(error)}`)
      return this.fail('internal', `操作失败：${String(error)}`)
    }
  }

  ok(data) {
    return { ok: true, data }
  }

  fail(code, message) {
    return { ok: false, code, message }
  }

  /** Engine methods return `{ error, message }` on a domain failure, or a data object. */
  wrap(result) {
    if (!result || typeof result !== 'object') return this.fail('internal', 'Host 没有返回结果。')
    if (result.error) return this.fail(String(result.error), String(result.message ?? '操作失败。'))
    return this.ok(result)
  }
}
