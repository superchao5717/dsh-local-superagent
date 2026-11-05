# Local Superagent

[中文](README.md) | English

An independent community DSH plugin for a local workspace task board. Workers execute tasks in fresh sessions; a supervisor reviews their structured reports against acceptance criteria and either finishes, continues, or asks you for a decision. Open **Superagent** in the sidebar.

This is not an official DeepSeek product or a fork of the upstream prototype. Its architecture references [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype): supervisor/worker sessions, structured reporting, review and recovery. Tasks come from the local board, not GitHub/Gitee issue ingestion.

## Install from GitHub (recommended)

Requires Node.js >= 22 and DSH. Real-instance validation is limited to **Windows / DSH 0.2.1-rc.5**; other platforms and DSH versions have not been validated in a real instance.

- **DSH Desktop:** choose **Add plugin** on the plugins page and enter `github:superchao5717/dsh-local-superagent#v0.6.0` in the package/address field to pin the version. See the [v0.6.0 Release](https://github.com/superchao5717/dsh-local-superagent/releases/tag/v0.6.0) for its package assets. Electron manages the Desktop profile; do not manage it with Web CLI commands.
- **DSH Web:** run this in the environment hosting DSH Web (`--profile` comes before `add`):

  ```sh
  dsh plugin --profile web add github:superchao5717/dsh-local-superagent#v0.6.0
  ```

Do not edit profile bundles or dependency lists manually. The package name stays `@local/dsh-local-superagent` for existing-profile compatibility; it is not restricted to local installation.

The package remains `private: true`: distribution is through GitHub source and Release `.tgz`, not npm publication. Runtime files are JavaScript and need no build step. Check the [Releases page](https://github.com/superchao5717/dsh-local-superagent/releases) for available assets.

## 0.6.0: follow-up requirements / new sessions

Open any active or ended task and use **Follow up · New session** to submit text and/or images, videos or files. This creates a linked, independently queued task with the same supervisor/workspace, inherited attachments and a snapshot of prior goals/reports. The original task is not interrupted or changed. File picking, local paste/drop and Ctrl/⌘+Enter are supported; pending or failed uploads block submission.

Snapshots are not full chat history and do not track later source-task changes. Up to eight linked context levels are supported. Running tasks share disk access: avoid concurrent writes to the same files. Ordinary decision answers still use the existing answer entry. Closing details discards the follow-up text draft; attachment drafts are page-local.

Validation: 107 automated tests and 11 runtime syntax checks passed. The local UI entry was confirmed on Windows / DSH 0.2.2-rc.1 and the user confirmed their local update. A full live-model attachment-to-linked-task review cycle has not been revalidated for this release.

## 0.5.0: task attachments and supervisor-first selection

Available from **0.5.0**, not in 0.4.0/0.3.0. Earlier behavior and validation remain documented below. Back up the ledger and local native attachment data before upgrading; direct downgrade compatibility for attachments is not promised.

- With no workspace selected, the new-task form offers all supervisors and derives the workspace from the selected supervisor. Selecting a workspace first still filters supervisors and validates ownership. A task goal remains required.
- New-task, top-answer and detail-answer forms support file picking and form-local paste/drop for images, videos and ordinary files. Pending/failed uploads block submission; retry/remove are available. Answers may contain attachments without text. Cancel/collapse preserves in-page drafts; a new question clears stale answer drafts. Durable client drafts across refresh are not promised.
- An owner-only, bounded streaming wrapper reuses native DSH `attachments.saveImages/saveFileStream` and `fileUploads`. There is no separate file repository or empty draft chat; execution uses native Sessions. Missing attachment services do not disable the text board.
- Submit `attachments: [uploadId, ...]` with Host-issued tokens only (30-minute TTL, consumed on successful binding). Only Host-generated durable references enter the ledger, not upload tokens or Session receipts. Initial and answer attachments accumulate across continuation/retry/recovery; every new worker recreates native receipts. Older tasks normalize to empty attachments; schema 3 global settings remain unchanged. See the [exact DTO contract](docs/CONTRACT.md).
- Images become native vision messages and require an image-capable selected model; otherwise the task explicitly needs human handling. Video/other files are read using native file tools, without automatic transcoding/frame extraction or a claim of direct video vision.
- Each file/video is limited to **100 MiB**, each image to **min(native limits, 20 MiB)**. Initial and all answer attachments together are limited to **20 / 200 MiB per task**, charging `max(sourceBytes, bytes)`. Stricter native image/pixel/dimension/per-message limits still apply.
- Downloads require the owner and a durable task association. Non-images are forced downloads; HTML/SVG are not executed. Files may be untrusted and do not expand authorization. Removing drafts/tasks does not delete shared native DSH CAS objects; native provider objects remain on the local machine without automatic GC. Cross-Host file synchronization is not promised.

## 0.4.0: global settings and a single task entry

The following usage describes **0.4.0**. Version 0.3.0 retains per-supervisor settings and its historical validation below. Existing installations require an upgrade; changing documentation does not update a running instance.

The top-right settings panel now owns **one global configuration** for all supervisors and workers: models, automatic review, pause and timeout autonomy. Workspace/supervisor filtering changes only the view, never the scope of settings. `maxWorkers` (1–4) is the same configured concurrency limit **for each supervisor**, not a board-wide worker pool. New settings do not interrupt an in-flight request or execution round; subsequent dispatch, review and continuation use the new values.

Supervisors retain separate task queues, workspace ownership and review contexts, not separate effective model or scheduling settings. An empty worker-model range inherits the unified Superagent model; if that is also empty, DSH's deployment default is used. Session-level routing does not change DSH's global default.

### Upgrading to 0.4.0 / schema 3

Back up the ledger and let running tasks finish before upgrading. Migration takes the original `board.settings` as the global configuration, not the settings of whichever supervisor is selected. Each record retains its original per-supervisor settings unchanged in `legacySettings` for audit. `settingsMigration` records `fromSchema`, `toSchema: 3`, `at`, `settingsSource: 'board.settings'` and a message. Tasks, reports and unanswered questions are preserved. Schema 3 supervisor storage records no longer hold effective `settings`; `board.superagents[].settings` is only a read-only projection of the global settings. Legacy single-supervisor migration still preserves workspace-bound default supervisors.

**Do not directly overwrite a schema 3 installation with 0.3.0 and expect automatic downgrade compatibility.** For rollback, first stop related work and use the pre-upgrade backup; an older version may misinterpret a newer ledger.

## Use (0.5.0)

1. Open **Superagent** and select a supervisor directly to derive its workspace, or select a workspace first to filter supervisors. Use **＋** in the rail to create a supervisor; the selected supervisor's **⋯** menu provides rename/delete.
2. Use the sole **New task** entry below the supervisor area; the composer opens there. Enter its title, goal, optional acceptance criteria and priority, then enqueue it. The top toolbar has no duplicate task CTA.
3. Watch the queued, active and ended columns. Waiting tasks remain in the active column.
4. Answer questions directly in the top attention panel or task details. Successful answers resume the task.

The compact supervisor rail switches between a supervisor and the aggregate view, with inline create and selected-supervisor actions instead of a separate management panel. The top toolbar provides pause, refresh and global settings. The top attention panel preserves in-page answer drafts across polling and collapse, but clears stale drafts when the question changes. Reopening the task composer retains its in-page draft. Details show reports, deliverables, supervisor decisions, worker session IDs and progress, with retry/stop/delete controls. Supervisors with unfinished tasks cannot be deleted.

## Security boundaries

- **Not a sandbox:** workers run as the current OS user with `danger-full-access`. They can access files that user can access. Tool filtering and prompts are not OS isolation.
- Multiple supervisors share workspace disk access. Coordinate write scopes or use project worktrees; there are no automatic filesystem locks.
- Timeout autonomy is **off by default**. When explicitly enabled in global settings for all supervisors, the wait is **1–1440 minutes** (default 30). Each task gets at most one timeout attempt until a human answers or manually retries. It cannot fabricate a user answer or expand the original authorization.
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

### 0.5.0 validation (2026-11-05)

The automated regression passed **104/104** tests, including attachment storage, fresh native receipts across rounds, download bytes and filename boundaries. The existing Windows / DSH 0.2.1-rc.5 instance verified supervisor-first workspace selection, image recognition, text reading, small AVI file handoff and completion of a second round after an attachment-only answer. Video handoff does not mean the model directly understood the video. This is not a claim of all-format, cross-platform or clean Host reinstall validation.

### 0.4.0 validation (2026-11-04)

The local offline regression passed **78/78** tests. Schema 2→3 migration of a real-ledger copy verified task/question preservation, archived legacy settings and idempotency. The existing Windows / DSH 0.2.1-rc.5 instance was used to verify global settings across supervisors, rail creation/rename/delete protection and the single task entry. This does not claim a clean Host reinstall or passing cross-platform CI; installation and Release assets need separate verification.

### Published 0.3.0 historical validation

The following results belong only to the published per-supervisor-settings 0.3.0. The 0.4.0 global settings/schema 3 validation above is recorded separately without rewriting historical results.

The 2026-11-04 Windows regression passed **71/71** offline tests, including multi-supervisor isolation, migration, model inheritance, autonomy budgets, human-only gates, stale-review races and compact UI behavior. Host/Client syntax checks passed. Existing Windows / DSH 0.2.1-rc.5 validation covers multiple supervisors, independent settings, waiting cards and an authorized timeout continuation. This is not a claim that all platforms, installations or release assets have passed.

Tests use fake sessions and temporary ledgers: they do not install/start DSH, call real models, GPUs or accounts, or read the runtime ledger. An optional CI example covers Node.js 22/24 on Linux/Windows; remote CI has not been enabled or validated in this release preparation.

After development changes, use the plugin page to disable/enable the plugin by name, then refresh and verify. Cached Client metadata may require a Host restart; editing a file alone does not update a running instance.

## License and contribution

[MIT](LICENSE), with the existing copyright retained. See [third-party notices](THIRD_PARTY_NOTICES.md), [contribution guidance](CONTRIBUTING.md) and [changelog](CHANGELOG.md).
