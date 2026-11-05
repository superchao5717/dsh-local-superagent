# 安全说明 / Security

## 信任与权限边界

**本插件不是安全沙箱。** Worker 以当前 OS 用户、`danger-full-access` 运行，可能读取和修改该用户可访问的文件。工作区选择、会话工具过滤、系统提示词、看板状态与 `.gitignore` 都不等同于 OS 隔离。不要向插件布置不可信指令；任务应明确允许访问的目录、可修改文件及禁止行为。

0.4.0 使用一份全局设置，对所有主管及 worker 生效；工作区/主管筛选不缩小设置作用范围。多个 Superagent 仅保留各自任务队列、工作区归属与审查上下文，磁盘访问共享，不提供文件锁。并发写入前划分 scope 或使用项目自己的 worktree；重要数据另行做好备份。Supervisor 审查不等于代码安全审计。

## 人工授权与自主续办

- 任务默认本地交付；未明确授权不得 commit、push、部署或安装软件。这是行为约束，不是技术访问控制。
- 超时自主续办默认关闭，在全局设置显式开启后对所有主管生效；等待时间 1–1440 分钟，默认 30 分钟。每任务在人回答或手动重试前最多尝试一次，记录为主管自主决策，不伪造用户回答。
- 自主决策只能推进原授权范围内的普通方案选择，不能扩大权限。登录、认证、权限确认、付款、新增授权等必须由人完成，不能因超时或任务文本要求而绕过。
- 暂停阻止新派发与超时续办，不会撤销已运行 worker 的 OS 权限。停止任务也不保证撤销已经发生的外部操作。

全局 `maxWorkers` 是每位主管统一采用的并发上限，不是全板总池；多主管同时运行可能增加总调用量与费用。变更设置不强行中断当前请求或执行轮，新值用于后续派发/审查/续办。

## 0.4.0 / schema 3 升级

升级前备份账本并等待当前执行结束。迁移以原 `board.settings` 为全局设置，旧主管设置原样保留为 `legacySettings` 供审计；`settingsMigration` 记录来源、schema 版本、时间与说明，任务及问题保留。这些审计字段不是另一套生效配置。schema 3 不建议直接由旧版 0.3.0 覆盖，不承诺自动兼容降级；回退前应停止相关工作并使用升级前备份。已发布 0.3.0 的逐主管设置行为不因本地文档变化而改变。

## 0.5.0 附件安全

升级前备份账本及本机原生附件数据；不承诺直接降级后仍能保留/处理附件。0.4.0/0.3.0 不包含此附件功能，既有 schema 3 全局配置与人工授权边界仍适用。

- 任务目标仍必填，附件内容可能不可信，不构成新增权限或授权，也不能绕过登录/付款/人工确认边界。
- 上传、绑定与下载均 owner-only。Host 拒绝客户端原生 ref、路径、URL、base64 或引用对象；提交只使用 Host 生成的 uploadId，30 分钟有效且成功绑定后消耗。回答上传还绑定任务与问题版本，防止跨任务/换题误用。
- 上传采用有界流读取，不依赖 Content-Length：文件/视频单个 100 MiB，图片单个 min(原生限制,20 MiB)，每任务累计 20 个/200 MiB，按 max(sourceBytes,bytes) 预算；更严格的原生像素、尺寸和单消息限制仍生效。
- 任务只保存服务器生成的持久引用，upload token/Session receipt 不持久化；每轮 worker 重建原生 receipt。不创建空 draft 聊天，不另建文件库，不复用其它会话 receipt。
- 下载要求 owner 且附件与任务持久引用关联；非图片强制下载，配合 nosniff/CSP sandbox，不执行 HTML/SVG。下载后用外部程序打开仍有不可信文件风险。图片须由支持图片的模型处理；视频/其它文件是工具读取，不自动转码，也不承诺直接视频视觉理解。
- 草稿/任务移除或 token 过期不会删除共享 DSH 原生 CAS。原生 provider 对象在本机长期保留、无自动 GC；不要上传不愿长期留存的敏感文件。不承诺跨 Host 文件同步、干净重装后附件可用或跨刷新持久客户端草稿。schema 3 全局配置和旧任务空附件兼容不变。

## 数据与费用

运行账本位于 `~/.dsh/state/local-superagent/board.json`，会话由 DSH 管理。任务、报告和文件内容可能通过所选 DSH 模型提供商处理；模型调用可能产生费用。卸载插件不会自动删除账本和会话。不要把密钥、私有任务、账本、原始会话或机器配置放入 Git、Issue、Release 或截图。

## 报告漏洞 / Reporting

影响当前版本的问题请提供最小复现、Node/DSH/OS 版本及预期与实际行为；不要附带凭据或真实用户数据。普通非敏感缺陷可提交到 [Issues](https://github.com/superchao5717/dsh-local-superagent/issues)。敏感漏洞请优先使用仓库 Security 页的私密漏洞报告功能（如果已启用）；本项目未承诺已启用该功能或固定响应时限。若不可用，不要公开可利用细节或密钥；可先提交不含利用细节的联系请求，等待维护者确定私密渠道。

目前实机验证仅覆盖 Windows / DSH 0.2.1-rc.5；离线回归和收录不等于安全审计或跨平台保证。

**English summary:** Workers run as the current OS user with `danger-full-access`, not in an OS sandbox. Supervisors share filesystem access and, in version 0.4.0, one global settings configuration regardless of view filters. Timeout autonomy is explicitly enabled globally and is off by default, bounded to 1–1440 minutes and one attempt per task until a human answer/manual retry, and cannot replace human-only authorization. Never publish secrets or private task/session data. Prefer private vulnerability reporting if the repository enables it; otherwise request a private contact without disclosing exploit details publicly.
