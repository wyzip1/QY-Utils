import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { EXTENSION_ID, type BrowserId } from "./constants.js";

export interface BrowserProfile {
  directory: string;
  name: string;
}

export interface BrowserDefinition {
  id: BrowserId;
  name: string;
  bundleId: string;
  applicationPath: string;
  executablePath: string;
  dataDirectory: string;
  nativeMessagingDirectory: string;
  /**
   * 除自身目录外，该浏览器实际还会读取 Native Messaging 清单的目录。
   * ego lite 就是这种情况：它沿用 Chrome 的用户级目录，不看自己的数据目录。
   */
  sharedNativeMessagingDirectories?: string[];
}

/** 某个浏览器全部生效的 Native Messaging 清单目录（去重，主目录优先）。 */
export function nativeMessagingDirectories(browser: BrowserDefinition): string[] {
  return [...new Set([browser.nativeMessagingDirectory, ...(browser.sharedNativeMessagingDirectories ?? [])])];
}

export interface DiscoveredBrowser extends BrowserDefinition {
  profiles: BrowserProfile[];
}

export function defaultBrowserDefinitions(homeDirectory: string): BrowserDefinition[] {
  const support = path.join(homeDirectory, "Library/Application Support");
  return [
    {
      id: "chrome",
      name: "Google Chrome",
      bundleId: "com.google.Chrome",
      applicationPath: "/Applications/Google Chrome.app",
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      dataDirectory: path.join(support, "Google/Chrome"),
      nativeMessagingDirectory: path.join(support, "Google/Chrome/NativeMessagingHosts"),
    },
    {
      id: "edge",
      name: "Microsoft Edge",
      bundleId: "com.microsoft.edgemac",
      applicationPath: "/Applications/Microsoft Edge.app",
      executablePath: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      dataDirectory: path.join(support, "Microsoft Edge"),
      nativeMessagingDirectory: path.join(support, "Microsoft Edge/NativeMessagingHosts"),
    },
    {
      id: "brave",
      name: "Brave Browser",
      bundleId: "com.brave.Browser",
      applicationPath: "/Applications/Brave Browser.app",
      executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      dataDirectory: path.join(support, "BraveSoftware/Brave-Browser"),
      nativeMessagingDirectory: path.join(
        support,
        "BraveSoftware/Brave-Browser/NativeMessagingHosts",
      ),
    },
    {
      id: "chromium",
      name: "Chromium",
      bundleId: "org.chromium.Chromium",
      applicationPath: "/Applications/Chromium.app",
      executablePath: "/Applications/Chromium.app/Contents/MacOS/Chromium",
      dataDirectory: path.join(support, "Chromium"),
      nativeMessagingDirectory: path.join(support, "Chromium/NativeMessagingHosts"),
    },
    {
      // ego lite（Citro Labs）是 Chromium 分支，数据目录与 Chrome 同构；
      // 但它查找 Native Messaging 清单时沿用的是 Chrome 的用户级目录，
      // 实测不会读取自己数据目录下的 NativeMessagingHosts。
      id: "ego",
      name: "ego lite",
      bundleId: "com.citrolabs.ego.lite",
      applicationPath: "/Applications/ego lite.app",
      executablePath: "/Applications/ego lite.app/Contents/MacOS/ego lite",
      dataDirectory: path.join(support, "Citro Labs/ego lite"),
      nativeMessagingDirectory: path.join(support, "Citro Labs/ego lite/NativeMessagingHosts"),
      sharedNativeMessagingDirectories: [path.join(support, "Google/Chrome/NativeMessagingHosts")],
    },
  ];
}

async function readProfiles(dataDirectory: string): Promise<BrowserProfile[]> {
  try {
    const localState = JSON.parse(
      await readFile(path.join(dataDirectory, "Local State"), "utf8"),
    ) as { profile?: { info_cache?: Record<string, { name?: string }> } };
    return Object.entries(localState.profile?.info_cache ?? {}).map(([directory, profile]) => ({
      directory,
      name: profile.name?.trim() || directory,
    }));
  } catch {
    return [];
  }
}

interface ExtensionSetting {
  path?: string;
  state?: number;
}

/**
 * 读取扩展在该配置档的安装记录。
 * Chromium 会把扩展设置写进 `Preferences` 或签名保护的 `Secure Preferences`，
 * 不同版本/分支落点不同（ego lite 就只写后者），两份都要看。
 */
async function readExtensionSetting(
  browser: BrowserDefinition,
  profileDirectory: string,
): Promise<ExtensionSetting | undefined> {
  for (const fileName of ["Preferences", "Secure Preferences"]) {
    try {
      const preferences = JSON.parse(
        await readFile(path.join(browser.dataDirectory, profileDirectory, fileName), "utf8"),
      ) as { extensions?: { settings?: Record<string, ExtensionSetting> } };
      const setting = preferences.extensions?.settings?.[EXTENSION_ID];
      if (setting) return setting;
    } catch {
      continue;
    }
  }
  return undefined;
}

async function profileHasExtension(
  browser: BrowserDefinition,
  profileDirectory: string,
  extensionDirectory: string,
): Promise<boolean> {
  const setting = await readExtensionSetting(browser, profileDirectory);
  if (!setting) return false;
  // 未写 state 表示默认启用；只有显式禁用（0）等状态才排除。
  if (setting.state !== undefined && setting.state !== 1) return false;
  const settingPath = setting.path;
  if (typeof settingPath !== "string" || settingPath.length === 0) return false;
  return (
    settingPath === extensionDirectory ||
    path.resolve(settingPath) === path.resolve(extensionDirectory)
  );
}

/**
 * 自动发现加载了本扩展的浏览器配置档。
 * 优先校验记住的配置档（preferredDirectory），失效时再扫描全部配置档。
 */
export async function findProfileWithExtension(
  browser: BrowserDefinition,
  extensionDirectory: string,
  preferredDirectory?: string,
): Promise<BrowserProfile | undefined> {
  if (preferredDirectory) {
    if (await profileHasExtension(browser, preferredDirectory, extensionDirectory)) {
      const known = (await readProfiles(browser.dataDirectory)).find(
        profile => profile.directory === preferredDirectory,
      );
      return {
        directory: preferredDirectory,
        name: known?.name || preferredDirectory,
      };
    }
  }
  const profiles = await readProfiles(browser.dataDirectory);
  for (const profile of profiles) {
    if (await profileHasExtension(browser, profile.directory, extensionDirectory)) {
      return profile;
    }
  }
  return undefined;
}

export async function discoverBrowsers(
  definitions: readonly BrowserDefinition[],
): Promise<DiscoveredBrowser[]> {
  const discovered = await Promise.all(
    definitions.map(async definition => {
      try {
        await access(definition.applicationPath);
        return { ...definition, profiles: await readProfiles(definition.dataDirectory) };
      } catch {
        return undefined;
      }
    }),
  );
  return discovered.filter((value): value is DiscoveredBrowser => value !== undefined);
}

const execFileAsync = promisify(execFile);

export async function isBrowserRunning(browser: BrowserDefinition): Promise<boolean> {
  try {
    await execFileAsync("pgrep", ["-f", browser.executablePath]);
    return true;
  } catch {
    return false;
  }
}

export async function launchBrowser(
  browser: BrowserDefinition,
  profileDirectory?: string,
): Promise<void> {
  const args = ["-b", browser.bundleId];
  if (profileDirectory) {
    args.push("--args", `--profile-directory=${profileDirectory}`);
  }
  await execFileAsync("open", args);
}
