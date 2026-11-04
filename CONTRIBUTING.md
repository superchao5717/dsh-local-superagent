# 贡献 / Contributing

感谢贡献。请先阅读 [README](README.md)、[接口契约](docs/CONTRACT.md) 和 [安全说明](SECURITY.md)。这是独立社区插件，不是 DeepSeek 官方产品。

## 本地验证 / Local checks

需要 Node.js >= 22。当前没有 npm 依赖，不需要执行 install，也不需要安装插件或启动 DSH：

```sh
npm test
npm run check
npm pack --dry-run
```

测试使用临时账本与模拟会话，不调用真实模型、GPU、账号或真实运行账本。实机集成验证目前仅限 Windows / DSH 0.2.1-rc.5；报告其他环境时请写明版本与具体通过范围，不将离线测试等同于实机安装成功。

An optional [CI example](docs/ci.example.yml) covers Node.js 22/24 on Linux/Windows with read-only repository permissions. It is **not enabled or remotely validated** in this preparation. A maintainer may review and copy it to `.github/workflows/ci.yml` when workflow authorization is available. It has no install/build/publish steps or release credentials.

## 提交建议 / Pull requests

- 先描述问题、预期行为和验证范围；功能修改补回归测试。不要顺带重写无关模块。
- 保留他人的未提交改动。多代理共享磁盘，不构成文件隔离；先约定写入范围。
- 不提交 `.env`、凭据、机器配置、运行账本、任务正文、会话记录或包含用户数据的截图。`.gitignore` 不是访问控制或泄漏检测器。
- 变更模型、权限、自动续办或人工回答边界时，明确说明影响并验证竞态；不得用自主续办绕过登录、付款或新增授权。
- 保留现有 MIT 版权与架构参考说明。贡献按项目 MIT 许可提供。

## 打包与发布 / Packaging and release

包保持 `private: true`，不发布 npm；包名 `@local/dsh-local-superagent` 用于已有 profile 兼容。运行时是 JavaScript，无构建脚本，无需预编译。`npm pack --dry-run` 用于审核白名单：运行代码、patch、locale、图标、许可证和使用文档；测试、CI 示例与收录示例不是运行依赖，不纳入包。

Maintainers can create a tarball with `npm pack --pack-destination <release-directory>` after reviewing its contents. GitHub Release may attach it under the stable asset name `dsh-local-superagent.tgz`. The matching `latest/download/` URL is only usable after that asset is published and verified; a sample URL is not evidence of publication. Do not attach private ledgers, session logs or machine configuration.

## awesome-dsh-plugin 收录示例

本仓库仅准备 [单文件条目示例](docs/awesome-dsh-plugin-entry.yml)，没有自动提交第三方 PR。提交前重读[上游贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，将条目以 `data/plugins/superchao5717__dsh-local-superagent.yml` 提交；不要手工修改上游生成的 README。

仓库必须创建满 **1 天**。本仓库创建时间为 **2026-11-04T08:24:38Z**，最早在 **2026-11-05T08:24:38Z** 达到这一时间门槛；这不是收录保证。还需核对 `dsh.bundle`、真实功能描述、仓库 `dsh-plugin` topic，以及示例 tarball 对应的正式 Release 资产。没有 npm 发布不影响收录；本次不生成截图或位图图标。
