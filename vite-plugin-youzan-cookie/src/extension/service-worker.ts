import type { BrowserId } from "../index.js";
import { NATIVE_HOST_NAME } from "../constants.js";
import { syncCookiesToLocalhost, type BrowserCookie } from "./cookies.js";

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

const SYNC_STATE_KEY = "localhostSync";

let nativePort: chrome.runtime.Port | undefined;
let reconnectDelayMs = 1_000;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

async function browserId(): Promise<BrowserId> {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Edg/")) return "edge";
  const brave = (navigator as Navigator & { brave?: { isBrave(): Promise<boolean> } }).brave;
  if (brave && (await brave.isBrave().catch(() => false))) return "brave";
  if (userAgent.includes("Chromium/")) return "chromium";
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

function scheduleReconnect(): void {
  if (reconnectTimer !== undefined) return;
  reconnectTimer = globalThis.setTimeout(() => {
    reconnectTimer = undefined;
    connectNativeHost();
  }, reconnectDelayMs);
  reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30_000);
}

function connectNativeHost(): void {
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST_NAME);
    nativePort.onMessage.addListener((message: NativeRequest) => {
      void handleRequest(message);
    });
    nativePort.onDisconnect.addListener(() => {
      nativePort = undefined;
      scheduleReconnect();
    });
    reconnectDelayMs = 1_000;
    void sendHello();
  } catch {
    nativePort = undefined;
    scheduleReconnect();
  }
}

connectNativeHost();
