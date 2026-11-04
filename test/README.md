# Tests

Unit and static-contract tests for the Local Superagent plugin. They do not
install the plugin, start DSH, open a browser, call any `local_superagent*`
tool, or touch the real ledger
(`%USERPROFILE%\.dsh\state\local-superagent\board.json`).

## Run

From the plugin root:

```powershell
node --test test/*.test.js
```

Requires Node.js >= 22 on `PATH`; there are no npm dependencies to install.

Run one file, for example:

```powershell
node --test test/store.test.js
```

## Files

| file | covers |
|---|---|
| `store.test.js` | empty/bad/missing JSON load, row normalization, add/update/remove, progress/log caps, settings clamps, model-settings/task-model normalization, atomic flush + reload round-trip |
| `api.test.js` | every action → engine method mapping, payload filtering, `{error,message}` wrapping, invalid/unknown action, `models.catalog`, internal errors (fake engine) |
| `engine.test.js` | addTask validation, priority/field clamps, retry/stop/remove state constraints, four review verdicts, continue cap, settle, recordReport clamps, recover, tick timeout, board projection, model catalog/validation, worker-model dispatch and supervisor model switch (fake ctx/sessions + real Store) |
| `multi-superagent.test.js` | same-workspace and cross-workspace shared global settings with isolated supervisor sessions/tasks/context, independent review loops, capacity/pause, legacy migration and repeated reload, API CRUD/tombstone ownership, schema 3 global migration with exact legacy archives and idempotence, settingsScope and old scoped-write rejection, future supervisors following global changes, global pause/autonomy revocation, all-supervisor model retargeting without interrupting workers, inherited worker models, one-shot autonomy timeout, actual scoped decision tool continuation, no fabricated user answer, human-only safety gate, disable/answer/stop races and ABA epoch/token invalidation, stale worker reports and cross-agent tool rejection |
| `sessions.test.js` | per-Session model routing: prepended request/assemble listeners, deployment-default override, `model/selection` events, retarget/clear, `ensure` carrying the model (fake agent ctx) |
| `client-static.test.js` | `node --check`, only `require('react')`, exact `inject`, slot registrations, locale key parity, no DOM-body/iframe/raw HTML, no hard-coded colours, single fetch route, action vocabulary, error branches |
| `index-static.test.js` | exports, `inject: ['connection']`, route path/method/`requestBody`, owner check, `ctx.effect` cleanup, boot ordering |
| `support.js` | temp-directory, fake ctx, fake sessions helpers (not a test file) |

## Temp directories

Each test creates a unique `test/.lsa-*` directory and removes it in an
`after` hook (stores are closed first so no debounced write can recreate it).
If a run is killed hard, delete leftover `test/.lsa-*` directories manually.
