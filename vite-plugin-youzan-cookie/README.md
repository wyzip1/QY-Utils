# vite-plugin-youzan-cookie

在 Vite 开发页面中复用 macOS 原生 Chromium 浏览器的有赞登录 Cookie。扩展会将当前登录态复制到 `localhost`，由浏览器自动携带，再通过原有 Vite proxy 转发。插件不会启动 Playwright、下载额外浏览器，也不会操作已经打开的窗口或标签页。

## 安装

```bash
npm install --save-dev vite-plugin-youzan-cookie
npx vite-plugin-youzan-cookie setup --browser chrome
```

`setup` 会把扩展和 Native Host 安装到：

```text
~/Library/Application Support/vite-plugin-youzan-cookie/
```

随后在目标浏览器中打开扩展管理页，启用开发者模式，选择“加载已解压的扩展程序”，并加载命令输出的扩展目录。扩展需要有赞域名及 `localhost` 的 Cookie 权限，无需填写任何配置。

## Vite 配置

```ts
import { defineConfig } from "vite";
import youzanCookie from "vite-plugin-youzan-cookie";

export default defineConfig({
  plugins: [
    youzanCookie({
      viewURL: "https://youzandaifu.isv-dev.youzan.com/views/importMember",
      browser: "chrome",
      connectTimeoutMs: 30_000,
      // 浏览器已运行但扩展未连接时，等待手动加载扩展的最长时间（默认 120 秒）
      waitForExtensionMs: 120_000,
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://example.youzan.com",
        changeOrigin: true,
      },
    },
  },
});
```

`viewURL` 为必填项，用于明确指定读取哪个有赞站点的原生登录态；路径不会被打开或导航。插件仅在 `vite serve` 时生效，并自动识别静态 `target` 为 `youzan.com` 或其子域的代理。每次 Vite 启动时，扩展都会读取适用于 `viewURL` 的 Cookie，覆盖同步到 `localhost` 并删除上次同步但已失效的名称。Vite 不再修改 `proxyReq`，浏览器请求头会直接显示同步后的 Cookie。

`browser` 可以省略。插件会优先使用上次选择；未选择时查询可用浏览器并在终端提供选择。插件会自动扫描所选浏览器各配置档的 `Preferences`，找出已加载本扩展的配置档（首次在某个配置档手动“加载已解压的扩展程序”后即会被自动发现并记住）。浏览器完全退出时，以该配置档启动；浏览器已运行但扩展未连接时，为已运行进程新开该配置档窗口（不关闭或切换现有窗口）。多个实例在线时，优先按上次成功同步的 `instanceId` 确定性匹配。若任何配置档都未加载扩展，则打印加载扩展的具体步骤并等待连接（默认 120 秒，每 30 秒提示一次，可用 `waitForExtensionMs` 调整），超时后保留原代理配置并继续启动 Vite。

## 管理命令

```bash
npx vite-plugin-youzan-cookie status
npx vite-plugin-youzan-cookie select --browser chrome
npx vite-plugin-youzan-cookie setup --browser edge
npx vite-plugin-youzan-cookie remove
```

- `status` 查看浏览器、Native Host、扩展文件和在线实例。
- `select` 保存默认浏览器并记住当前扩展实例，供后续确定性匹配。
- `remove` 删除本包安装的 Native Host、扩展文件和偏好设置；不会删除浏览器配置档或已经同步到浏览器的 localhost Cookie。

## 支持范围与安全

首版支持 macOS 的 Google Chrome、Microsoft Edge、Brave 和 Chromium，仅读取普通配置档的非分区有赞 Cookie。扩展权限限定为有赞域名与 `localhost`；Cookie 值不会进入 Node.js、Native Host 响应或日志，但同步副本会存入浏览器 Cookie 存储。

localhost Cookie 不按端口隔离，会发送给本机所有 localhost 服务。同步时 Cookie 变为 host-only、路径统一为 `/`；HTTP 开发服务会移除 `Secure`，并将 `SameSite=None` 调整为 `Lax`。请只运行可信的本地服务。动态 `server.proxy.router` 目标不会被自动接管。
