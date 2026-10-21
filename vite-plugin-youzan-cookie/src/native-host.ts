import { chmod, mkdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import type { Readable, Writable } from "node:stream";
import type { BrowserInstance } from "./runtime.js";
import {
  EXTENSION_ORIGIN,
  isBrowserId,
  PACKAGE_NAME,
  type BrowserId,
} from "./constants.js";
import { encodeFrame, FrameDecoder } from "./protocol.js";
import { runtimeDirectory } from "./paths.js";

/**
 * 心跳间隔。MV3 Service Worker 空闲约 30 秒即被回收，回收后扩展里的
 * setTimeout 重连定时器一起消失，因此由宿主定期向扩展发消息，既验证管道
 * 仍然可用，也顺带重置扩展的闲置计时（Chrome 116+ 收到端口消息会延长存活）。
 */
const HEARTBEAT_INTERVAL_MS = 20_000;
const HEARTBEAT_FRAME = encodeFrame({ type: "ping" });

interface NativeHostOptions {
  input: Readable;
  output: Writable;
  homeDirectory: string;
  origin: string;
  /** 启动器注入的浏览器标识，优先于扩展上报值（ego lite 等分支无法靠 UA 区分）。 */
  browser?: BrowserId;
  /** 浏览器关闭 Native Messaging 管道时触发，供宿主进程自行退出。 */
  onInputClosed?: () => void;
}

export interface NativeHostController {
  close(): Promise<void>;
}

interface Message {
  type?: string;
  requestId?: string;
  protocolVersion?: number;
  instance?: BrowserInstance;
}

function validateInstance(
  value: BrowserInstance | undefined,
  browserOverride: BrowserId | undefined,
): BrowserInstance {
  if (!value || !/^[A-Za-z0-9_-]{1,64}$/.test(value.instanceId)) {
    throw new Error("扩展实例 ID 无效");
  }
  const browser = browserOverride ?? value.browser;
  if (!isBrowserId(browser)) {
    throw new Error("浏览器类型无效");
  }
  if (typeof value.extensionVersion !== "string" || value.extensionVersion.length > 50) {
    throw new Error("扩展版本无效");
  }
  return browserOverride === undefined ? value : { ...value, browser };
}

export function startNativeHost(options: NativeHostOptions): NativeHostController {
  if (
    options.origin !== EXTENSION_ORIGIN &&
    options.origin !== EXTENSION_ORIGIN.slice(0, -1)
  ) {
    throw new Error("Native Host 拒绝未知扩展来源");
  }
  if (options.browser !== undefined && !isBrowserId(options.browser)) {
    throw new Error("浏览器类型无效");
  }

  const browserOverride = options.browser;
  const nativeDecoder = new FrameDecoder();
  const clientSockets = new Set<net.Socket>();
  const pendingRequests = new Map<string, net.Socket>();
  let instance: BrowserInstance | undefined;
  let server: net.Server | undefined;
  let opening: Promise<void> | undefined;
  let socketPath: string | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closing = false;

  const sendClientError = (socket: net.Socket, requestId: string, message: string) => {
    socket.write(encodeFrame({ type: "error", requestId, message }));
  };

  const handleClient = (socket: net.Socket) => {
    clientSockets.add(socket);
    const decoder = new FrameDecoder();
    socket.once("close", () => {
      clientSockets.delete(socket);
      for (const [requestId, pendingSocket] of pendingRequests) {
        if (pendingSocket === socket) pendingRequests.delete(requestId);
      }
    });
    socket.on("data", chunk => {
      try {
        for (const value of decoder.push(Buffer.from(chunk))) {
          const message = value as Message;
          if (!message.requestId) {
            socket.destroy();
            return;
          }
          if (message.type === "getInfo" && instance) {
            socket.write(
              encodeFrame({ type: "instanceInfo", requestId: message.requestId, instance }),
            );
            continue;
          }
          if (message.type === "syncCookies") {
            pendingRequests.set(message.requestId, socket);
            options.output.write(encodeFrame(value));
            continue;
          }
          sendClientError(socket, message.requestId, "不支持的 Native Host 请求");
        }
      } catch {
        socket.destroy();
      }
    });
  };

  /**
   * 释放 Socket 与监听器。浏览器关闭管道（Service Worker 被回收、扩展被禁用、
   * 浏览器退出）时必须走到这里：否则进程会变成僵尸宿主，仍在 getInfo 上返回
   * 旧实例，让插件误判“已连接”，随后 syncCookies 永远等不到响应。
   */
  const shutdown = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    if (heartbeat !== undefined) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
    options.input.off("data", handleNativeData);
    options.input.off("end", handleInputClosed);
    options.input.off("close", handleInputClosed);
    options.output.off("error", handleOutputError);
    for (const socket of clientSockets) socket.destroy();
    clientSockets.clear();
    pendingRequests.clear();
    await opening?.catch(() => {});
    const listeningServer = server;
    server = undefined;
    if (listeningServer) {
      await new Promise<void>(resolve => listeningServer.close(() => resolve()));
    }
    if (socketPath) {
      await unlink(socketPath).catch(() => {});
      socketPath = undefined;
    }
  };

  const handleInputClosed = () => {
    void shutdown().then(() => options.onInputClosed?.());
  };

  const handleOutputError = () => {
    void shutdown().then(() => options.onInputClosed?.());
  };

  const createSocket = async (nextInstance: BrowserInstance) => {
    instance = nextInstance;
    const socketDirectory = runtimeDirectory(options.homeDirectory);
    await mkdir(socketDirectory, { recursive: true, mode: 0o700 });
    await chmod(socketDirectory, 0o700);
    const socketName = createHash("sha256")
      .update(nextInstance.instanceId)
      .digest("hex")
      .slice(0, 16);
    const nextSocketPath = path.join(socketDirectory, `${socketName}.sock`);
    await unlink(nextSocketPath).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
    if (closing) return;
    socketPath = nextSocketPath;
    const nextServer = net.createServer(handleClient);
    server = nextServer;
    await new Promise<void>((resolve, reject) => {
      nextServer.once("error", reject);
      nextServer.listen(nextSocketPath, resolve);
    });
    await chmod(nextSocketPath, 0o600).catch(() => {});
    if (closing) return;
    heartbeat ??= setInterval(() => {
      if (closing) return;
      options.output.write(HEARTBEAT_FRAME);
    }, HEARTBEAT_INTERVAL_MS);
    heartbeat.unref?.();
  };

  const openSocket = async (nextInstance: BrowserInstance) => {
    instance = nextInstance;
    if (server) return;
    opening ??= createSocket(nextInstance).finally(() => {
      opening = undefined;
    });
    await opening;
  };

  const handleNativeData = (chunk: Buffer | string) => {
    try {
      for (const value of nativeDecoder.push(Buffer.from(chunk))) {
        const message = value as Message;
        if (message.type === "hello") {
          if (message.protocolVersion !== 1) throw new Error("Native Messaging 协议版本不兼容");
          void openSocket(validateInstance(message.instance, browserOverride)).catch(error => {
            process.stderr.write(`[${PACKAGE_NAME}] ${String(error)}\n`);
          });
          continue;
        }
        if ((message.type === "cookiesSynced" || message.type === "error") && message.requestId) {
          const socket = pendingRequests.get(message.requestId);
          if (socket && !socket.destroyed) socket.write(encodeFrame(value));
          pendingRequests.delete(message.requestId);
        }
      }
    } catch (error) {
      process.stderr.write(
        `[${PACKAGE_NAME}] ${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  };

  options.input.on("data", handleNativeData);
  options.input.once("end", handleInputClosed);
  options.input.once("close", handleInputClosed);
  options.output.on("error", handleOutputError);

  return {
    close: shutdown,
  };
}

function browserArgument(argv: readonly string[]): string | undefined {
  return argv
    .find(argument => argument.startsWith("--browser="))
    ?.slice("--browser=".length);
}

const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntryPoint) {
  try {
    const requestedBrowser = browserArgument(process.argv.slice(2));
    if (requestedBrowser !== undefined && !isBrowserId(requestedBrowser)) {
      throw new Error(`不支持的浏览器标识：${requestedBrowser}`);
    }
    startNativeHost({
      input: process.stdin,
      output: process.stdout,
      homeDirectory: homedir(),
      origin: process.argv[2] ?? "",
      ...(requestedBrowser === undefined ? {} : { browser: requestedBrowser }),
      // 浏览器关闭管道后立即退出，避免遗留僵尸宿主继续响应 getInfo。
      onInputClosed: () => process.exit(0),
    });
  } catch (error) {
    process.stderr.write(
      `[${PACKAGE_NAME}] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
