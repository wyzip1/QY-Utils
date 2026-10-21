# vite-plugin-youzan-cookie

在 Vite 开发页面中复用 macOS 原生 Chromium 浏览器的有赞登录 Cookie。扩展会将当前登录态复制到 `localhost`，由浏览器自动携带，再通过原有 Vite proxy 转发。插件不会启动 Playwright、下载额外浏览器，也不会操作已经打开的窗口或标签页。

## 安装

```bash
npm install --save-dev vite-plugin-youzan-cookie
npx vite-plugin-youzan-cookie setup --browser ego
```

`--browser` 支持 `chrome`、`edge`、`brave`、`chromium`、`ego`（ego lite）。省略时注册所有已安装的浏览器。

从 1.1.x 升级时注意：`npm install` 只更新 `node_modules`，扩展与 Native Host 装在 `~/Library/Application Support/vite-plugin-youzan-cookie/`，需要重新执行一次 `setup`，再到每个已加载扩展的浏览器里点“重新加载”，新逻辑才会生效。

`setup` 会把扩展和 Native Host 安装到：

```text
~/Library/Application Support/vite-plugin-youzan-cookie/
```

随后在目标浏览器中打开扩展管理页（`chrome://extensions`，ego lite 同样适用），启用开发者模式，选择“加载已解压的扩展程序”，并加载命令输出的扩展目录。扩展需要有赞域名及 `localhost` 的 Cookie 权限，无需填写任何配置。

## Vite 配置

```ts
import { defineConfig } from "vite";
import youzanCookie from "vite-plugin-youzan-cookie";

export default defineConfig({
  plugins: [
    youzanCookie({
      viewURL: "https://youzandaifu.isv-dev.youzan.com/views/importMember",
      browser: "ego",
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

浏览器标识由 Native Host 启动器注入。扩展只能靠 UA 猜浏览器，而 ego lite 的 UA 与 Chrome 完全相同，所以由启动器在启动瞬间识别真实浏览器：先看父进程命令行里的应用路径（`/Applications/ego lite.app/` 等），再退回 `__CFBundleIdentifier`，都识别不到才交给扩展上报值。所有浏览器共用同一个 `native-host-launcher`，因此即便两个浏览器读取同一份清单也不会混淆。

ego lite 还有一处与常见 Chromium 分支不同：它查找 Native Messaging 清单时用的是 Chrome 的用户级目录 `~/Library/Application Support/Google/Chrome/NativeMessagingHosts`，而不是自己数据目录下的 `NativeMessagingHosts`。`setup --browser ego` 会同时写入这两处，只写自己的目录 ego 会报 `Specified native messaging host not found`。

## 扩展为什么会“突然失效”

扩展是 Manifest V3 的 Service Worker，浏览器空闲约 30 秒就会回收它。回收后扩展里的 `setTimeout` 重连定时器随之消失，如果没有其他事件唤醒，扩展就一直处于离线状态——表现就是“Vite 启动时同步失败，手动 reload 扩展后才恢复”。当前版本对此做了五层处理：

1. **心跳保活**：Native Host 每 20 秒向扩展发一条 `ping`，扩展回 `pong`。端口消息往返会持续重置 Service Worker 的闲置计时，正常使用时它不再被回收。
2. **闹钟兜底**：扩展注册了 30 秒周期的 `chrome.alarms`，即使被强制回收（内存压力、浏览器重启），闹钟也会重新拉起 Service Worker 并重连宿主。
3. **宿主随管道退出**：浏览器关闭 Native Messaging 管道后，宿主立即释放 Socket 并退出。此前宿主会变成僵尸进程，仍能回应 `getInfo`，让插件误判“已连接”，随后 `syncCookies` 永远等不到响应——这就是“看起来连着但同步不动”的根因。
4. **一次自动重试**：首次同步请求超时会重新扫描在线实例并重试一次，避免握手抖动直接失败。扫描时也会顺手清理已退出的宿主遗留的 Socket 文件。
5. **错误只报一次**：扩展会读取 `chrome.runtime.lastError`，不再刷 “Unchecked runtime.lastError”；清单缺失、来源被拒这类不会自愈的错误改为 5 分钟长退避，并在弹窗里给出修复提示。

仍需要手动操作的只有：扩展被禁用/移除、在另一个配置档加载扩展、或浏览器大版本更新后重置了扩展开关。

### 报 `Specified native messaging host not found` 怎么办

这条错误只有一个含义：本浏览器里找不到可用的 Native Host 清单，或清单里 `path` 指向的启动器已经不存在（POSIX 下 `exec` 失败即 `ENOENT`，Chrome 统一报成 host not found）。常见原因有三种：只给一个浏览器跑了 `setup`，而扩展同时也装在另一个浏览器里；升级后旧的启动器被替换；以及 ego lite 这类“只看 Chrome 目录”的分支没有在 Chrome 目录下拿到清单。

```bash
npx vite-plugin-youzan-cookie status
```

`status` 会逐个浏览器显示 `已注册` / `未注册，请运行 setup` / `已注册但启动器缺失，请重新运行 setup`。按提示对相应浏览器重跑 `setup`，然后在扩展管理页点一次“重新加载”即可。`setup` 会为 ego lite 同时写入 Chrome 的清单目录，因此不会再出现“Chrome 正常、ego 报错”的情况。

## 管理命令

```bash
npx vite-plugin-youzan-cookie status
npx vite-plugin-youzan-cookie select --browser chrome
npx vite-plugin-youzan-cookie setup --browser edge
npx vite-plugin-youzan-cookie remove
```

- `status` 查看浏览器、Native Host（含启动器是否缺失）、扩展文件和在线实例。
- `select` 保存默认浏览器并记住当前扩展实例，供后续确定性匹配。
- `remove` 删除本包安装的 Native Host、扩展文件和偏好设置；不会删除浏览器配置档或已经同步到浏览器的 localhost Cookie。

## 支持范围与安全

首版支持 macOS 的 Google Chrome、Microsoft Edge、Brave、Chromium 和 ego lite，仅读取普通配置档的非分区有赞 Cookie。扩展权限限定为有赞域名与 `localhost`；Cookie 值不会进入 Node.js、Native Host 响应或日志，但同步副本会存入浏览器 Cookie 存储。

localhost Cookie 不按端口隔离，会发送给本机所有 localhost 服务。同步时 Cookie 变为 host-only、路径统一为 `/`；HTTP 开发服务会移除 `Secure`，并将 `SameSite=None` 调整为 `Lax`。请只运行可信的本地服务。动态 `server.proxy.router` 目标不会被自动接管。
