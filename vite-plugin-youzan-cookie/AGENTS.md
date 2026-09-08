# 仓库指南（Repository Guidelines）

## 项目结构

本仓库发布 npm 包 `vite-plugin-youzan-cookie`，在 Vite 开发代理中复用 macOS Chromium 浏览器的有赞登录态。

- `src/index.ts` 是 Vite 插件入口，负责识别有赞代理并触发 localhost Cookie 同步。
- `src/runtime.ts`、`src/native-host.ts` 实现插件、Unix Socket 与浏览器扩展之间的通信。
- `src/extension/` 存放 Manifest V3 扩展源码；清单和弹窗 HTML 由安装 CLI 生成。
- `src/cli.ts` 提供 `setup`、`status`、`select` 和 `remove` 命令。
- `test/` 按公开接口组织 Vitest 测试，`dist/` 为生成产物。

## 开发与验证命令

- `npm install`：安装开发依赖和锁定版本。
- `npm run typecheck`：执行严格 TypeScript 类型检查。
- `npm test`：运行全部 Vitest 测试。
- `npm run test:watch`：开发期间监听测试变化。
- `npm run build`：使用 tsup 生成 ESM、CLI、Native Host 和扩展产物，再由 `tsc` 生成声明文件。
- `npm pack --dry-run`：检查最终 npm 包内容。

提交前依次执行类型检查、测试、构建和打包检查。

## 编码与测试规范

使用 TypeScript、ESM、两个空格缩进、双引号、分号和尾随逗号。启用严格类型检查，禁止用无依据的 `any` 绕过协议或 Vite 类型。函数和变量使用 `camelCase`，类型使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。

按红—绿循环开发，通过公开边界验证行为。测试文件命名为 `*.test.ts`。外部系统仅在边界模拟：浏览器注册使用临时用户目录，Native Messaging 使用真实临时 Socket；测试不得修改真实 `~/Library/Application Support`。

## 安全与提交要求

Cookie 值只能由扩展从有赞域名复制到浏览器的 localhost Cookie 存储，不得进入 Native Messaging 响应、Node.js 进程、日志或仓库文件。扩展权限仅允许有赞域名和 localhost；同步状态只能保存名称、数量与时间，不得保存值。现有浏览器运行时不得关闭、切换或操作其窗口。

提交信息使用 Conventional Commits，例如 `feat: 支持 Edge 配置档选择`。拉取请求需说明代理行为、安全影响和验证命令；涉及扩展界面时附脱敏截图。
