# Local Superagent

[中文](README.md) | English

An independent community DSH plugin for a local workspace task board. Workers execute tasks in fresh sessions; a supervisor reviews their structured reports against acceptance criteria and either finishes, continues, or asks you for a decision. Open **Superagent** in the sidebar.

This is not an official DeepSeek product or a fork of the upstream prototype. Its architecture references [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype): supervisor/worker sessions, structured reporting, review and recovery. Tasks come from the local board, not GitHub/Gitee issue ingestion.

## Install from GitHub (recommended)

Requires Node.js >= 22 and DSH. Real-instance validation is limited to **Windows / DSH 0.2.1-rc.5**; other platforms and DSH versions have not been validated in a real instance.

- **DSH Desktop:** choose **Add plugin** on the plugins page and enter `https://github.com/superchao5717/dsh-local-superagent` in the package/address field (or use `github:superchao5717/dsh-local-superagent`). Electron manages the Desktop profile; do not manage it with Web CLI commands.
- **DSH Web:** run this in the environment hosting DSH Web (`--profile` comes before `add`):

  ```sh
  dsh plugin --profile web add github:superchao5717/dsh-local-superagent
  ```

Do not edit profile bundles or dependency lists manually. The package name stays `@local/dsh-local-superagent` for existing-profile compatibility; it is not restricted to local installation.

The package remains `private: true`: distribution is through GitHub source and Release `.tgz`, not npm publication. Runtime files are JavaScript and need no build step. Check the [Releases page](https://github.com/superchao5717/dsh-local-superagent/releases) for available assets.

## Use

1. Open **Superagent**, select a registered workspace, and create or select a supervisor.
2. Choose **New task**, enter its title, goal, optional acceptance criteria and priority, then enqueue it.
3. Watch the queued, active and ended columns. Waiting tasks remain in the active column.
4. Answer questions directly in the top attention panel or task details. Successful answers resume the task.

The compact supervisor rail switches between a supervisor and the aggregate view. Management is collapsed by default. The top attention panel preserves in-page answer drafts across polling and collapse, but clears stale drafts when the question changes. Reopening the task composer retains its in-page draft. Details show reports, deliverables, supervisor decisions, worker session IDs and progress, with retry/stop/delete controls.

Each supervisor has independent queues, models, concurrency (1–4), pause, review and timeout settings. An empty worker-model range inherits that supervisor's model; if both are empty, DSH's deployment default is used. Model selection is session-scoped, not a change to the global default. Existing single-supervisor ledgers migrate while preserving task history; supervisors with unfinished tasks cannot be deleted.

## Security boundaries

- **Not a sandbox:** workers run as the current OS user with `danger-full-access`. They can access files that user can access. Tool filtering and prompts are not OS isolation.
- Multiple supervisors share workspace disk access. Coordinate write scopes or use project worktrees; there are no automatic filesystem locks.
- Timeout autonomy is **off by default**. When enabled per supervisor, the wait is **1–1440 minutes** (default 30). Each task gets at most one timeout attempt until a human answers or manually retries. It cannot fabricate a user answer or expand the original authorization.
- Login, authentication, permissions, payment and new authorization must still be handled by a human. Pause does not stop already-running work, but prevents new dispatch and timeout continuation.
- Default task guidance is local delivery: no commit, push, deployment or software installation unless the task explicitly authorizes it. These are behavioral rules, not access controls. Model use may incur provider charges.

See [SECURITY.md](SECURITY.md). Do not submit credentials, private tasks or raw session logs in reports.

## Architecture and data

Host dispatch is deterministic. Each execution round creates a fresh worker session and accepts one structured `superagent_report`; the task's persistent supervisor returns `done`, `continue`, `needs_you` or `fail`. Continuations re-enter the capacity-controlled queue. Review tokens and persistent epochs reject stale results after answers, stops or retries.

The local JSON ledger is stored at `~/.dsh/state/local-superagent/board.json`. Worker sessions appear in the workspace session list. Removing the plugin does not delete its ledger or session history. The model-facing `local_superagent` tool supports `board`, `add_task` and `task`; adding a task requires explicit user intent and supervisor ownership. Human answers are submitted through the UI.

See [the interface contract](docs/CONTRACT.md) and the [Chinese guide](README.md) for additional details.

## Development and validation

No npm dependencies need installation:

```sh
npm test
npm run check
npm pack --dry-run
```

The 2026-11-04 Windows regression passed **71/71** offline tests, including multi-supervisor isolation, migration, model inheritance, autonomy budgets, human-only gates, stale-review races and compact UI behavior. Host/Client syntax checks passed. Existing Windows / DSH 0.2.1-rc.5 validation covers multiple supervisors, independent settings, waiting cards and an authorized timeout continuation. This is not a claim that all platforms, installations or release assets have passed.

Tests use fake sessions and temporary ledgers: they do not install/start DSH, call real models, GPUs or accounts, or read the runtime ledger. An optional CI example covers Node.js 22/24 on Linux/Windows; remote CI has not been enabled or validated in this release preparation.

After development changes, use the plugin page to disable/enable the plugin by name, then refresh and verify. Cached Client metadata may require a Host restart; editing a file alone does not update a running instance.

## License and contribution

[MIT](LICENSE), with the existing copyright retained. See [third-party notices](THIRD_PARTY_NOTICES.md), [contribution guidance](CONTRIBUTING.md) and [changelog](CHANGELOG.md).
