# Local Superagent — Host/Client contract v2 (0.3.0)

插件目录：本仓库根目录（profile `desktop`，开发验证于 DSH 0.2.1-rc.5）。

Client 半只通过一个同源 JSON 接口与 Host 半通信，不依赖任何 DSH Client 包。

## 传输

- `POST api/local-superagent/invoke`（相对路径，同源）
- 请求：`{ "action": "<name>", ...params }`，`content-type: application/json`
- 成功：`{ "ok": true, "data": <payload> }`
- 失败：`{ "ok": false, "code": "<code>", "message": "..." }`
  - 通用：`invalid_request|unknown_action|internal`
  - 领域：`unknown_task|busy|not_waiting|invalid_title|invalid_goal|invalid_answer|invalid_path|unknown_workspace|create_failed|invalid_model|unknown_superagent|ambiguous_superagent|workspace_mismatch`
  - 未认证/非 owner：HTTP 403 + `{ ok:false, code:"forbidden" }`（Client 会解析响应体展示）
- Client 对每次请求设置 15 秒超时；超时/网络失败按离线处理并保留旧数据。

## 数据模型

### Task（对外）

```jsonc
{
  "id": "sa-1a2b3c4d",
  "superagentId": "agent-1a2b3c4d",
  "superagentTitle": "项目主管",       // 包括已删除主管的历史名称
  "autonomy": { "attempted": false }, // 本任务是否已尝试一次超时主管自主决策
  "autonomyReviewPending": false,      // true 时保留 question，人工仍可 answer
  "workspaceId": "1e5ae513-...",
  "workspaceTitle": "my-workspace",
  "workspacePath": "D:\\workspace",
  "title": "给首页加暗色模式",
  "goal": "用户可切换暗色模式，刷新后保持",
  "acceptance": "两种主题都无视觉错位；刷新保持选择",
  "priority": 2,                  // 1 低 / 2 普通 / 3 高
  "status": "queued",             // queued | running | reviewing | needs_you | done | failed | cancelled
  "createdAt": 1793773836216,     // epoch ms
  "updatedAt": 1793773836216,
  "startedAt": 1793773836216,     // nullable
  "finishedAt": null,             // nullable
  "workerSessionId": "sa-task-1a2b3c4d",
  "workerModel": { "provider": "deepseek-account", "model": "deepseek-flash" },  // 本/下一轮执行模型；未派发时可尚未解析，空范围继承主管；主管也空时为 DSH 默认
  "attempts": 1,                  // 已开始过的执行轮数
  "report": null,                 // 见下
  "review": null,                 // 见下
  "question": null,               // 见下
  "progress": [                   // 最近最多 8 条，旧→新
    { "at": 1793773836216, "text": "已派发给执行会话" }
  ],
  "durationMs": null              // 结束后的总耗时
}
```

`report`（执行会话最后一次汇报）：

```jsonc
{ "state": "ready|needs_decision|blocked|failed", "summary": "一句话结论",
  "deliverables": ["相对路径或说明"], "question": "只在 needs_decision 时出现", "at": 1793773836216 }
```

`review`（主管审查结论）：`{ "verdict": "done|continue|needs_you|fail", "note": "一句话", "at": 1793773836216 }`

`question`（待用户决定，与 needs_you 对应）：`{ "text": "一个具体问题", "at": 1793773836216, "requiresHuman": true }`（默认 true；仅主管明确标记普通实现方案选择才可 false）。

### Board 快照

```jsonc
{
  "version": "0.3.0",
  "stateDir": "C:\\Users\\...\\.dsh\\state\\local-superagent",
  "settings": {
    "paused": false, "maxWorkers": 2, "autoReview": true,
    "autonomy": { "enabled": false, "waitMinutes": 30 },
    "models": {
      "supervisor": { "provider": "deepseek-account", "model": "deepseek-flash", "reasoningEffort": "max" }, // 或 null = 跟随 DSH 默认
      "workers": [ { "provider": "p", "model": "m" } ]   // 有序模型范围，第一个是默认执行模型；空数组 = 继承本主管模型；主管空时才跟随 DSH 默认
    }
  },
  "superagents": [ {
    "id": "agent-1a2b3c4d", "workspaceId": "...", "title": "项目主管",
    "settings": { /* 与 settings 同形，每主管独立 */ },
    "supervisor": { "sessionId": "sa-supervisor-...-agent-1a2b3c4d", "running": false },
    "live": { "running": 1, "queued": 2, "reviewing": 0, "needsYou": 1, "done": 3, "failed": 0, "capacity": 2 }
  } ],
  "workspaces": [ { "id": "...", "title": "my-workspace", "path": "D:\\workspace", "sessions": 0 } ],
  "tasks": [ /* Task[]，按 updatedAt 倒序 */ ],
  "live": {
    "running": 1, "queued": 2, "reviewing": 0, "needsYou": 1, "done": 3, "failed": 0,
    "capacity": 2, "attention": 1          // attention = needsYou（供徽标/横幅）
  },
  "supervisor": { "sessionId": "sa-supervisor-<generation>", "running": false }
}
```

`superagents[].supervisor.sessionId` 每次插件加载为每主管生成独立会话（旧会话归档）；标题包含主管名称。每个主管固定一个 workspace，同 workspace 可有多个主管；工具、模型、审查上下文与容量均隔离。顶级 `settings` 为旧账本/无主管时的兼容模板，顶级 `supervisor` 为遗留诊断标识（多主管 UI 不应使用它）；顶级 `live` 聚合全部任务，capacity 为活动主管容量之和。无活动主管时 capacity=0。

## Actions

| action | 参数 | 返回 |
|---|---|---|
| `board` / `status` | – | Board 快照（`status` 是 `board` 的别名） |
| `superagent.add` | `workspaceId, title` | `{ superagent }` |
| `superagent.update` | `id, title` | `{ superagent }` |
| `superagent.remove` | `id` | `{ ok:true }`（有 open 任务返回 busy） |
| `task.add` | `superagentId?, workspaceId, title, goal, acceptance?, priority?` | `{ task }` |
| `task.get` | `id` | `{ task, log: [{at, kind, text}], workerSessionId }` |
| `task.answer` | `id, text` | `{ task }`（needs_you 或正在自主审查且 autonomyReviewPending 有效；停止/普通审查不接受） |
| `task.retry` | `id` | `{ task }` |
| `task.stop` | `id` | `{ task }` |
| `task.remove` | `id` | `{ ok: true }` |
| `settings.save` | `superagentId?, paused?, maxWorkers?, autoReview?, models?, autonomy?` | `{ settings }`；`models` 可只带 `supervisor` 或 `workers`，未带字段保持原值 |
| `models.catalog` | `superagentId?` | `{ available, default, groups:[{id,name,models:[{id,name,reasoning?}]}], failures:[], models }`（`models` 是当前已保存配置） |
| `workspace.add` | `path, title?` | `{ workspace }` |

`task.add` 必须指定匹配的 workspace：传 superagentId 时不匹配返回 workspace_mismatch；未传时仅 workspace 恰有一个主管可推断，有多个拒绝 ambiguous_superagent，无主管时按需创建默认主管。settings.save/models.catalog 未传 id 时仅全板有一个活动主管可推断；多个时拒绝歧义；完全没有主管时保留旧 settings 模板行为。

`task.add` 的 `title` 必填（≤200 字），`goal` 必填（≤8000 字）；`acceptance` ≤4000；`priority` 缺省 2。

`settings.save` 的 `models.supervisor` 为 `null` 或 `{ provider, model, reasoningEffort? }`；`models.workers` 最多 8 项、按 provider+model 去重，第一项即默认执行模型。保存时会对照 Host 模型目录校验，模型当前不可用返回 `invalid_model`；模型目录暂时不可用时按原样保存。

## 自主续办、安全与持久化

- settings.autonomy 默认 `{enabled:false,waitMinutes:30}`，waitMinutes 归一到整数 1..1440；局部更新保留未传字段。
- 仅 needs_you、question.requiresHuman=false、非 blocked/failed 且非登录/凭据/权限/安全/付款等人工步骤的问题可进入超时主管决策。requiresHuman 默认 true，包括旧账本问题。worker 无权开启自动权限。
- 到期并且主管未暂停、还有执行容量时，Host 持久记录 task.autonomy.attempted=true，再把原问题交给**该任务主管**审慎判断。一次任务最多一次自动决策尝试；只有人工 answer/retry 重置预算。新问题不会自行重置，避免无限轮询消耗。
- 超时不是用户回答：主管只能明确 continue 一个原授权内可逆步骤，或维持 needs_you。不得伪造 user_answer，不得扩大授权，不能绕过人类登录、权限、安全、付款步骤；不允许自动 done/fail 掩盖未回答问题。
- 自动审查期间 task.status=reviewing、autonomyReviewPending=true，仍保留原 question，并接受 task.answer；人工回答优先。未决/超时/无工具判决回原 needs_you，原 question.at 保持不变且不再自动尝试。
- answer、普通 continue、自主 continue 均先 queued，统一经过对应主管 pause/maxWorkers 后以新 worker 会话续办，携带原问题、报告及新输入；既不重用已退出的执行位，也不突破并发容量。已有运行不因 pause 自动停止。
- 主管工具闭包绑定主管与会话，每项判决必须回传当前 payload 的不透明 review_token；Host 同时检查批次 token 和持久 reviewEpoch。人工回答、停止、重试、新报告等使旧批次失效，旧判决和旧 fallback 都不能覆盖新轮结果。worker 汇报工具绑定当轮 session，旧轮迟到汇报拒绝。
- 暂停/停用立即撤销未完成自主审查，恢复原问题；停止清空自主审查上下文，不会因之后设置保存或迟到回复复活。
- schema 2 自动迁移旧 ledger：按已有任务 workspace 各建默认主管，拷贝全部旧 settings/models/暂停配置，保留任务、状态、问题、日志、历史配置。重复加载不重复创建。没有历史任务的 workspace 可由 UI 创建主管或首次旧 task.add 按需创建。
- 删除采用 tombstone：仅无 queued/running/reviewing/needs_you 任务可删除，活动 superagents 列表隐藏，账本保留 id/workspace/title/settings 与终态任务 superagentId。历史任务仍可查看，但不允许直接 retry 已删除主管任务；应显式在活动主管下新建任务，绝不静默改归属。

## Client 半要求

- 与 Host 唯一的耦合就是上面的 action 表；不做乐观更新，每次操作后重新 `board`。
- 只允许注入 `slots`、`locale`、`connection`；不得 require 任何 Harness Client 包。
- 注册：
  - `sidebar.panellist`：`{ name:'sidebar.panellist', id:'local-superagent', order:15, label: () => bound('panel'), locale: NS }`，图标组件用 `size` prop。
  - `main`：`{ name:'main', key:'local-superagent', locale: NS, inject: () => ({}) }`。
- 文案走 `ctx.locale.register(NS, { en, zh })`，组件内 `t(key)`。
- 样式只用 `--dsw-alias-*` 主题 token（明暗两套自动跟随），不写死颜色（图标/渐变除外）；不读别的插件 DOM、不往 `document.body` 追加节点。
- 轮询：页面可见时 3 秒一次 `board`；不可见时暂停；操作进行中不叠并发请求。
- 顶部待回答区默认展开，可折叠；显示每项任务的标题、主管、问题与直接回答表单，并复用 task.answer。needs_you 及 autonomyReviewPending 均允许人工回答；对应任务仍留在“进行中”列表。草稿绑定任务及问题版本，同一问题轮询/折叠不丢，新问题不复用旧草稿。
- 尽量保持页面内滚动稳定：轮询失败只在顶部显示离线条，不打断详情面板。
