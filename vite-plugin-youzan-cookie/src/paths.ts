import { createHash } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { PACKAGE_NAME } from "./constants.js";

export function installDirectory(homeDirectory = homedir()): string {
  return path.join(homeDirectory, "Library/Application Support", PACKAGE_NAME);
}

export function installedExtensionDirectory(homeDirectory = homedir()): string {
  return path.join(installDirectory(homeDirectory), "extension");
}

export function runtimeDirectory(homeDirectory = homedir()): string {
  const homeHash = createHash("sha256").update(homeDirectory).digest("hex").slice(0, 8);
  const userId = process.getuid?.() ?? 0;
  return path.join("/tmp", `${PACKAGE_NAME}-${userId}-${homeHash}`);
}
