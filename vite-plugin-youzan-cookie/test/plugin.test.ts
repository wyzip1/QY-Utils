import { describe, expect, test, vi } from "vitest";
import type { ConfigEnv, Plugin, UserConfig } from "vite";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import youzanCookie from "../src/index.js";
import { runtimeDirectory } from "../src/paths.js";

const serveEnv: ConfigEnv = {
  command: "serve",
  mode: "development",
  isSsrBuild: false,
  isPreview: false,
};

async function runConfigHook(plugin: Plugin, config: UserConfig): Promise<void> {
  if (typeof plugin.config !== "function") throw new Error("插件未提供 config 钩子");
  await plugin.config.call({} as never, config, serveEnv);
}

function encodeFrame(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

interface SyncRequest {
  sourceURL: string;
  targetURL: string;
}

async function createNativeHostFixture(
  homeDirectory: string,
  count = 2,
  onSync?: (request: SyncRequest) => void,
): Promise<net.Server> {
  const socketDirectory = runtimeDirectory(homeDirectory);
  await mkdir(socketDirectory, { recursive: true });
  const server = net.createServer(socket => {
    let pending = Buffer.alloc(0);
    socket.on("data", chunk => {
      pending = Buffer.concat([pending, Buffer.from(chunk)]);
      while (pending.length >= 4) {
        const length = pending.readUInt32LE(0);
        if (pending.length < length + 4) return;
        const request = JSON.parse(pending.subarray(4, length + 4).toString("utf8")) as {
          requestId: string;
          type: string;
          sourceURL?: string;
          targetURL?: string;
        };
        pending = pending.subarray(length + 4);
        if (request.type === "getInfo") {
          socket.write(
            encodeFrame({
              type: "instanceInfo",
              requestId: request.requestId,
              instance: {
                instanceId: "chrome-profile",
                browser: "chrome",
                extensionVersion: "1.1.0",
              },
            }),
          );
        }
        if (request.type === "syncCookies") {
          onSync?.({
            sourceURL: request.sourceURL ?? "",
            targetURL: request.targetURL ?? "",
          });
          socket.write(
            encodeFrame({ type: "cookiesSynced", requestId: request.requestId, count }),
          );
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(path.join(socketDirectory, "chrome-profile.sock"), resolve);
  });
  return server;
}

describe("youzanCookie", () => {
  test("仅作用于开发服务且不修改非有赞代理", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const proxy = { "/api": "https://example.com" };
    const config: UserConfig = { server: { proxy } };
    const plugin = youzanCookie({ viewURL: "https://example.youzan.com/login" });

    await runConfigHook(plugin, config);

    expect(plugin.apply).toBe("serve");
    expect(plugin.enforce).toBe("post");
    expect(config.server?.proxy).toBe(proxy);
    expect(warn).toHaveBeenCalledWith(
      "[vite-plugin-youzan-cookie] 未发现静态目标为 youzan.com 的 Vite 代理，已跳过 Cookie 同步。",
    );
    warn.mockRestore();
  });

  test("将有赞 Cookie 同步到 localhost 且不包装原代理", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-test-");
    process.env.HOME = homeDirectory;
    const syncRequests: SyncRequest[] = [];
    const nativeHost = await createNativeHostFixture(homeDirectory, 2, request => {
      syncRequests.push(request);
    });
    const originalConfigure = vi.fn();
    const objectProxy = {
      target: "https://shop.youzan.com",
      changeOrigin: true,
      configure: originalConfigure,
    };
    const proxy = {
      "/api": objectProxy,
      "/upload": "https://shop.youzan.com",
    };
    const config: UserConfig = { server: { port: 3000, proxy } };

    try {
      await runConfigHook(
        youzanCookie({
          viewURL: "https://youzandaifu.isv-dev.youzan.com/views/importMember",
          browser: "chrome",
        }),
        config,
      );

      expect(config.server?.proxy).toBe(proxy);
      expect(config.server?.proxy?.["/api"]).toBe(objectProxy);
      expect(config.server?.proxy?.["/upload"]).toBe("https://shop.youzan.com");
      expect(originalConfigure).not.toHaveBeenCalled();
      expect(syncRequests).toEqual([
        {
          sourceURL: "https://youzandaifu.isv-dev.youzan.com/views/importMember",
          targetURL: "http://localhost/",
        },
      ]);
    } finally {
      await new Promise<void>(resolve => nativeHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("扩展没有可同步 Cookie 时保留原代理并继续启动", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-empty-");
    process.env.HOME = homeDirectory;
    const nativeHost = await createNativeHostFixture(homeDirectory, 0);
    const originalProxy = { target: "https://shop.youzan.com", changeOrigin: true };
    const config: UserConfig = { server: { proxy: { "/api": originalProxy } } };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      await runConfigHook(
        youzanCookie({
          viewURL: "https://youzandaifu.isv-dev.youzan.com/views/importMember",
          browser: "chrome",
        }),
        config,
      );

      expect(config.server?.proxy?.["/api"]).toBe(originalProxy);
      expect(warn).toHaveBeenCalledWith(
        "[vite-plugin-youzan-cookie] 所选浏览器中没有可同步的有赞 Cookie；已保留原代理配置并继续启动 Vite。",
      );
    } finally {
      warn.mockRestore();
      await new Promise<void>(resolve => nativeHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("每次 Vite 启动都覆盖同步 localhost Cookie", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-refresh-");
    process.env.HOME = homeDirectory;
    const syncRequests: SyncRequest[] = [];
    const nativeHost = await createNativeHostFixture(homeDirectory, 1, request => {
      syncRequests.push(request);
    });

    try {
      for (let startup = 0; startup < 2; startup += 1) {
        await runConfigHook(
          youzanCookie({ viewURL: "https://shop.youzan.com/login", browser: "chrome" }),
          { server: { proxy: { "/api": "https://shop.youzan.com" } } },
        );
      }

      expect(syncRequests).toHaveLength(2);
    } finally {
      await new Promise<void>(resolve => nativeHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });
});
