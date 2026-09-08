import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { BrowserId } from "./index.js";
import { PACKAGE_NAME } from "./constants.js";

export interface BrowserPreference {
  browser: BrowserId;
  /** 最近一次成功同步所在浏览器配置档目录，用于自动拉起。 */
  profileDirectory?: string;
  /** 最近一次成功同步的扩展实例 ID，用于确定性匹配。 */
  instanceId?: string;
}

function preferencePath(homeDirectory = homedir()): string {
  return path.join(
    homeDirectory,
    "Library/Application Support",
    PACKAGE_NAME,
    "preferences.json",
  );
}

export async function loadPreference(
  homeDirectory = homedir(),
): Promise<BrowserPreference | undefined> {
  try {
    const value = JSON.parse(await readFile(preferencePath(homeDirectory), "utf8")) as BrowserPreference;
    if (
      !["chrome", "edge", "brave", "chromium"].includes(value.browser)
    ) {
      return undefined;
    }
    return {
      browser: value.browser,
      ...(typeof value.profileDirectory === "string" && value.profileDirectory.length > 0
        ? { profileDirectory: value.profileDirectory }
        : {}),
      ...(typeof value.instanceId === "string" && value.instanceId.length > 0
        ? { instanceId: value.instanceId }
        : {}),
    };
  } catch {
    return undefined;
  }
}

export async function savePreference(
  preference: BrowserPreference,
  homeDirectory = homedir(),
): Promise<void> {
  const outputPath = preferencePath(homeDirectory);
  const directory = path.dirname(outputPath);
  const temporaryPath = path.join(directory, `.preferences.${randomUUID()}.tmp`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporaryPath, `${JSON.stringify(preference, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}
