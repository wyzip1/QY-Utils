import { mkdir, mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { resolveConfig } from "vite";
import youzanCookie from "../src/index.js";
import { runtimeDirectory } from "../src/paths.js";

function frame(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  return Buffer.concat([header, body]);
}

async function startBrowserFixture(homeDirectory: string): Promise<net.Server> {
  const directory = runtimeDirectory(homeDirectory);
  await mkdir(directory, { recursive: true });
  const server = net.createServer(socket => {
    let pending = Buffer.alloc(0);
    socket.on("data", chunk => {
      pending = Buffer.concat([pending, Buffer.from(chunk)]);
      if (pending.length < 4) return;
      const length = pending.readUInt32LE(0);
      if (pending.length < length + 4) return;
      const request = JSON.parse(pending.subarray(4, length + 4).toString("utf8")) as {
        type: string;
        requestId: string;
      };
      if (request.type === "getInfo") {
        socket.write(
          frame({
            type: "instanceInfo",
            requestId: request.requestId,
            instance: {
              instanceId: "vite-integration",
              browser: "chrome",
              extensionVersion: "1.0.0",
            },
          }),
        );
      } else {
        socket.write(
          frame({
            type: "cookiesSynced",
            requestId: request.requestId,
            count: 1,
          }),
        );
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(path.join(directory, "vite.sock"), resolve);
  });
  return server;
}

describe("Vite 集成", () => {
  const originalHome = process.env.HOME;

  afterEach(() => {
    process.env.HOME = originalHome;
  });

  test("真实配置解析会同步 Cookie 且保留字符串形式的有赞代理", async () => {
    const homeDirectory = await mkdtemp("/tmp/vyc-vite-");
    process.env.HOME = homeDirectory;
    const browser = await startBrowserFixture(homeDirectory);

    try {
      const resolved = await resolveConfig(
        {
          configFile: false,
          logLevel: "silent",
          plugins: [
            youzanCookie({
              viewURL: "https://shop.youzan.com/login",
              browser: "chrome",
            }),
          ],
          server: { proxy: { "/api": "https://shop.youzan.com" } },
        },
        "serve",
      );

      const proxy = resolved.server.proxy?.["/api"];
      expect(proxy).toBe("https://shop.youzan.com");
    } finally {
      await new Promise<void>(resolve => browser.close(() => resolve()));
      await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
      await rm(homeDirectory, { recursive: true, force: true });
    }
  });
});
