import { access, readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { EXTENSION_ID } from "./constants.js";
import type { BrowserId } from "./index.js";

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

async function profileHasExtension(
  browser: BrowserDefinition,
  profileDirectory: string,
  extensionDirectory: string,
): Promise<boolean> {
  try {
    const preferences = JSON.parse(
      await readFile(
        path.join(browser.dataDirectory, profileDirectory, "Preferences"),
        "utf8",
      ),
    ) as {
      extensions?: { settings?: Record<string, { path?: string; state?: number }> };
    };
    const setting = preferences.extensions?.settings?.[EXTENSION_ID];
    if (!setting || setting.state !== 1) return false;
    const settingPath = setting.path;
    if (typeof settingPath !== "string" || settingPath.length === 0) return false;
    return (
      settingPath === extensionDirectory ||
      path.resolve(settingPath) === path.resolve(extensionDirectory)
    );
  } catch {
    return false;
  }
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
