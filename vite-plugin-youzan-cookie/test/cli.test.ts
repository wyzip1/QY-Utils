import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { runCli, type CliBrowserDefinition } from "../src/cli.js";

describe("vite-plugin-youzan-cookie CLI", () => {
  test("setup 将运行文件安装到用户目录并注册所选浏览器", async () => {
    const root = await mkdtemp("/tmp/vyc-cli-test-");
    const packageDirectory = path.join(root, "package");
    const homeDirectory = path.join(root, "home");
    const applicationPath = path.join(root, "Applications/Google Chrome.app");
    const nativeMessagingDirectory = path.join(
      homeDirectory,
      "Library/Application Support/Google/Chrome/NativeMessagingHosts",
    );
    const browser: CliBrowserDefinition = {
      id: "chrome",
      name: "Google Chrome",
      bundleId: "com.google.Chrome",
      applicationPath,
      executablePath: path.join(applicationPath, "Contents/MacOS/Google Chrome"),
      dataDirectory: path.join(homeDirectory, "Library/Application Support/Google/Chrome"),
      nativeMessagingDirectory,
    };
    await mkdir(path.join(packageDirectory, "extension"), { recursive: true });
    await mkdir(applicationPath, { recursive: true });
    await writeFile(path.join(packageDirectory, "native-host.js"), "// native host\n");
    await writeFile(path.join(packageDirectory, "extension/service-worker.js"), "// worker\n");
    await writeFile(path.join(packageDirectory, "extension/popup.js"), "// popup\n");
    const output: string[] = [];
    const nodeExecutable = "/path with spaces/node's bin/node";

    try {
      const exitCode = await runCli(["setup", "--browser", "chrome"], {
        homeDirectory,
        packageDirectory,
        nodeExecutable,
        browsers: [browser],
        stdout: line => output.push(line),
      });

      expect(exitCode).toBe(0);
      const manifest = JSON.parse(
        await readFile(
          path.join(nativeMessagingDirectory, "com.youzan.vite_plugin_cookie.json"),
          "utf8",
        ),
      ) as { name: string; path: string; allowed_origins: string[] };
      expect(manifest).toEqual({
        name: "com.youzan.vite_plugin_cookie",
        description: "Native bridge for vite-plugin-youzan-cookie",
        path: path.join(
          homeDirectory,
          "Library/Application Support/vite-plugin-youzan-cookie/native-host-launcher",
        ),
        type: "stdio",
        allowed_origins: ["chrome-extension://liiackjgjejkmbcnbdkkipneidpghmna/"],
      });
      const launcherPath = path.join(
        homeDirectory,
        "Library/Application Support/vite-plugin-youzan-cookie/native-host-launcher",
      );
      expect(await readFile(launcherPath, "utf8")).toBe(
        `#!/bin/sh\nexec '/path with spaces/node'\\''s bin/node' '${path.join(
          homeDirectory,
          "Library/Application Support/vite-plugin-youzan-cookie/native-host.js",
        )}' "$@"\n`,
      );
      expect((await stat(launcherPath)).mode & 0o777).toBe(0o700);
      const extensionManifest = JSON.parse(
        await readFile(
          path.join(
            homeDirectory,
            "Library/Application Support/vite-plugin-youzan-cookie/extension/manifest.json",
          ),
          "utf8",
        ),
      ) as { host_permissions: string[] };
      expect(extensionManifest.host_permissions).toEqual([
        "*://*.youzan.com/*",
        "http://localhost/*",
        "https://localhost/*",
      ]);
      expect(output.some(line => line.includes("扩展目录"))).toBe(true);

      output.length = 0;
      expect(
        await runCli(["status"], {
          homeDirectory,
          packageDirectory,
          browsers: [browser],
          stdout: line => output.push(line),
        }),
      ).toBe(0);
      expect(output).toContain("Google Chrome：已安装，Native Host 已注册");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
