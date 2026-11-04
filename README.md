# 本地 Superagent（Local Superagent）

DSH 插件：一个**本地版 Superagent 任务看板**。你在自己的 DSH 工作区里布置任务，插件自动把任务派发给独立执行会话（worker），由"主管"会话按验收条件审查结果并决定下一步；只在真正需要你决定时才把任务放到「待你决定」。入口在左侧导航栏 **Superagent**。

它参考了 DeepSeek 官方 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) 的架构思想（注意力经济学、主从双 Session、结构化汇报、审查与恢复），但按本机需求改成：**不接 GitHub/Gitee，任务直接来自本地看板，工作区就是本机目录**。

## 安装

需要 DSH 桌面版（开发验证于 `DSH 0.2.1-rc.5`，Node.js >= 22）。插件以本地 `link:` 方式装进一个 DSH profile：

1. 把本仓库克隆到任意本机目录，例如 `D:\plugins\dsh-local-superagent`；
2. 在该目标 profile 的 `package.json`（一般是 `%USERPROFILE%\.dsh\profiles\desktop\package.json`）里：
   - `dependencies` 增加 `"@local/dsh-local-superagent": "link:D:/plugins/dsh-local-superagent"`；
   - `dsh.profile.bundles` 追加 `"@local/dsh-local-superagent"`；
3. 在该 profile 目录执行包管理器安装（DSH 使用 pnpm），让 `link:` 依赖生效；
4. 重启 DSH（或重新加载插件），左侧导航栏出现 **Superagent** 入口。

> 升级/改代码后，在插件管理里把该插件关掉再打开即可重新加载 Host 半；浏览器端刷新页面即可看到新的看板代码。

## 快速开始

1. 左侧导航栏点击 **Superagent**；
2. 选一个工作区（例如 `my-workspace` → `D:\workspace`），点 **＋ 布置新任务**；
3. 填标题、目标/要求、验收条件（可选）、优先级，**加入队列**；
4. 之后不用管：插件自动派发、执行、审查；需要你决定时任务会出现在顶部「待你决定」，回答后自动继续。

> 建议安装/升级后重启一次 DSH：插件在启动时轮换自己的主管会话来获得干净的提示词与工具注册。

## 看板怎么读

| 区域 | 含义 |
| --- | --- |
| 顶部计数 | 运行中 / 排队 / 待你决定 / 已完成 / 并发上限；**暂停**停止派发新任务（运行中的继续） |
| 工作区 | 来自 DSH 的工作区注册表；也可「添加工作区」注册本机目录 |
| 待你决定 | 主管判定必须由人决定的任务：显示**一个**具体问题 + 回答框。回答、重试、停止都在这里 |
| 待接单 | 已接单、等待空闲执行位 |
| 进行中 | 执行会话正在跑；「主管审查中」表示执行结束、主管正在给结论 |
| 已结束 | 已完成 / 失败 / 已停止，可按类型筛选 |
| 详情 | 目标、验收条件、执行报告、交付物、主管结论、执行会话 id（可复制）、进度日志；可重试/停止/删除 |

「设置」里可改：并发上限（1–4）、自动审查开关、暂停/恢复。系统会显示主管会话 id 与状态目录。

## 界面与交互

- 顶部固定工具栏：主管状态灯（空闲/审查中/未启动）、布置任务、暂停、刷新、设置；向下滚动时保持可达。
- 工作区以胶囊标签切换（全部 + 每个工作区 + 添加工作区弹层）；右侧常驻搜索框，可按标题/目标/工作区实时过滤。
- 看板三列：待接单、进行中（含「主管审查中」徽标）、已结束（按完成/失败/已停止筛选）；卡片按优先级与更新时间排序，显示优先级、耗时、最新进展、待回答的问题或主管结论。
- 「待你决定」是置顶高亮区：只显示一个具体问题，`Enter` 提交回答、`Shift+Enter` 换行；回答后自动继续。
- 详情抽屉：概览、目标/验收、执行报告（状态徽标 + 交付物）、主管审查、执行会话 id（一键复制）、垂直进度时间轴；底部重试/停止/删除（删除有二次确认）。
- 设置与添加工作区使用锚定弹层，点击外部或 `Esc` 关闭；操作结果以右下角轻量提示条反馈，不打断操作。
- 键盘：`Esc` 逐层关闭弹层/详情；表单内 `Ctrl / ⌘ + Enter` 提交任务；`n` 在页面空白处聚焦「布置新任务」。
- 响应式：宽屏为看板 + 右侧详情栏；窄于约 1180px 时详情变为右侧抽屉 + 遮罩，窄屏看板收成单列。

## 工作原理

```
用户在看板布置任务（工作区 + 标题 + 目标 + 验收）
        │  确定性调度（Host 代码，不需要模型参与）
        ▼
每轮一个全新的 worker Session（工作区目录、工具集受限、系统提示注入）
        │  工作完成后调用 superagent_report 恰好一次：
        │  ready | needs_decision | blocked | failed
        ▼
一个持久 supervisor Session 批量审查（只判断、不执行）
        │  superagent_review：done | continue | needs_you | fail
        ├─ done      → 已完成
        ├─ continue  → 把一句具体指令交回同一个 worker（最多连续 2 轮）
        ├─ needs_you → 进入「待你决定」，只带一个问题
        └─ fail      → 失败
```

关键设计：

- **主从分离**：worker 读代码、改文件、验证；supervisor 不读代码、不动手，只对照验收条件给结论。两者的上下文互不污染。
- **确定性派发**：用户任务本身就是明确授权，所以接单/排队/并发控制由 Host 代码完成，省掉一次模型往返，也避免模型"漏接单"。
- **结构化汇报**：worker 只能通过 `superagent_report` 交结果（状态 + 摘要 + 交付物 + 单个问题）；汇报内容越界会被 Host 校验/截断。
- **低打扰**：正常推进不弹窗、不往聊天里发消息；只有 `needs_you` 才占用你的注意力，一次一个问题。
- **预算与止损**：worker 被要求"验证点到为止、同命令失败两次即停、单轮尽量 10 分钟"；Host 另有 45 分钟超时兜底，超时转人工决定。
- **可恢复**：账本是 Host 端 JSON（原子写）；插件/DSH 重启后，运行中的任务重新排队，审查中的任务重新入队；每轮派发使用新的 worker Session，避免旧插件的工具注册残留。
- **会话可见**：worker 会话会出现在所属工作区的会话列表里（标题 `⚡ 任务名`），可以直接点开看执行过程；主管会话标题为 `Superagent 主管（自动调度，勿手动删除）`。

## 文件与状态

- 插件入口：`index.js`（Host 装配与同源 API 路由 `/api/local-superagent/invoke`）
  - `lib/store.js` 任务账本（原子写 JSON）、`lib/engine.js` 调度/审查/恢复、`lib/sessions.js` 会话创建与装饰、`lib/prompts.js` 提示词、`lib/tools.js` 模型工具、`lib/api.js` 操作分发
  - `client.js` 浏览器端看板（React，经 DSH Client Slot 注册左侧入口与主面板）
  - `docs/CONTRACT.md` Host/Client 接口契约
- 运行账本：`~/.dsh/state/local-superagent/board.json`
- 模型可用的 agent 工具：`local_superagent`（`board` / `add_task` / `task`），可从任意会话读取看板；**回答 needs_you 只能由人在 UI 里做**，因为那是授权动作。

## 边界与注意

- **不是安全沙箱**：worker 以当前 OS 用户、`danger-full-access` 运行，能读写你能读写的路径；任务目标要写清楚范围。
- 默认**本地交付**：提示词要求不 commit / 不 push / 不部署 / 不装软件，除非任务明确要求。
- 删除「Superagent 主管」会话会让下次审查重新创建它；不要手动删，以免丢失审查上下文（任务本身不受影响）。
- 卸载：插件管理里停用/移除 `@local/dsh-local-superagent` 这个 bundle 即可；账本文件保留在 `~/.dsh/state/local-superagent/`，可手动删除。
- 与上游原型的差异：没有 Source/Trigger/Thread/Mandate/准入层（本地任务天然可信），没有 GitHub/飞书投递；保留了主从 Session、报告协议、审查、恢复、注意力最小化这些核心机制。

## 开发与测试

```powershell
node --check index.js
node --check client.js
node --test test/*.test.js
```

需要 Node.js >= 22；测试没有 npm 依赖，也不需要安装插件、启动 DSH 或访问真实账本。

修改 Host/Client 后：插件管理里把 `include:dsh-local-superagent` 关掉再打开即可重新加载（无需重启 DSH）；浏览器端刷新页面即可看到新的看板代码。

## 许可证

[MIT](LICENSE)
