import { chmod, mkdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import type { Readable, Writable } from "node:stream";
import type { BrowserInstance } from "./runtime.js";
import { EXTENSION_ORIGIN, PACKAGE_NAME } from "./constants.js";
import { encodeFrame, FrameDecoder } from "./protocol.js";
import { runtimeDirectory } from "./paths.js";

interface NativeHostOptions {
  input: Readable;
  output: Writable;
  homeDirectory: string;
  origin: string;
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

function validateInstance(value: BrowserInstance | undefined): BrowserInstance {
  if (!value || !/^[A-Za-z0-9_-]{1,64}$/.test(value.instanceId)) {
    throw new Error("扩展实例 ID 无效");
  }
  if (!["chrome", "edge", "brave", "chromium"].includes(value.browser)) {
    throw new Error("浏览器类型无效");
  }
  if (typeof value.extensionVersion !== "string" || value.extensionVersion.length > 50) {
    throw new Error("扩展版本无效");
  }
  return value;
}

export function startNativeHost(options: NativeHostOptions): NativeHostController {
  if (
    options.origin !== EXTENSION_ORIGIN &&
    options.origin !== EXTENSION_ORIGIN.slice(0, -1)
  ) {
    throw new Error("Native Host 拒绝未知扩展来源");
  }

  const nativeDecoder = new FrameDecoder();
  const clientSockets = new Set<net.Socket>();
  const pendingRequests = new Map<string, net.Socket>();
  let instance: BrowserInstance | undefined;
  let server: net.Server | undefined;
  let opening: Promise<void> | undefined;
  let socketPath: string | undefined;
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

  const createSocket = async (nextInstance: BrowserInstance) => {
    instance = nextInstance;
    const socketDirectory = runtimeDirectory(options.homeDirectory);
    await mkdir(socketDirectory, { recursive: true, mode: 0o700 });
    await chmod(socketDirectory, 0o700);
    const socketName = createHash("sha256")
      .update(nextInstance.instanceId)
      .digest("hex")
      .slice(0, 16);
    socketPath = path.join(socketDirectory, `${socketName}.sock`);
    await unlink(socketPath).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
    if (closing) return;
    server = net.createServer(handleClient);
    await new Promise<void>((resolve, reject) => {
      server?.once("error", reject);
      server?.listen(socketPath, resolve);
    });
    await chmod(socketPath, 0o600).catch(() => {});
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
          void openSocket(validateInstance(message.instance)).catch(error => {
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

  return {
    async close() {
      closing = true;
      options.input.off("data", handleNativeData);
      for (const socket of clientSockets) socket.destroy();
      await opening?.catch(() => {});
      if (server) {
        await new Promise<void>(resolve => server?.close(() => resolve()));
      }
      if (socketPath) await unlink(socketPath).catch(() => {});
    },
  };
}

const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isEntryPoint) {
  try {
    startNativeHost({
      input: process.stdin,
      output: process.stdout,
      homeDirectory: homedir(),
      origin: process.argv[2] ?? "",
    });
  } catch (error) {
    process.stderr.write(
      `[${PACKAGE_NAME}] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
