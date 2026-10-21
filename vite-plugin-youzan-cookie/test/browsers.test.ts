import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { findProfileWithExtension, defaultBrowserDefinitions, type BrowserDefinition } from "../src/browsers.js";
import { EXTENSION_ID } from "../src/constants.js";

interface PreferencesWithExtension {
  extensions?: { settings?: Record<string, { path?: string; state?: number }> };
}

function chromeDefinition(dataDirectory: string): BrowserDefinition {
  return {
    id: "chrome",
    name: "Google Chrome",
    bundleId: "com.google.Chrome",
    applicationPath: "/Applications/Google Chrome.app",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    dataDirectory,
    nativeMessagingDirectory: path.join(dataDirectory, "NativeMessagingHosts"),
  };
}

async function writePreferences(
  dataDirectory: string,
  profile: string,
  extensions: PreferencesWithExtension["extensions"],
): Promise<void> {
  const directory = path.join(dataDirectory, profile);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "Preferences"),
    `${JSON.stringify(extensions === undefined ? {} : { extensions })}\n`,
    "utf8",
  );
}

describe("defaultBrowserDefinitions", () => {
  test("包含 ego lite 的 Chromium 目录与 Native Messaging 路径", () => {
    const definitions = defaultBrowserDefinitions("/Users/demo");
    expect(definitions).toContainEqual({
      id: "ego",
      name: "ego lite",
      bundleId: "com.citrolabs.ego.lite",
      applicationPath: "/Applications/ego lite.app",
      executablePath: "/Applications/ego lite.app/Contents/MacOS/ego lite",
      dataDirectory: "/Users/demo/Library/Application Support/Citro Labs/ego lite",
      nativeMessagingDirectory:
        "/Users/demo/Library/Application Support/Citro Labs/ego lite/NativeMessagingHosts",
      sharedNativeMessagingDirectories: [
        "/Users/demo/Library/Application Support/Google/Chrome/NativeMessagingHosts",
      ],
    });
  });
});

describe("findProfileWithExtension", () => {
  test("自动发现加载了扩展且启用的配置档", async () => {
    const root = await mkdtemp("/tmp/vyc-browsers-");
    const dataDirectory = path.join(root, "Chrome");
    const extensionDirectory = path.join(root, "extension");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "Local State"),
      `${JSON.stringify({
        profile: { info_cache: { Default: { name: "Default" }, "Profile 1": { name: "工作" } } },
      })}\n`,
      "utf8",
    );
    await writePreferences(dataDirectory, "Default", { settings: {} });
    await writePreferences(dataDirectory, "Profile 1", {
      settings: {
        [EXTENSION_ID]: { path: extensionDirectory, state: 1 },
      },
    });

    try {
      await expect(
        findProfileWithExtension(chromeDefinition(dataDirectory), extensionDirectory),
      ).resolves.toEqual({ directory: "Profile 1", name: "工作" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("记住的配置档已失效时回退扫描全部配置档", async () => {
    const root = await mkdtemp("/tmp/vyc-browsers-fallback-");
    const dataDirectory = path.join(root, "Chrome");
    const extensionDirectory = path.join(root, "extension");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "Local State"),
      `${JSON.stringify({
        profile: { info_cache: { Default: { name: "Default" }, "Profile 1": { name: "工作" } } },
      })}\n`,
      "utf8",
    );
    await writePreferences(dataDirectory, "Default", { settings: {} });
    await writePreferences(dataDirectory, "Profile 1", {
      settings: {
        [EXTENSION_ID]: { path: extensionDirectory, state: 1 },
      },
    });

    try {
      await expect(
        findProfileWithExtension(
          chromeDefinition(dataDirectory),
          extensionDirectory,
          "Default",
        ),
      ).resolves.toEqual({ directory: "Profile 1", name: "工作" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("记住的配置档仍然有效时直接使用", async () => {
    const root = await mkdtemp("/tmp/vyc-browsers-remembered-");
    const dataDirectory = path.join(root, "Chrome");
    const extensionDirectory = path.join(root, "extension");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "Local State"),
      `${JSON.stringify({
        profile: { info_cache: { "Profile 1": { name: "工作" } } },
      })}\n`,
      "utf8",
    );
    await writePreferences(dataDirectory, "Profile 1", {
      settings: {
        [EXTENSION_ID]: { path: extensionDirectory, state: 1 },
      },
    });

    try {
      await expect(
        findProfileWithExtension(
          chromeDefinition(dataDirectory),
          extensionDirectory,
          "Profile 1",
        ),
      ).resolves.toEqual({ directory: "Profile 1", name: "工作" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("路径尾斜杠差异仍能匹配", async () => {
    const root = await mkdtemp("/tmp/vyc-browsers-slash-");
    const dataDirectory = path.join(root, "Chrome");
    const extensionDirectory = path.join(root, "extension");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "Local State"),
      `${JSON.stringify({
        profile: { info_cache: { "Profile 1": { name: "工作" } } },
      })}\n`,
      "utf8",
    );
    await writePreferences(dataDirectory, "Profile 1", {
      settings: {
        [EXTENSION_ID]: { path: `${extensionDirectory}/`, state: 1 },
      },
    });

    try {
      await expect(
        findProfileWithExtension(chromeDefinition(dataDirectory), extensionDirectory),
      ).resolves.toEqual({ directory: "Profile 1", name: "工作" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("没有配置档加载扩展时返回空", async () => {
    const root = await mkdtemp("/tmp/vyc-browsers-none-");
    const dataDirectory = path.join(root, "Chrome");
    const extensionDirectory = path.join(root, "extension");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "Local State"),
      `${JSON.stringify({
        profile: { info_cache: { Default: { name: "Default" }, Work: { name: "工作" } } },
      })}\n`,
      "utf8",
    );
    await writePreferences(dataDirectory, "Default", {
      settings: {
        [EXTENSION_ID]: { path: extensionDirectory, state: 0 },
      },
    });
    await writePreferences(dataDirectory, "Work", { settings: {} });

    try {
      await expect(
        findProfileWithExtension(chromeDefinition(dataDirectory), extensionDirectory),
      ).resolves.toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("扩展记录只写在 Secure Preferences 且没有 state 时仍能发现", async () => {
    const root = await mkdtemp("/tmp/vyc-browsers-secure-");
    const dataDirectory = path.join(root, "ego lite");
    const extensionDirectory = path.join(root, "extension");
    const profileDirectory = path.join(dataDirectory, "Default");
    await mkdir(profileDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "Local State"),
      `${JSON.stringify({ profile: { info_cache: { Default: { name: "您的 ego" } } } })}\n`,
      "utf8",
    );
    await writeFile(
      path.join(profileDirectory, "Preferences"),
      `${JSON.stringify({ extensions: { settings: {} } })}\n`,
      "utf8",
    );
    await writeFile(
      path.join(profileDirectory, "Secure Preferences"),
      `${JSON.stringify({ extensions: { settings: { [EXTENSION_ID]: { path: extensionDirectory } } } })}\n`,
      "utf8",
    );

    try {
      await expect(
        findProfileWithExtension(chromeDefinition(dataDirectory), extensionDirectory),
      ).resolves.toEqual({ directory: "Default", name: "您的 ego" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
