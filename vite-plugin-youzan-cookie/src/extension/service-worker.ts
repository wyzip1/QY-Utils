import type { BrowserId } from "../constants.js";
import { NATIVE_HOST_NAME } from "../constants.js";
import { syncCookiesToLocalhost, type BrowserCookie } from "./cookies.js";
import { classifyNativeError } from "./native-error.js";

interface StoredIdentity {
  instanceId: string;
}

interface NativeRequest {
  type?: string;
  requestId?: string;
  sourceURL?: string;
  targetURL?: string;
}

interface StoredSyncState {
  names?: string[];
  count?: number;
  syncedAt?: number;
  targetURL?: string;
}

type BridgeState = "connected" | "missing-host" | "forbidden" | "error";

interface BridgeStatus {
  state: BridgeState;
  message?: string;
  at?: number;
  /** 配置类错误（清单缺失/来源被拒）的长退避时间点。 */
  nextAttemptAt?: number;
}

const SYNC_STATE_KEY = "localhostSync";
const STATUS_KEY = "bridgeStatus";
const KEEPALIVE_ALARM = "native-host-keepalive";
/** chrome.alarms 的最小周期是 30 秒，这里作为 Service Worker 被回收后的兜底唤醒。 */
const KEEPALIVE_PERIOD_MINUTES = 0.5;
/** 清单缺失或来源被拒时，5 分钟内不再重试，避免刷屏与空转。 */
const BROKEN_RETRY_DELAY_MS = 5 * 60_000;

let nativePort: chrome.runtime.Port | undefined;
let reconnectDelayMs = 1_000;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

async function browserId(): Promise<BrowserId> {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Edg/")) return "edge";
  const brave = (navigator as Navigator & { brave?: { isBrave(): Promise<boolean> } }).brave;
  if (brave && (await brave.isBrave().catch(() => false))) return "brave";
  if (userAgent.includes("Chromium/")) return "chromium";
  // ego lite 等 Chromium 分支的 UA 与 Chrome 相同，真正取值由 Native Host
  // 启动器注入的 --browser 参数覆盖，这里只作为兜底。
  return "chrome";
}

async function identity(): Promise<StoredIdentity> {
  const stored = (await chrome.storage.local.get(["instanceId"])) as Partial<StoredIdentity>;
  const instanceId = stored.instanceId ?? crypto.randomUUID();
  if (!stored.instanceId) await chrome.storage.local.set({ instanceId });
  return { instanceId };
}

function isYouzanURL(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      ["http:", "https:"].includes(url.protocol) &&
      (hostname === "youzan.com" || hostname.endsWith(".youzan.com"))
    );
  } catch {
    return false;
  }
}

function isLocalhostURL(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.hostname === "localhost";
  } catch {
    return false;
  }
}

async function recordStatus(status: BridgeStatus): Promise<void> {
  await chrome.storage.local.set({ [STATUS_KEY]: { ...status, at: Date.now() } });
}

async function sendHello(): Promise<void> {
  const currentIdentity = await identity();
  nativePort?.postMessage({
    type: "hello",
    protocolVersion: 1,
    instance: {
      ...currentIdentity,
      browser: await browserId(),
      extensionVersion: chrome.runtime.getManifest().version,
    },
  });
}

async function handleRequest(request: NativeRequest): Promise<void> {
  if (request.type === "ping") {
    // 回应心跳：端口上的消息往返会重置 MV3 Service Worker 的闲置计时。
    nativePort?.postMessage({ type: "pong" });
    return;
  }
  if (request.type !== "syncCookies" || !request.requestId) return;
  try {
    const sourceURL = request.sourceURL ?? "";
    const targetURL = request.targetURL ?? "";
    if (!isYouzanURL(sourceURL)) {
      throw new Error("Cookie 来源必须是 youzan.com 或其子域");
    }
    if (!isLocalhostURL(targetURL)) {
      throw new Error("Cookie 同步目标必须是 localhost");
    }
    const stored = (await chrome.storage.local.get([SYNC_STATE_KEY])) as {
      [SYNC_STATE_KEY]?: StoredSyncState;
    };
    const previousNames = stored[SYNC_STATE_KEY]?.names ?? [];
    const browserCookies = (await chrome.cookies.getAll({ url: sourceURL })) as BrowserCookie[];
    const names = await syncCookiesToLocalhost(
      browserCookies,
      previousNames,
      targetURL,
      {
        set: details => chrome.cookies.set(details),
        remove: details => chrome.cookies.remove(details),
      },
    );
    await chrome.storage.local.set({
      [SYNC_STATE_KEY]: {
        names,
        count: names.length,
        syncedAt: Date.now(),
        targetURL: new URL(targetURL).origin,
      } satisfies StoredSyncState,
    });
    nativePort?.postMessage({
      type: "cookiesSynced",
      requestId: request.requestId,
      count: names.length,
    });
  } catch (error) {
    nativePort?.postMessage({
      type: "error",
      requestId: request.requestId,
      message: error instanceof Error ? error.message : "同步 Cookie 失败",
    });
  }
}

function scheduleReconnect(delayMs: number): void {
  if (reconnectTimer !== undefined) return;
  reconnectTimer = globalThis.setTimeout(() => {
    reconnectTimer = undefined;
    connectNativeHost();
  }, delayMs);
}

async function handleDisconnect(message: string | undefined): Promise<void> {
  const failure = classifyNativeError(message);
  // 配置类错误不会自愈：等用户重新运行 setup 或换浏览器，这里只做长间隔重试。
  const broken = failure !== "other";
  const nextDelayMs = broken ? BROKEN_RETRY_DELAY_MS : reconnectDelayMs;
  await recordStatus({
    state: failure === "missing-host" ? "missing-host" : failure === "forbidden" ? "forbidden" : "error",
    ...(message === undefined ? {} : { message }),
    ...(broken ? { nextAttemptAt: Date.now() + nextDelayMs } : {}),
  });
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000);
  scheduleReconnect(nextDelayMs);
}

function connectNativeHost(): void {
  if (nativePort) return;
  try {
    const port = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    nativePort = port;
    port.onMessage.addListener((message: NativeRequest) => {
      void handleRequest(message);
    });
    port.onDisconnect.addListener(() => {
      // 必须在监听器内读取 lastError，否则控制台会持续报
      // "Unchecked runtime.lastError: Specified native messaging host not found."
      const lastError = chrome.runtime.lastError?.message;
      nativePort = undefined;
      void handleDisconnect(lastError);
    });
    reconnectDelayMs = 1_000;
    void sendHello().then(() => {
      // 连接可能在 sendHello 期间就被断开，避免用“已连接”覆盖真实错误。
      if (nativePort === port) void recordStatus({ state: "connected" });
    });
  } catch (error) {
    nativePort = undefined;
    void handleDisconnect(error instanceof Error ? error.message : String(error));
  }
}

/** 幂等连接：清掉待执行的重连定时器，避免出现两个并存的端口。 */
function resetReconnectTimer(): void {
  if (reconnectTimer === undefined) return;
  clearTimeout(reconnectTimer);
  reconnectTimer = undefined;
}

async function reconnectIfDue(): Promise<void> {
  if (nativePort) return;
  const stored = (await chrome.storage.local.get([STATUS_KEY])) as {
    [STATUS_KEY]?: BridgeStatus;
  };
  const nextAttemptAt = stored[STATUS_KEY]?.nextAttemptAt ?? 0;
  if (Date.now() < nextAttemptAt) return;
  resetReconnectTimer();
  reconnectDelayMs = 1_000;
  connectNativeHost();
}

function ensureKeepAliveAlarm(): void {
  void chrome.alarms.create(KEEPALIVE_ALARM, {
    periodInMinutes: KEEPALIVE_PERIOD_MINUTES,
  });
}

ensureKeepAliveAlarm();
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === KEEPALIVE_ALARM) void reconnectIfDue();
});
chrome.runtime.onStartup.addListener(() => void reconnectIfDue());
chrome.runtime.onInstalled.addListener(() => void reconnectIfDue());
connectNativeHost();
