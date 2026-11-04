/**
 * Agent tools for the Local Superagent Sessions.
 *
 * The worker's only way to speak to the board is `superagent_report`; the
 * supervisor's only way to decide is `superagent_review`. Everything else the
 * board does is deterministic Host code, so the model cannot invent statuses or
 * skip the review path.
 *
 * Tool implementations resolve the CURRENT engine through a process-global
 * holder. A Session outlives a plugin reload, so a tool closure captured by an
 * older plugin instance must still act on the live engine (and its ledger),
 * never on a disposed one.
 */

const jsonOutput = {
  schema: { type: 'object', additionalProperties: true },
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
}

const REPORT_STATES = ['ready', 'needs_decision', 'blocked', 'failed']
const VERDICTS = ['done', 'continue', 'needs_you', 'fail']

/** The engine of the live plugin instance in this Host process. */
function currentEngine() {
  return globalThis.__dshLocalSuperagent?.engine
}

/** Tools available to one worker Session. */
export function workerTools(taskId) {
  return [{
    name: 'superagent_report',
    description: 'Report the final result of this task exactly once, then end the turn. Use state=ready when the task is done and verified, needs_decision when one question must be answered by the user, blocked when an external condition stops you, failed when the work cannot be completed. Keep summary under 200 Chinese characters; list changed files in deliverables; put the single question in question only for needs_decision. This report is what the board shows the user, so it must be honest and complete.',
    parameters: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: REPORT_STATES, description: 'outcome kind' },
        summary: { type: 'string', description: 'what you did, what you verified, and the result; ≤200 Chinese characters' },
        deliverables: { type: 'array', items: { type: 'string' }, description: 'changed files, artifacts, or reports; workspace-relative paths' },
        question: { type: 'string', description: 'the single question for the user; only with needs_decision' },
      },
      required: ['state', 'summary'],
      additionalProperties: false,
    },
    output: jsonOutput,
    execute: async args => {
      const engine = currentEngine()
      if (!engine) return { ok: false, error: 'the Local Superagent engine is not running' }
      return engine.recordReport(taskId, args)
    },
    isConcurrencySafe: () => false,
  }]
}

/** Tools available to the supervisor Session. */
export function supervisorTools() {
  return [{
    name: 'superagent_board_read',
    description: 'Read the current board: every open task with its status, attempts, last worker report and review history. Use it only when the review payload is not enough.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: jsonOutput,
    execute: async () => {
      const engine = currentEngine()
      if (!engine) return { ok: false, error: 'the Local Superagent engine is not running' }
      return engine.supervisorBoard()
    },
    isConcurrencySafe: () => true,
  }, {
    name: 'superagent_review',
    description: 'Record the verdict for one reviewed task. Call exactly once per task in review_queue. verdict: done (accept), continue (one concrete next step for the same worker), needs_you (one question only a human can answer), fail (no viable next step). note is one sentence for the user; continue_instruction is the instruction for the worker when verdict=continue; question is the single human question when verdict=needs_you.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'task id from review_queue' },
        verdict: { type: 'string', enum: VERDICTS },
        note: { type: 'string', description: 'one-sentence conclusion for the user, ≤60 Chinese characters' },
        continue_instruction: { type: 'string', description: 'the single next step for the worker; verdict=continue only' },
        question: { type: 'string', description: 'the single question for the user; verdict=needs_you only' },
      },
      required: ['task_id', 'verdict'],
      additionalProperties: false,
    },
    output: jsonOutput,
    execute: async args => {
      const engine = currentEngine()
      if (!engine) return { ok: false, error: 'the Local Superagent engine is not running' }
      return engine.applyReview(args)
    },
    isConcurrencySafe: () => false,
  }]
}
