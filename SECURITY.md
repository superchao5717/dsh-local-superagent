# 安全说明 / Security

## 信任与权限边界

**本插件不是安全沙箱。** Worker 以当前 OS 用户、`danger-full-access` 运行，可能读取和修改该用户可访问的文件。工作区选择、会话工具过滤、系统提示词、看板状态与 `.gitignore` 都不等同于 OS 隔离。不要向插件布置不可信指令；任务应明确允许访问的目录、可修改文件及禁止行为。

多个 Superagent 的队列、设置与会话上下文独立，但磁盘访问共享，不提供文件锁。并发写入前划分 scope 或使用项目自己的 worktree；重要数据另行做好备份。Supervisor 审查不等于代码安全审计。

## 人工授权与自主续办

- 任务默认本地交付；未明确授权不得 commit、push、部署或安装软件。这是行为约束，不是技术访问控制。
- 超时自主续办默认关闭，逐主管显式开启；等待时间 1–1440 分钟，默认 30 分钟。每任务在人回答或手动重试前最多尝试一次，记录为主管自主决策，不伪造用户回答。
- 自主决策只能推进原授权范围内的普通方案选择，不能扩大权限。登录、认证、权限确认、付款、新增授权等必须由人完成，不能因超时或任务文本要求而绕过。
- 暂停阻止新派发与超时续办，不会撤销已运行 worker 的 OS 权限。停止任务也不保证撤销已经发生的外部操作。

## 数据与费用

运行账本位于 `~/.dsh/state/local-superagent/board.json`，会话由 DSH 管理。任务、报告和文件内容可能通过所选 DSH 模型提供商处理；模型调用可能产生费用。卸载插件不会自动删除账本和会话。不要把密钥、私有任务、账本、原始会话或机器配置放入 Git、Issue、Release 或截图。

## 报告漏洞 / Reporting

影响当前开发版本的问题请提供最小复现、Node/DSH/OS 版本及预期与实际行为；不要附带凭据或真实用户数据。普通非敏感缺陷可提交到 [Issues](https://github.com/superchao5717/dsh-local-superagent/issues)。敏感漏洞请优先使用仓库 Security 页的私密漏洞报告功能（如果已启用）；本项目未承诺已启用该功能或固定响应时限。若不可用，不要公开可利用细节或密钥；可先提交不含利用细节的联系请求，等待维护者确定私密渠道。

目前实机验证仅覆盖 Windows / DSH 0.2.1-rc.5；离线回归和收录不等于安全审计或跨平台保证。

**English summary:** Workers run as the current OS user with `danger-full-access`, not in an OS sandbox. Supervisors share filesystem access. Timeout autonomy is off by default, bounded to 1–1440 minutes and one attempt per task until a human answer/manual retry, and cannot replace human-only authorization. Never publish secrets or private task/session data. Prefer private vulnerability reporting if the repository enables it; otherwise request a private contact without disclosing exploit details publicly.
