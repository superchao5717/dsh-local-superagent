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
| `store.test.js` | empty/bad/missing JSON load, row normalization, add/update/remove, progress/log caps, settings clamps, atomic flush + reload round-trip |
| `api.test.js` | every action → engine method mapping, payload filtering, `{error,message}` wrapping, invalid/unknown action, internal errors (fake engine) |
| `engine.test.js` | addTask validation, priority/field clamps, retry/stop/remove state constraints, four review verdicts, continue cap, settle, recordReport clamps, recover, tick timeout, board projection (fake ctx/sessions + real Store) |
| `client-static.test.js` | `node --check`, only `require('react')`, exact `inject`, slot registrations, locale key parity, no DOM-body/iframe/raw HTML, no hard-coded colours, single fetch route, action vocabulary, error branches |
| `index-static.test.js` | exports, `inject: ['connection']`, route path/method/`requestBody`, owner check, `ctx.effect` cleanup, boot ordering |
| `support.js` | temp-directory, fake ctx, fake sessions helpers (not a test file) |

## Temp directories

Each test creates a unique `test/.lsa-*` directory and removes it in an
`after` hook (stores are closed first so no debounced write can recreate it).
If a run is killed hard, delete leftover `test/.lsa-*` directories manually.
