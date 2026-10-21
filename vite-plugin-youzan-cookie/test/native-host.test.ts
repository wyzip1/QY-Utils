import { access, mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { PassThrough } from "node:stream";
import { describe, expect, test } from "vitest";
import { EXTENSION_ORIGIN, type BrowserId } from "../src/constants.js";
import { encodeFrame, FrameDecoder } from "../src/protocol.js";
import { startNativeHost } from "../src/native-host.js";
import { runtimeDirectory } from "../src/paths.js";

async function waitForSocket(directory: string): Promise<string> {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try {
      await access(directory);
      const socket = (await readdir(directory)).find(entry => entry.endsWith(".sock"));
      if (socket) return path.join(directory, socket);
    } catch {
      // Native Host 尚未完成握手。
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error(`等待 Socket 超时：${directory}`);
}

async function readInstance(socketPath: string): Promise<unknown> {
  return await new Promise<unknown>((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const decoder = new FrameDecoder();
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write(encodeFrame({ type: "getInfo", requestId: "info" }));
    });
    socket.on("data", chunk => {
      const values = decoder.push(Buffer.from(chunk));
      const response = values[0] as { instance?: unknown } | undefined;
      if (response?.instance) {
        socket.destroy();
        resolve(response.instance);
      }
    });
  });
}

describe("Native Messaging Host", () => {
  test("扩展握手后通过用户级 Socket 暴露浏览器实例信息", async () => {
    const homeDirectory = await mkdtemp("/tmp/vh-");
    const input = new PassThrough();
    const output = new PassThrough();
    const host = startNativeHost({ input, output, homeDirectory, origin: EXTENSION_ORIGIN });
    const socketDirectory = runtimeDirectory(homeDirectory);

    try {
      input.write(
        encodeFrame({
          type: "hello",
          protocolVersion: 1,
          instance: {
            instanceId: "profile-1",
            browser: "chrome",
            extensionVersion: "1.0.0",
          },
        }),
      );
      const socketPath = await waitForSocket(socketDirectory);

      const response = await new Promise<unknown>((resolve, reject) => {
        const socket = net.createConnection(socketPath);
        const decoder = new FrameDecoder();
        socket.once("error", reject);
        socket.once("connect", () => {
          socket.write(encodeFrame({ type: "getInfo", requestId: "request-1" }));
        });
        socket.on("data", chunk => {
          const values = decoder.push(Buffer.from(chunk));
          if (values[0]) {
            socket.destroy();
            resolve(values[0]);
          }
        });
      });

      expect(response).toEqual({
        type: "instanceInfo",
        requestId: "request-1",
        instance: {
          instanceId: "profile-1",
          browser: "chrome",
          extensionVersion: "1.0.0",
        },
      });
    } finally {
      await host.close();
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("将 localhost Cookie 同步请求和结果双向转发", async () => {
    const homeDirectory = await mkdtemp("/tmp/vh-sync-");
    const input = new PassThrough();
    const output = new PassThrough();
    const host = startNativeHost({ input, output, homeDirectory, origin: EXTENSION_ORIGIN });
    const socketDirectory = runtimeDirectory(homeDirectory);

    try {
      input.write(
        encodeFrame({
          type: "hello",
          protocolVersion: 1,
          instance: {
            instanceId: "sync-profile",
            browser: "chrome",
            extensionVersion: "1.1.0",
          },
        }),
      );
      const socketPath = await waitForSocket(socketDirectory);
      const socket = net.createConnection(socketPath);
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("error", reject);
      });

      const forwarded = new Promise<unknown>(resolve => {
        const decoder = new FrameDecoder();
        output.on("data", chunk => {
          const values = decoder.push(Buffer.from(chunk));
          if (values[0]) resolve(values[0]);
        });
      });
      socket.write(
        encodeFrame({
          type: "syncCookies",
          requestId: "sync-1",
          sourceURL: "https://shop.youzan.com/login",
          targetURL: "http://localhost/",
        }),
      );
      await expect(forwarded).resolves.toEqual({
        type: "syncCookies",
        requestId: "sync-1",
        sourceURL: "https://shop.youzan.com/login",
        targetURL: "http://localhost/",
      });

      const response = new Promise<unknown>(resolve => {
        const decoder = new FrameDecoder();
        socket.on("data", chunk => {
          const values = decoder.push(Buffer.from(chunk));
          if (values[0]) resolve(values[0]);
        });
      });
      input.write(encodeFrame({ type: "cookiesSynced", requestId: "sync-1", count: 3 }));
      await expect(response).resolves.toEqual({
        type: "cookiesSynced",
        requestId: "sync-1",
        count: 3,
      });
      socket.destroy();
    } finally {
      await host.close();
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("启动器注入的浏览器标识覆盖扩展上报值", async () => {
    const homeDirectory = await mkdtemp("/tmp/vh-ego-");
    const input = new PassThrough();
    const output = new PassThrough();
    // ego lite 的 UA 与 Chrome 相同，扩展只能上报 chrome，权威值来自启动器。
    const host = startNativeHost({
      input,
      output,
      homeDirectory,
      origin: EXTENSION_ORIGIN,
      browser: "ego",
    });

    try {
      input.write(
        encodeFrame({
          type: "hello",
          protocolVersion: 1,
          instance: {
            instanceId: "ego-profile",
            browser: "chrome",
            extensionVersion: "1.2.0",
          },
        }),
      );
      const socketPath = await waitForSocket(runtimeDirectory(homeDirectory));

      await expect(readInstance(socketPath)).resolves.toEqual({
        instanceId: "ego-profile",
        browser: "ego",
        extensionVersion: "1.2.0",
      });
    } finally {
      await host.close();
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("拒绝未知的启动器浏览器标识", () => {
    const input = new PassThrough();
    const output = new PassThrough();
    expect(() =>
      startNativeHost({
        input,
        output,
        homeDirectory: "/tmp/vh-invalid",
        origin: EXTENSION_ORIGIN,
        browser: "safari" as unknown as BrowserId,
      }),
    ).toThrow("浏览器类型无效");
  });

  test("标准输入结束（扩展被回收）时释放 Socket 并通知退出", async () => {
    const homeDirectory = await mkdtemp("/tmp/vh-stdin-end-");
    const input = new PassThrough();
    const output = new PassThrough();
    let notifyClosed: () => void = () => {};
    const closed = new Promise<void>(resolve => {
      notifyClosed = resolve;
    });
    const host = startNativeHost({
      input,
      output,
      homeDirectory,
      origin: EXTENSION_ORIGIN,
      onInputClosed: notifyClosed,
    });

    try {
      input.write(
        encodeFrame({
          type: "hello",
          protocolVersion: 1,
          instance: {
            instanceId: "closed-profile",
            browser: "chrome",
            extensionVersion: "1.2.0",
          },
        }),
      );
      const socketPath = await waitForSocket(runtimeDirectory(homeDirectory));

      input.end();
      await closed;

      await expect(access(socketPath)).rejects.toThrow();
    } finally {
      await host.close();
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });
});
