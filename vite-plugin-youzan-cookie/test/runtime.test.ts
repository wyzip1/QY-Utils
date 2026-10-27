import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { runtimeDirectory } from "../src/paths.js";

const browserMocks = vi.hoisted(() => ({
  discoverBrowsers: vi.fn(),
  isBrowserRunning: vi.fn(),
  launchBrowser: vi.fn(),
  findProfileWithExtension: vi.fn(),
}));

vi.mock("../src/browsers.js", () => ({
  defaultBrowserDefinitions: vi.fn(() => []),
  discoverBrowsers: browserMocks.discoverBrowsers,
  isBrowserRunning: browserMocks.isBrowserRunning,
  launchBrowser: browserMocks.launchBrowser,
  findProfileWithExtension: browserMocks.findProfileWithExtension,
}));

import { syncNativeCookies } from "../src/runtime.js";

function encodeFrame(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

async function createNativeHostFixture(
  homeDirectory: string,
  options: {
    instanceId?: string;
    count?: number;
    socketName?: string;
    browser?: string;
  } = {},
): Promise<net.Server> {
  const socketDirectory = runtimeDirectory(homeDirectory);
  await mkdir(socketDirectory, { recursive: true });
  const instanceId = options.instanceId ?? "delayed-profile";
  const count = options.count ?? 3;
  const browser = options.browser ?? "chrome";
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
        };
        pending = pending.subarray(length + 4);
        if (request.type === "getInfo") {
          socket.write(
            encodeFrame({
              type: "instanceInfo",
              requestId: request.requestId,
              instance: {
                instanceId,
                browser,
                extensionVersion: "1.1.0",
              },
            }),
          );
        }
        if (request.type === "syncCookies") {
          socket.write(
            encodeFrame({ type: "cookiesSynced", requestId: request.requestId, count }),
          );
        }
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      path.join(socketDirectory, `${options.socketName ?? instanceId}.sock`),
      resolve,
    );
  });
  return server;
}

const chromeDefinition = {
  id: "chrome",
  name: "Google Chrome",
  bundleId: "com.google.Chrome",
  applicationPath: "/Applications/Google Chrome.app",
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  dataDirectory: "/tmp/chrome-data",
  nativeMessagingDirectory: "/tmp/native-hosts",
  profiles: [],
};

const egoDefinition = {
  id: "ego",
  name: "ego lite",
  bundleId: "com.citrolabs.ego.lite",
  applicationPath: "/Applications/ego lite.app",
  executablePath: "/Applications/ego lite.app/Contents/MacOS/ego lite",
  dataDirectory: "/tmp/ego-data",
  nativeMessagingDirectory: "/tmp/ego-native-hosts",
  profiles: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("syncNativeCookies", () => {
  test("浏览器已运行时等待用户打开目标配置档并在超时内继续同步", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    let nativeHost: net.Server | undefined;
    const delayedHost = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void createNativeHostFixture(homeDirectory).then(server => {
          nativeHost = server;
          resolve();
        }, reject);
      }, 50);
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 500 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(3);
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
    } finally {
      await delayedHost;
      if (nativeHost) {
        await new Promise<void>(resolve => nativeHost?.close(() => resolve()));
      }
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("浏览器已运行时按 waitForExtensionMs 等待并在期间连接成功", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-waitms-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    let nativeHost: net.Server | undefined;
    const delayedHost = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void createNativeHostFixture(homeDirectory).then(server => {
          nativeHost = server;
          resolve();
        }, reject);
      }, 50);
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100, waitForExtensionMs: 2_000 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(3);
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
    } finally {
      await delayedHost;
      if (nativeHost) {
        await new Promise<void>(resolve => nativeHost?.close(() => resolve()));
      }
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("浏览器已运行但扩展始终未连接时超时并抛出可操作错误", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-timeout-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100, waitForExtensionMs: 300 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).rejects.toThrow("没有找到匹配且已连接的浏览器扩展实例");
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("目标浏览器已运行但扩展未连接"),
      );
    } finally {
      info.mockRestore();
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("浏览器已退出时启动浏览器并等待扩展连接", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-launch-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(false);
    let nativeHost: net.Server | undefined;
    const delayedHost = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void createNativeHostFixture(homeDirectory).then(server => {
          nativeHost = server;
          resolve();
        }, reject);
      }, 50);
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100, waitForExtensionMs: 2_000 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(3);
      expect(browserMocks.launchBrowser).toHaveBeenCalledTimes(1);
    } finally {
      await delayedHost;
      if (nativeHost) {
        await new Promise<void>(resolve => nativeHost?.close(() => resolve()));
      }
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("浏览器已运行时自动发现扩展配置档并新开窗口，成功后记住配置档与实例", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-profile-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    browserMocks.findProfileWithExtension.mockResolvedValue({
      directory: "Profile 1",
      name: "Profile 1",
    });
    let nativeHost: net.Server | undefined;
    const delayedHost = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void createNativeHostFixture(homeDirectory).then(server => {
          nativeHost = server;
          resolve();
        }, reject);
      }, 50);
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100, waitForExtensionMs: 2_000 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(3);
      expect(browserMocks.findProfileWithExtension).toHaveBeenCalledWith(
        chromeDefinition,
        expect.stringContaining("extension"),
        undefined,
      );
      expect(browserMocks.launchBrowser).toHaveBeenCalledWith(chromeDefinition, "Profile 1");
      const preference = JSON.parse(
        await readFile(
          path.join(
            homeDirectory,
            "Library/Application Support/vite-plugin-youzan-cookie/preferences.json",
          ),
          "utf8",
        ),
      ) as { browser: string; profileDirectory?: string; instanceId?: string };
      expect(preference).toEqual({
        browser: "chrome",
        profileDirectory: "Profile 1",
        instanceId: "delayed-profile",
      });
    } finally {
      await delayedHost;
      if (nativeHost) {
        await new Promise<void>(resolve => nativeHost?.close(() => resolve()));
      }
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("浏览器已退出时以自动发现的配置档启动", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-profile-launch-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(false);
    browserMocks.findProfileWithExtension.mockResolvedValue({
      directory: "Profile 1",
      name: "Profile 1",
    });
    let nativeHost: net.Server | undefined;
    const delayedHost = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void createNativeHostFixture(homeDirectory).then(server => {
          nativeHost = server;
          resolve();
        }, reject);
      }, 50);
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100, waitForExtensionMs: 2_000 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(3);
      expect(browserMocks.launchBrowser).toHaveBeenCalledWith(chromeDefinition, "Profile 1");
    } finally {
      await delayedHost;
      if (nativeHost) {
        await new Promise<void>(resolve => nativeHost?.close(() => resolve()));
      }
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("记住的 instanceId 在多个在线实例中确定性匹配", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-instance-");
    process.env.HOME = homeDirectory;
    await mkdir(
      path.join(homeDirectory, "Library/Application Support/vite-plugin-youzan-cookie"),
      { recursive: true },
    );
    await writeFile(
      path.join(
        homeDirectory,
        "Library/Application Support/vite-plugin-youzan-cookie/preferences.json",
      ),
      `${JSON.stringify({ browser: "chrome", instanceId: "remembered-1" }, null, 2)}\n`,
      "utf8",
    );
    const remembered = await createNativeHostFixture(homeDirectory, {
      instanceId: "remembered-1",
      count: 3,
    });
    const other = await createNativeHostFixture(homeDirectory, {
      instanceId: "other-2",
      count: 5,
      socketName: "other-2",
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(3);
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>(resolve => remembered.close(() => resolve()));
      await new Promise<void>(resolve => other.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("指定 ego 但 ego 不可用时回退到已连接的 Chrome 实例", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-fallback-online-");
    process.env.HOME = homeDirectory;
    // ego 未安装，只有 Chrome 可选。
    browserMocks.discoverBrowsers.mockResolvedValue([chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const chromeHost = await createNativeHostFixture(homeDirectory, {
      instanceId: "chrome-live",
      count: 4,
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "ego", connectTimeoutMs: 100 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(4);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("已回退到 chrome"));
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      await new Promise<void>(resolve => chromeHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("ego 在线时优先 ego，不因 Chrome 同时在线而回退", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-fallback-priority-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([egoDefinition, chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const egoHost = await createNativeHostFixture(homeDirectory, {
      instanceId: "ego-live",
      count: 7,
      socketName: "ego-live",
      browser: "ego",
    });
    const chromeHost = await createNativeHostFixture(homeDirectory, {
      instanceId: "chrome-live",
      count: 4,
      socketName: "chrome-live",
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "ego", connectTimeoutMs: 100 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(7);
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("已回退"));
      const preference = JSON.parse(
        await readFile(
          path.join(
            homeDirectory,
            "Library/Application Support/vite-plugin-youzan-cookie/preferences.json",
          ),
          "utf8",
        ),
      ) as { browser: string; instanceId?: string };
      expect(preference).toMatchObject({ browser: "ego", instanceId: "ego-live" });
    } finally {
      warn.mockRestore();
      await new Promise<void>(resolve => egoHost.close(() => resolve()));
      await new Promise<void>(resolve => chromeHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("目标本身就是 chrome 时不回退到其他浏览器", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-no-fallback-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([egoDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    const egoHost = await createNativeHostFixture(homeDirectory, {
      instanceId: "ego-live",
      count: 7,
      browser: "ego",
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "chrome", connectTimeoutMs: 100, waitForExtensionMs: 200 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).rejects.toThrow("没有找到符合条件的已安装 Chromium 浏览器");
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>(resolve => egoHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });

  test("ego 已安装但扩展未连接时在等待超时后回退到 Chrome", async () => {
    const originalHome = process.env.HOME;
    const homeDirectory = await mkdtemp("/tmp/vyc-runtime-fallback-wait-");
    process.env.HOME = homeDirectory;
    browserMocks.discoverBrowsers.mockResolvedValue([egoDefinition, chromeDefinition]);
    browserMocks.isBrowserRunning.mockResolvedValue(true);
    browserMocks.findProfileWithExtension.mockResolvedValue(undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const chromeHost = await createNativeHostFixture(homeDirectory, {
      instanceId: "chrome-live",
      count: 5,
    });

    try {
      await expect(
        syncNativeCookies(
          { browser: "ego", connectTimeoutMs: 100, waitForExtensionMs: 300 },
          "https://shop.youzan.com/login",
          "http://localhost/",
        ),
      ).resolves.toBe(5);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("已回退到 chrome"));
      expect(browserMocks.launchBrowser).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      info.mockRestore();
      await new Promise<void>(resolve => chromeHost.close(() => resolve()));
      process.env.HOME = originalHome;
      await rm(homeDirectory, { recursive: true, force: true });
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    }
  });
});
