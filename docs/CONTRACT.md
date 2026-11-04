# Local Superagent — Host/Client contract v1

插件目录：本仓库根目录（profile `desktop`，开发验证于 DSH 0.2.1-rc.5）。

Client 半只通过一个同源 JSON 接口与 Host 半通信，不依赖任何 DSH Client 包。

## 传输

- `POST api/local-superagent/invoke`（相对路径，同源）
- 请求：`{ "action": "<name>", ...params }`，`content-type: application/json`
- 成功：`{ "ok": true, "data": <payload> }`
- 失败：`{ "ok": false, "code": "<code>", "message": "..." }`
  - 通用：`invalid_request|unknown_action|internal`
  - 领域：`unknown_task|busy|not_waiting|invalid_title|invalid_goal|invalid_answer|invalid_path|unknown_workspace|create_failed`
  - 未认证/非 owner：HTTP 403 + `{ ok:false, code:"forbidden" }`（Client 会解析响应体展示）
- Client 对每次请求设置 15 秒超时；超时/网络失败按离线处理并保留旧数据。

## 数据模型

### Task（对外）

```jsonc
{
  "id": "sa-1a2b3c4d",
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

`question`（待用户决定，与 needs_you 对应）：`{ "text": "一个具体问题", "at": 1793773836216 }`

### Board 快照

```jsonc
{
  "version": "0.1.0",
  "stateDir": "C:\\Users\\...\\.dsh\\state\\local-superagent",
  "settings": { "paused": false, "maxWorkers": 2, "autoReview": true },
  "workspaces": [ { "id": "...", "title": "my-workspace", "path": "D:\\workspace", "sessions": 0 } ],
  "tasks": [ /* Task[]，按 updatedAt 倒序 */ ],
  "live": {
    "running": 1, "queued": 2, "reviewing": 0, "needsYou": 1, "done": 3, "failed": 0,
    "capacity": 2, "attention": 1          // attention = needsYou（供徽标/横幅）
  },
  "supervisor": { "sessionId": "sa-supervisor-<generation>", "running": false }
}
```

`supervisor.sessionId` 每次插件加载生成一个新的主管会话 id（旧会话会被归档），标题固定为「Superagent 主管（自动调度，勿手动删除）」。

## Actions

| action | 参数 | 返回 |
|---|---|---|
| `board` / `status` | – | Board 快照（`status` 是 `board` 的别名） |
| `task.add` | `workspaceId, title, goal, acceptance?, priority?` | `{ task }` |
| `task.get` | `id` | `{ task, log: [{at, kind, text}], workerSessionId }` |
| `task.answer` | `id, text` | `{ task }`（仅 needs_you 有效） |
| `task.retry` | `id` | `{ task }` |
| `task.stop` | `id` | `{ task }` |
| `task.remove` | `id` | `{ ok: true }` |
| `settings.save` | `paused?, maxWorkers?, autoReview?` | `{ settings }` |
| `workspace.add` | `path, title?` | `{ workspace }` |

`task.add` 的 `title` 必填（≤200 字），`goal` 必填（≤8000 字）；`acceptance` ≤4000；`priority` 缺省 2。

## Client 半要求

- 与 Host 唯一的耦合就是上面的 action 表；不做乐观更新，每次操作后重新 `board`。
- 只允许注入 `slots`、`locale`、`connection`；不得 require 任何 Harness Client 包。
- 注册：
  - `sidebar.panellist`：`{ name:'sidebar.panellist', id:'local-superagent', order:15, label: () => bound('panel'), locale: NS }`，图标组件用 `size` prop。
  - `main`：`{ name:'main', key:'local-superagent', locale: NS, inject: () => ({}) }`。
- 文案走 `ctx.locale.register(NS, { en, zh })`，组件内 `t(key)`。
- 样式只用 `--dsw-alias-*` 主题 token（明暗两套自动跟随），不写死颜色（图标/渐变除外）；不读别的插件 DOM、不往 `document.body` 追加节点。
- 轮询：页面可见时 3 秒一次 `board`；不可见时暂停；操作进行中不叠并发请求。
- 尽量保持页面内滚动稳定：轮询失败只在顶部显示离线条，不打断详情面板。
