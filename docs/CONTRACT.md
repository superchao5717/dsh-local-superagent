# Local Superagent — Host/Client contract v3 (0.5.0, global settings and native attachments)

插件目录：本仓库根目录（profile `desktop`，开发验证于 DSH 0.2.1-rc.5）。

Client 半通过同源 JSON 操作接口及独立二进制附件薄封装与 Host 半通信，不依赖任何 DSH Client 包。附件存储、图片验证与执行消息仍使用 DSH 原生服务，不另造聊天系统。附件功能自 0.5.0 提供。

## 传输

- `POST api/local-superagent/invoke`（相对路径，同源）
- 请求：`{ "action": "<name>", ...params }`，`content-type: application/json`
- 成功：`{ "ok": true, "data": <payload> }`
- 失败：`{ "ok": false, "code": "<code>", "message": "..." }`
  - 通用：`invalid_request|unknown_action|internal`
  - 领域：`unknown_task|busy|not_waiting|invalid_title|invalid_goal|invalid_answer|invalid_path|unknown_workspace|create_failed|invalid_model|unknown_superagent|ambiguous_superagent|workspace_mismatch|settings_scope_changed`
  - 未认证/非 owner：HTTP 403 + `{ ok:false, code:"forbidden" }`（Client 会解析响应体展示）
- Client 对每次请求设置 15 秒超时；超时/网络失败按离线处理并保留旧数据。

## 原生附件薄封装（0.5.0）

### 能力与上传

- `board.attachments = {available, limits:{maxFileBytes,maxImageBytes,maxAttachments,maxTotalBytes,uploadTtlMs}, reason?}`。原生 `attachments` 或 `fileUploads.uploadStream` 服务缺失时 available=false，单独返回 attachments_unsupported；不增加 required inject、不影响文本看板。
- `POST api/local-superagent/attachment?kind=image|file&name=...&mediaType=...&taskId?=...&questionKey?=...`；`Content-Type: application/octet-stream`，body 为原始 Blob/字节流，不能传 JSON/base64/URL/本机路径或客户端引用对象。mediaType 仅 image 需要，支持 png/jpeg/webp/gif 并由原生服务核验真实字节。
- 成功：`{ok:true,data:{uploadId,attachment:{kind,attachmentId,name,bytes,sourceBytes,mediaType?,width?,height?,originalDimensions?},expiresAt,questionKey?}}`。uploadId 是 Host 随机 capability，不是 attachmentId；客户端元数据只用于显示，绑定时 Host 从自己保存的 manifest 读取。
- 图片源流上限 min(20MiB, native.imageLimits.maxImageBytes, native.imageLimits.maxMessageImageBytes)，文件/视频单流 100MiB；不依赖 Content-Length，逐块计数超限立即取消读取。图片还经过原生完整解码、MIME/像素/尺寸验证与标准化。文件/视频通过 saveFileStream 原样存储，不转码、不自动抽帧。
- 每任务初始及全部回答累计最多 20 个附件、200MiB，按服务器计数的 max(sourceBytes,bytes) 累计，防止图片标准化缩小后规避源字节预算；bytes 保持原生标准化存储大小，旧引用无 sourceBytes 时按 bytes。图片另受原生每消息 image count 和累计源预算 bytes 限制。uploadId 30 分钟有效、最多 64 个待绑定/在途项、最多 4 个并行上传；到期清理只清 capability map，不删除共享原生 CAS 对象。关闭插件中断在途上传。
- 新任务上传不锁定任何主管/工作区，未选择主管也可上传；更换表单主管不要求重传。绑定仍须通过原 task.add 的主管与工作区匹配校验，新任务 token 只能被 task.add 成功消费一次。
- 回答上传必须带 taskId 和 task.questionKey 原样值。Host 在开始、完成上传和消费时核验仍为同一待回答问题；只允许绑定该 task.answer，不允许跨任务、跨问题或挪作新任务。停止/重试/换题期间完成的迟到上传拒绝绑定。

### 绑定、重试及原生消息

- task.add/task.answer 可带 `attachments:[uploadId,...]`。空数组维持原行为；对象引用、重复/未知/已用/过期/跨 scope token 或超限都会整批拒绝，无任务/回答副作用，未成功批次中的有效 token 不消费。校验、任务写入和 consume 在同一个无 await 的同步区间完成。
- task.goal 仍必填；task.answer 可以 text 为空且有成功附件。task.answer 建议同时发送 questionKey（即使纯文本回答），旧问题草稿不能误提交到新问题。
- 持久化只保存服务器生成的 `task.attachments` 引用：`[{kind:'image'|'file',attachmentId,name,bytes,sourceBytes,mediaType?,width?,height?,originalDimensions?,source:'initial'|'answer',at}]`。旧任务归一为空数组，不影响 schema 3 的 legacySettings/迁移记录；临时 uploadId 和原生 Session receipt 都不写账本。
- 初次派发、人工回答、主管 continue、自主续办、手动 retry、执行超时后续办及恢复均将全部累计附件交给当前 worker。图片由 readImage 校验后仅在 Host 内编码为原生 `{type:'image',mediaType,data,name?}`；普通文件/视频由 readFileStream → fileUploads.uploadStream 为**本轮普通 Session**重新生成 receipt，然后传 `{type:'file',receiptId}`。
- 不伪造原生 stage、不复用其它会话 receipt、不把大附件本体交给主管；主管只收到元数据和 worker 报告。模型不支持图片、对象缺失/损坏或工具无法读取均明确失败/转人工，不静默丢弃或声称看过。
- file/video 在 DSH 模型适配边界投影为原生只读文件 handle，按需由文件工具读取，不等同于视频视觉输入。副本地址只由原生 provider 暴露，不能来自客户端。

### 预览/下载与错误

- 已绑定附件：`GET api/local-superagent/attachment?taskId=...&attachmentId=sha256:...`。仅可读取该任务持久引用，不接受 path/url/ref 参数。上传未绑定预览由 Client 本地 objectURL 完成。
- 上传、下载和绑定均 owner-only，沿用 connection.admit 检查；非 owner HTTP403。图片用原生验证 MIME inline，nosniff；所有其它附件固定 application/octet-stream + attachment 安全文件名。响应 private/no-store、CSP sandbox，不执行客户端 HTML/SVG/MIME。
- 错误包仍为 `{ok:false,code,message}`：attachments_unsupported、invalid_attachment、attachment_too_large、too_many_attachments、attachment_expired、attachment_scope_mismatch、attachment_question_changed、attachment_upload_busy、attachment_missing、attachment_corrupt。上传超字节 HTTP413，其它领域失败 HTTP400；Client 须解析非 2xx JSON。移除草稿只移除本地引用，不删除原生文件。

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
  "questionKey": null,            // 有问题时 JSON.stringify([question.at,question.text])，回答上传原样传回
  "attachments": [],              // 累计服务器生成的 durable refs，见附件契约
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
  "version": "0.5.0",
  "stateDir": "C:\\Users\\...\\.dsh\\state\\local-superagent",
  "attachments": { "available": true, "limits": { "maxFileBytes": 104857600, "maxImageBytes": 20971520, "maxAttachments": 20, "maxTotalBytes": 209715200, "uploadTtlMs": 1800000 } },
  "settingsScope": "global",       // 必须检查此标识后才允许写全局设置
  "settingsMigration": null,        // 迁移过的旧账本含来源、时间及说明，见下文
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
    "settings": { /* board.settings 的只读兼容投影，所有主管同值 */ },
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

`superagents[].supervisor.sessionId` 每次插件加载为每主管生成独立会话（旧会话归档）；标题包含主管名称。每个主管固定一个 workspace，同 workspace 可有多个主管；任务、工具、会话及审查上下文保持隔离，**设置全局统一**。`board.settings` 是唯一权威；`superagents[].settings` 仅全局值的只读投影，不保存独立配置，新建主管始终读取最新全局值。`maxWorkers` 是每位主管相同的并发上限，而不是全板共享池；每个 live.capacity 都等于该值，顶级 live.capacity 为活动主管数 × maxWorkers。无活动主管时 capacity=0。顶级 `supervisor` 仍是遗留诊断标识（多主管 UI 不应使用它）。

## Actions

| action | 参数 | 返回 |
|---|---|---|
| `board` / `status` | – | Board 快照（`status` 是 `board` 的别名） |
| `superagent.add` | `workspaceId, title` | `{ superagent }` |
| `superagent.update` | `id, title` | `{ superagent }` |
| `superagent.remove` | `id` | `{ ok:true }`（有 open 任务返回 busy） |
| `task.add` | `superagentId?, workspaceId, title, goal, acceptance?, priority?, attachments?:uploadId[]` | `{ task }` |
| `task.get` | `id` | `{ task, log: [{at, kind, text}], workerSessionId }` |
| `task.answer` | `id, text?, attachments?:uploadId[], questionKey?` | `{ task }`（needs_you 或正在自主审查且 autonomyReviewPending 有效；停止/普通审查不接受） |
| `task.retry` | `id` | `{ task }` |
| `task.stop` | `id` | `{ task }` |
| `task.remove` | `id` | `{ ok: true }` |
| `settings.save` | `paused?, maxWorkers?, autoReview?, models?, autonomy?`（不可带 superagentId） | `{ settings }`；`models` 可只带 `supervisor` 或 `workers`，未带字段保持原值 |
| `models.catalog` | –（旧 superagentId 读取参数忽略） | `{ available, default, groups:[{id,name,models:[{id,name,reasoning?}]}], failures:[], models }`（`models` 是当前已保存配置） |
| `workspace.add` | `path, title?` | `{ workspace }` |

`task.add` 必须指定匹配的 workspace：传 superagentId 时不匹配返回 workspace_mismatch；未传时仅 workspace 恰有一个主管可推断，有多个拒绝 ambiguous_superagent，无主管时按需创建默认主管。settings.save/models.catalog 均全局，不按主管推断。**settings.save 只要带 superagentId（包括无效 id/null）就拒绝 settings_scope_changed，要求刷新；绝不把旧的局部写请求静默扩大为全局写。** models.catalog 兼容忽略旧 id 读取参数。

`task.add` 的 `title` 必填（≤200 字），`goal` 必填（≤8000 字）；`acceptance` ≤4000；`priority` 缺省 2。

`settings.save` 的 `models.supervisor` 为 `null` 或 `{ provider, model, reasoningEffort? }`；`models.workers` 最多 8 项、按 provider+model 去重，第一项即默认执行模型。保存时会对照 Host 模型目录校验，模型当前不可用返回 `invalid_model`；模型目录暂时不可用时按原样保存。

### 全局设置生效与 schema 3 迁移

- UI 必须检查 `board.settingsScope === 'global'`；旧 Host 没有标识时禁写并提示重新加载，不能用局部设置 UI 对全局接口提交。
- pause、autoReview、autonomy、models 和 maxWorkers 统一适用于全部当前及未来主管。暂停所有新派发与自治，不中断正在运行的 worker；恢复后各主管按相同 maxWorkers 分别派发。
- 保存 models 后更新所有活动主管会话的下一请求路由；当前 worker 请求/轮不中断、不强制改模型。后续派发、回答或继续时，按最新全局工作模型范围校验；空 workers 继承全局 supervisor，后者为空才跟随 DSH 默认。
- schema 3 使用旧账本顶级 board.settings 模板作为唯一全局配置，不任意挑选某位主管覆盖。原 `superagents[].settings` 原样移入 `superagents[].legacySettings` 仅供审计，包含已删除主管的历史配置；新主管不保存设置快照。
- ledger 与 Board 均含 `settingsMigration`：`{fromSchema,toSchema:3,at,settingsSource:'board.settings',message}`。说明明确配置已全局统一、旧独立配置归档及逐主管容量语义。schema 3 重复加载保留同一迁移时间/说明、legacySettings 和实体归属，不再创建迁移记录。
- 保留全部任务、报告、问题与原时间；schema 1/旧无主管账本仍按任务 workspace 建默认主管后直接迁至 schema 3。迁移只在 Host 正常加载执行，不要求手工编辑真实运行账本。

## 自主续办、安全与持久化

- settings.autonomy 默认 `{enabled:false,waitMinutes:30}`，waitMinutes 归一到整数 1..1440；局部更新保留未传字段。
- 仅 needs_you、question.requiresHuman=false、非 blocked/failed 且非登录/凭据/权限/安全/付款等人工步骤的问题可进入超时主管决策。requiresHuman 默认 true，包括旧账本问题。worker 无权开启自动权限。
- 到期并且主管未暂停、还有执行容量时，Host 持久记录 task.autonomy.attempted=true，再把原问题交给**该任务主管**审慎判断。一次任务最多一次自动决策尝试；只有人工 answer/retry 重置预算。新问题不会自行重置，避免无限轮询消耗。
- 超时不是用户回答：主管只能明确 continue 一个原授权内可逆步骤，或维持 needs_you。不得伪造 user_answer，不得扩大授权，不能绕过人类登录、权限、安全、付款步骤；不允许自动 done/fail 掩盖未回答问题。
- 自动审查期间 task.status=reviewing、autonomyReviewPending=true，仍保留原 question，并接受 task.answer；人工回答优先。未决/超时/无工具判决回原 needs_you，原 question.at 保持不变且不再自动尝试。
- answer、普通 continue、自主 continue 均先 queued，统一经过全局 pause 与对应主管 maxWorkers 后以新 worker 会话续办，携带原问题、报告及新输入；既不重用已退出的执行位，也不突破并发容量。已有运行不因 pause 自动停止。
- 主管工具闭包绑定主管与会话，每项判决必须回传当前 payload 的不透明 review_token；Host 同时检查批次 token 和持久 reviewEpoch。人工回答、停止、重试、新报告等使旧批次失效，旧判决和旧 fallback 都不能覆盖新轮结果。worker 汇报工具绑定当轮 session，旧轮迟到汇报拒绝。
- 全局暂停/停用自治立即撤销所有主管的未完成自主审查，恢复原问题；停止清空自主审查上下文，不会因之后设置保存或迟到回复复活。
- 没有历史任务的 workspace 可由 UI 创建主管或首次旧 task.add 按需创建；其设置始终读取全局最新值。
- 删除采用 tombstone：仅无 queued/running/reviewing/needs_you 任务可删除，活动 superagents 列表隐藏，账本保留 id/workspace/title/legacySettings（如有）与终态任务 superagentId。历史任务仍可查看，但不允许直接 retry 已删除主管任务；应显式在活动主管下新建任务，绝不静默改归属。

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
