import type { Plugin, ProxyOptions, UserConfig } from "vite";
import type { BrowserId } from "./constants.js";
import { syncNativeCookies } from "./runtime.js";

export type { BrowserId } from "./constants.js";

export interface YouzanCookiePluginOptions {
  viewURL: string;
  browser?: BrowserId;
  connectTimeoutMs?: number;
  waitForExtensionMs?: number;
}

const LOG_PREFIX = "[vite-plugin-youzan-cookie]";

function proxyTarget(value: string | ProxyOptions): string | undefined {
  if (typeof value === "string") return value;
  return typeof value.target === "string" ? value.target : undefined;
}

function isYouzanTarget(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "youzan.com" || hostname.endsWith(".youzan.com");
  } catch {
    return false;
  }
}

function parseViewURL(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("viewURL 必须是有效 URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("viewURL 仅支持 http 或 https");
  }
  if (!isYouzanTarget(url.href)) {
    throw new Error("viewURL 必须指向 youzan.com 或其子域");
  }
  return url;
}

export default function youzanCookie(options: YouzanCookiePluginOptions): Plugin {
  const connectTimeoutMs = options.connectTimeoutMs ?? 30_000;
  return {
    name: "vite-plugin-youzan-cookie",
    apply: "serve",
    enforce: "post",
    async config(config: UserConfig) {
      const proxy = config.server?.proxy;
      const youzanEntries = Object.values(proxy ?? {}).flatMap(value => {
        const target = proxyTarget(value);
        return target !== undefined && isYouzanTarget(target) ? [target] : [];
      });

      if (youzanEntries.length === 0) {
        console.warn(`${LOG_PREFIX} 未发现静态目标为 youzan.com 的 Vite 代理，已跳过 Cookie 同步。`);
        return;
      }

      try {
        if (!Number.isFinite(connectTimeoutMs) || connectTimeoutMs <= 0) {
          throw new Error("connectTimeoutMs 必须是大于 0 的有限数字");
        }
        if (
          options.waitForExtensionMs !== undefined &&
          (!Number.isFinite(options.waitForExtensionMs) || options.waitForExtensionMs <= 0)
        ) {
          throw new Error("waitForExtensionMs 必须是大于 0 的有限数字");
        }
        const viewURL = parseViewURL(options.viewURL);
        const targetURL = `${config.server?.https ? "https" : "http"}://localhost/`;
        const count = await syncNativeCookies(
          {
            ...(options.browser === undefined ? {} : { browser: options.browser }),
            connectTimeoutMs,
            ...(options.waitForExtensionMs === undefined
              ? {}
              : { waitForExtensionMs: options.waitForExtensionMs }),
          },
          viewURL.href,
          targetURL,
        );
        if (count === 0) throw new Error("所选浏览器中没有可同步的有赞 Cookie");
        console.info(`${LOG_PREFIX} 已同步 ${count} 个 Cookie 到 localhost，浏览器将自动携带。`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`${LOG_PREFIX} ${message}；已保留原代理配置并继续启动 Vite。`);
      }
    },
  };
}
