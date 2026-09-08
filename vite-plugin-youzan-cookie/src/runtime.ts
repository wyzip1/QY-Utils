import { randomUUID } from "node:crypto";
import { access, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import net from "node:net";
import { createInterface } from "node:readline/promises";
import type { BrowserId } from "./index.js";
import { encodeFrame, FrameDecoder } from "./protocol.js";
import {
  defaultBrowserDefinitions,
  discoverBrowsers,
  findProfileWithExtension,
  isBrowserRunning,
  launchBrowser,
  type BrowserDefinition,
} from "./browsers.js";
import { loadPreference, savePreference } from "./preferences.js";
import { installedExtensionDirectory, runtimeDirectory } from "./paths.js";

const LOG_PREFIX = "[vite-plugin-youzan-cookie]";
const DEFAULT_WAIT_FOR_EXTENSION_MS = 120_000;
const REMINDER_INTERVAL_MS = 30_000;

export interface BrowserInstance {
  instanceId: string;
  browser: BrowserId;
  extensionVersion: string;
}

interface ProtocolResponse {
  type: string;
  requestId: string;
  instance?: BrowserInstance;
  count?: number;
  message?: string;
}

export interface ConnectedBrowserInstance {
  info: BrowserInstance;
  socketPath: string;
}

async function request(
  socketPath: string,
  type: "getInfo" | "syncCookies",
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<ProtocolResponse> {
  const requestId = randomUUID();
  return await new Promise<ProtocolResponse>((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const decoder = new FrameDecoder();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`等待浏览器扩展响应超时（${timeoutMs} ms）`));
    }, timeoutMs);

    const finish = (error?: Error, response?: ProtocolResponse) => {
      clearTimeout(timeout);
      socket.destroy();
      if (error) reject(error);
      else if (response) resolve(response);
    };

    socket.once("error", error => finish(error));
    socket.once("connect", () => {
      socket.write(encodeFrame({ type, requestId, ...payload }));
    });
    socket.on("data", chunk => {
      try {
        for (const value of decoder.push(Buffer.from(chunk))) {
          const response = value as ProtocolResponse;
          if (response.requestId !== requestId) continue;
          if (response.type === "error") {
            finish(new Error(response.message ?? "浏览器扩展返回未知错误"));
            return;
          }
          finish(undefined, response);
          return;
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

export async function listConnectedInstances(
  timeoutMs: number,
): Promise<ConnectedBrowserInstance[]> {
  let entries: string[];
  try {
    entries = await readdir(runtimeDirectory());
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const results = await Promise.all(
    entries
      .filter(entry => entry.endsWith(".sock"))
      .map(async entry => {
        const socketPath = path.join(runtimeDirectory(), entry);
        try {
          const response = await request(socketPath, "getInfo", {}, timeoutMs);
          return response.instance ? { info: response.instance, socketPath } : undefined;
        } catch {
          return undefined;
        }
      }),
  );
  return results.filter((value): value is ConnectedBrowserInstance => value !== undefined);
}

async function chooseFromList<T>(items: readonly T[], label: (item: T) => string): Promise<T> {
  if (items.length === 1 && items[0]) return items[0];
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("检测到多个在线实例且当前终端不可交互，请只保留一个目标浏览器实例在线");
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    items.forEach((item, index) => console.log(`${index + 1}. ${label(item)}`));
    const answer = await terminal.question("请选择编号：");
    const selected = items[Number(answer) - 1];
    if (!selected) throw new Error("选择无效");
    return selected;
  } finally {
    terminal.close();
  }
}

function matchingInstances(
  instances: readonly ConnectedBrowserInstance[],
  browser: BrowserId | undefined,
  instanceId?: string,
): ConnectedBrowserInstance[] {
  const byBrowser = instances.filter(instance => {
    return browser === undefined || instance.info.browser === browser;
  });
  if (instanceId) {
    const exact = byBrowser.filter(instance => instance.info.instanceId === instanceId);
    if (exact.length > 0) return exact;
  }
  return byBrowser;
}

async function resolveBrowserAndProfile(
  browserId: BrowserId | undefined,
  rememberedProfileDirectory: string | undefined,
): Promise<{ browser: BrowserDefinition; profileDirectory: string | undefined }> {
  const installed = await discoverBrowsers(defaultBrowserDefinitions(homedir()));
  const candidates = browserId
    ? installed.filter(browser => browser.id === browserId)
    : installed;
  if (candidates.length === 0) throw new Error("没有找到符合条件的已安装 Chromium 浏览器");
  const browser = await chooseFromList(candidates, item => item.name);
  const profile = await findProfileWithExtension(
    browser,
    installedExtensionDirectory(),
    rememberedProfileDirectory,
  );
  return { browser, profileDirectory: profile?.directory };
}

async function startOfflineBrowser(
  browser: BrowserDefinition,
  profileDirectory: string | undefined,
): Promise<"already-running" | "launched" | "profile-opened"> {
  if (await isBrowserRunning(browser)) {
    if (profileDirectory) {
      // 为已运行的浏览器新开目标配置档窗口，不关闭或切换现有窗口。
      await launchBrowser(browser, profileDirectory);
      return "profile-opened";
    }
    return "already-running";
  }
  await launchBrowser(browser, profileDirectory);
  return "launched";
}

async function extensionGuidance(): Promise<string> {
  const extensionDirectory = installedExtensionDirectory();
  try {
    await access(path.join(extensionDirectory, "manifest.json"));
  } catch {
    return "扩展尚未安装，请先运行 npx vite-plugin-youzan-cookie setup 并重新启动 Vite";
  }
  return (
    `请在目标浏览器的扩展管理页（chrome://extensions）启用开发者模式，` +
    `选择“加载已解压的扩展程序”并载入：${extensionDirectory}`
  );
}

async function waitForInstances(
  timeoutMs: number,
  onWaiting?: (waitedMs: number) => void,
): Promise<ConnectedBrowserInstance[]> {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let nextReminderAt = startedAt + REMINDER_INTERVAL_MS;
  while (Date.now() < deadline) {
    const instances = await listConnectedInstances(Math.min(1_000, timeoutMs));
    if (instances.length > 0) return instances;
    await new Promise(resolve => setTimeout(resolve, 200));
    if (onWaiting && Date.now() >= nextReminderAt) {
      onWaiting(Date.now() - startedAt);
      nextReminderAt = Date.now() + REMINDER_INTERVAL_MS;
    }
  }
  return [];
}

export async function syncNativeCookies(
  options: {
    browser?: BrowserId;
    connectTimeoutMs: number;
    waitForExtensionMs?: number;
  },
  sourceURL: string,
  targetURL: string,
): Promise<number> {
  const preference = await loadPreference();
  const browser = options.browser ?? preference?.browser;
  let instances = await listConnectedInstances(options.connectTimeoutMs);
  let matches = matchingInstances(instances, browser, preference?.instanceId);
  let profileDirectory = preference?.profileDirectory;
  let guidance = "";
  if (matches.length === 0) {
    const waitMs = options.waitForExtensionMs ?? DEFAULT_WAIT_FOR_EXTENSION_MS;
    const resolved = await resolveBrowserAndProfile(browser, profileDirectory);
    profileDirectory = resolved.profileDirectory;
    const browserState = await startOfflineBrowser(resolved.browser, profileDirectory);
    if (browserState === "already-running") {
      guidance = await extensionGuidance();
      console.info(
        `${LOG_PREFIX} 目标浏览器已运行但扩展未连接；为保护现有窗口，不会自动打开或切换配置档。\n` +
          `  ${guidance}。\n` +
          `  正在等待扩展连接（最多 ${Math.round(waitMs / 1000)} 秒，期间每 30 秒提示一次；无需同步可忽略）...`,
      );
    } else if (browserState === "profile-opened") {
      console.info(
        `${LOG_PREFIX} 已为目标配置档 ${profileDirectory} 新开浏览器窗口（未关闭或切换现有窗口），正在等待扩展连接（最多 ${Math.round(waitMs / 1000)} 秒）...`,
      );
    } else {
      guidance = await extensionGuidance();
      console.info(
        `${LOG_PREFIX} 已启动目标浏览器${profileDirectory ? `（配置档：${profileDirectory}）` : ""}，正在等待扩展连接（最多 ${Math.round(waitMs / 1000)} 秒）...\n` +
          `  ${guidance}。`,
      );
    }
    instances = await waitForInstances(waitMs, waitedMs => {
      console.info(
        `${LOG_PREFIX} 仍在等待扩展连接（已等待 ${Math.round(waitedMs / 1000)} 秒）...` +
          (guidance ? `\n  ${guidance}。` : ""),
      );
    });
    matches = matchingInstances(instances, browser, preference?.instanceId);
  }
  if (matches.length === 0) {
    throw new Error(
      `没有找到匹配且已连接的浏览器扩展实例。${guidance || (await extensionGuidance())}`,
    );
  }
  const selected = await chooseFromList(
    matches,
    item => `${item.info.browser} / ${item.info.instanceId}`,
  );
  const response = await request(
    selected.socketPath,
    "syncCookies",
    { sourceURL, targetURL },
    options.connectTimeoutMs,
  );
  await savePreference({
    browser: selected.info.browser,
    ...(profileDirectory === undefined ? {} : { profileDirectory }),
    instanceId: selected.info.instanceId,
  });
  return response.count ?? 0;
}
