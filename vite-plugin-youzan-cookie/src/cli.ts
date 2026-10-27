import { access, chmod, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import {
  defaultBrowserDefinitions,
  discoverBrowsers,
  nativeMessagingDirectories,
  type BrowserDefinition,
} from "./browsers.js";
import {
  EXTENSION_KEY,
  EXTENSION_ORIGIN,
  NATIVE_HOST_NAME,
  PACKAGE_NAME,
} from "./constants.js";
import { listConnectedInstances } from "./runtime.js";
import { loadPreference, savePreference } from "./preferences.js";
import { runtimeDirectory } from "./paths.js";

export type CliBrowserDefinition = BrowserDefinition;

interface CliEnvironment {
  homeDirectory?: string;
  packageDirectory?: string;
  nodeExecutable?: string;
  browsers?: BrowserDefinition[];
  stdout?: (line: string) => void;
}

interface ParsedArguments {
  command: string;
  browser?: string;
}

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "status";
  let browser: string | undefined;
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--browser") {
      browser = args[index + 1];
      if (!browser) throw new Error("--browser 缺少参数值");
      index += 1;
      continue;
    }
    throw new Error(`未知参数：${value}`);
  }
  return {
    command,
    ...(browser === undefined ? {} : { browser }),
  };
}

function extensionManifest(): string {
  return `${JSON.stringify(
    {
      manifest_version: 3,
      name: "Youzan Cookie Bridge",
      version: "1.2.1",
      description: "Synchronizes Youzan cookies to localhost for Vite development.",
      key: EXTENSION_KEY,
      permissions: ["alarms", "cookies", "nativeMessaging", "storage"],
      host_permissions: [
        "*://*.youzan.com/*",
        "http://localhost/*",
        "https://localhost/*",
      ],
      background: { service_worker: "service-worker.js", type: "module" },
      action: { default_popup: "popup.html", default_title: "Youzan Cookie Bridge" },
    },
    null,
    2,
  )}\n`;
}

const POPUP_HTML = `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Youzan Cookie Bridge</title></head>
  <body><main><p id="status">等待 Vite 同步…</p></main><script type="module" src="popup.js"></script></body>
</html>
`;

async function installRuntime(
  homeDirectory: string,
  packageDirectory: string,
  nodeExecutable: string,
  definitions: readonly BrowserDefinition[],
): Promise<{ installDirectory: string; extensionDirectory: string; launcherPath: string }> {
  const installDirectory = path.join(
    homeDirectory,
    "Library/Application Support",
    PACKAGE_NAME,
  );
  const extensionDirectory = path.join(installDirectory, "extension");
  const installedHost = path.join(installDirectory, "native-host.js");
  const launcherPath = path.join(installDirectory, "native-host-launcher");
  await mkdir(extensionDirectory, { recursive: true, mode: 0o700 });
  await copyFile(path.join(packageDirectory, "native-host.js"), installedHost);
  await writeFile(launcherPath, launcherScript(nodeExecutable, installedHost, definitions), "utf8");
  await chmod(launcherPath, 0o700);
  await copyFile(
    path.join(packageDirectory, "extension/service-worker.js"),
    path.join(extensionDirectory, "service-worker.js"),
  );
  await copyFile(
    path.join(packageDirectory, "extension/popup.js"),
    path.join(extensionDirectory, "popup.js"),
  );
  await writeFile(path.join(extensionDirectory, "manifest.json"), extensionManifest(), "utf8");
  await writeFile(path.join(extensionDirectory, "popup.html"), POPUP_HTML, "utf8");
  await chmod(installDirectory, 0o700);
  await chmod(installedHost, 0o700);
  return { installDirectory, extensionDirectory, launcherPath };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/**
 * 生成唯一的 Native Host 启动器。
 *
 * ego lite 与 Chrome 读取同一份清单（`Google/Chrome/NativeMessagingHosts`），
 * 扩展自身也无法从 UA 分辨两者，所以由启动器在启动瞬间识别真实浏览器：
 * 先看父进程命令行里的应用路径，再退回 CFBundleIdentifier，最后才不传标识。
 */
function launcherScript(
  nodeExecutable: string,
  installedHost: string,
  definitions: readonly BrowserDefinition[],
): string {
  const pathCases = definitions
    .map(browser => `  *${shellQuote(`${browser.applicationPath}/`)}*) browser=${browser.id} ;;`)
    .join("\n");
  const bundleCases = definitions
    .map(browser => `    ${browser.bundleId}) browser=${browser.id} ;;`)
    .join("\n");
  return `#!/bin/sh
# 由 vite-plugin-youzan-cookie setup 生成，请勿手工修改。
browser=
parent_command=$(/bin/ps -o command= -p "$PPID" 2>/dev/null)
case "$parent_command" in
${pathCases}
esac
if [ -z "$browser" ]; then
  case "\${__CFBundleIdentifier:-}" in
${bundleCases}
  esac
fi
if [ -z "$browser" ]; then
  exec ${shellQuote(nodeExecutable)} ${shellQuote(installedHost)} "$@"
fi
exec ${shellQuote(nodeExecutable)} ${shellQuote(installedHost)} "$@" "--browser=$browser"
`;
}

async function registerNativeHost(
  browser: BrowserDefinition,
  launcherPath: string,
): Promise<string[]> {
  const written: string[] = [];
  for (const directory of nativeMessagingDirectories(browser)) {
    await mkdir(directory, { recursive: true });
    const manifestPath = path.join(directory, `${NATIVE_HOST_NAME}.json`);
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          name: NATIVE_HOST_NAME,
          description: `Native bridge for ${PACKAGE_NAME}`,
          path: launcherPath,
          type: "stdio",
          allowed_origins: [EXTENSION_ORIGIN],
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    written.push(manifestPath);
  }
  return written;
}

/** 清单存在但指向的启动器被删除或移动时，浏览器会报 "host not found"。 */
async function launcherMissing(manifestPath: string): Promise<boolean> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { path?: unknown };
    if (typeof manifest.path !== "string" || manifest.path.length === 0) return true;
    return !(await access(manifest.path).then(
      () => true,
      () => false,
    ));
  } catch {
    return true;
  }
}

export async function runCli(args: readonly string[], environment: CliEnvironment = {}): Promise<number> {
  const homeDirectory = environment.homeDirectory ?? homedir();
  const packageDirectory =
    environment.packageDirectory ?? path.dirname(fileURLToPath(import.meta.url));
  const stdout = environment.stdout ?? (line => console.log(line));
  const definitions = environment.browsers ?? defaultBrowserDefinitions(homeDirectory);
  const parsed = parseArguments(args);

  if (parsed.command === "setup") {
    const browsers = await discoverBrowsers(definitions);
    const selected = parsed.browser
      ? browsers.filter(browser => browser.id === parsed.browser)
      : browsers;
    if (selected.length === 0) {
      throw new Error("未找到符合条件的 Chromium 浏览器");
    }
    const runtime = await installRuntime(
      homeDirectory,
      packageDirectory,
      environment.nodeExecutable ?? process.execPath,
      definitions,
    );
    for (const browser of selected) {
      await registerNativeHost(browser, runtime.launcherPath);
      // 旧版本按浏览器生成的启动器已不再被引用，顺手清理（仅限本次注册的浏览器）。
      await rm(path.join(runtime.installDirectory, `native-host-launcher-${browser.id}`), {
        force: true,
      });
    }
    stdout(`已为 ${selected.map(browser => browser.name).join("、")} 注册 Native Host。`);
    stdout(`扩展目录：${runtime.extensionDirectory}`);
    stdout(
      "请在目标浏览器配置档的扩展管理页（chrome://extensions，ego lite 同样适用）中选择“加载已解压的扩展程序”。",
    );
    return 0;
  }

  if (parsed.command === "status") {
    const browsers = await discoverBrowsers(definitions);
    if (browsers.length === 0) stdout("未检测到支持的 Chromium 浏览器。");
    for (const browser of browsers) {
      const manifestPaths = nativeMessagingDirectories(browser).map(directory =>
        path.join(directory, `${NATIVE_HOST_NAME}.json`),
      );
      let registered = 0;
      let brokenLauncher = false;
      for (const manifestPath of manifestPaths) {
        const exists = await access(manifestPath).then(
          () => true,
          () => false,
        );
        if (!exists) continue;
        registered += 1;
        if (await launcherMissing(manifestPath)) brokenLauncher = true;
      }
      stdout(
        `${browser.name}：已安装，Native Host ${
          registered === 0
            ? "未注册，请运行 setup"
            : brokenLauncher
              ? "已注册但启动器缺失，请重新运行 setup"
              : "已注册"
        }`,
      );
    }
    const extensionPath = path.join(
      homeDirectory,
      "Library/Application Support",
      PACKAGE_NAME,
      "extension/manifest.json",
    );
    const installed = await access(extensionPath).then(
      () => true,
      () => false,
    );
    stdout(`扩展文件：${installed ? "已安装" : "未安装，请运行 setup"}`);
    const instances = await listConnectedInstances(1_000);
    if (instances.length === 0) stdout("在线扩展实例：无");
    for (const instance of instances) {
      stdout(
        `在线扩展实例：${instance.info.browser} / ${instance.info.instanceId}`,
      );
    }
    return 0;
  }

  if (parsed.command === "select") {
    const instances = (await listConnectedInstances(1_000)).filter(instance => {
      return parsed.browser === undefined || instance.info.browser === parsed.browser;
    });
    if (instances.length === 0) throw new Error("没有找到匹配且在线的扩展实例");
    let selected = instances[0];
    if (instances.length > 1) {
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error("存在多个匹配实例，请在交互终端中选择");
      }
      const terminal = createInterface({ input: process.stdin, output: process.stdout });
      try {
        instances.forEach((instance, index) => {
          stdout(
            `${index + 1}. ${instance.info.browser} / ${instance.info.instanceId}`,
          );
        });
        const answer = await terminal.question("请选择编号：");
        selected = instances[Number(answer) - 1];
      } finally {
        terminal.close();
      }
    }
    if (!selected) throw new Error("选择无效");
    const previous = await loadPreference(homeDirectory);
    await savePreference(
      {
        browser: selected.info.browser,
        ...(previous?.profileDirectory === undefined
          ? {}
          : { profileDirectory: previous.profileDirectory }),
        instanceId: selected.info.instanceId,
      },
      homeDirectory,
    );
    stdout(
      `已选择默认浏览器：${selected.info.browser}`,
    );
    return 0;
  }

  if (parsed.command === "remove") {
    for (const browser of definitions) {
      for (const directory of nativeMessagingDirectories(browser)) {
        await rm(path.join(directory, `${NATIVE_HOST_NAME}.json`), { force: true });
      }
    }
    await rm(path.join(homeDirectory, "Library/Application Support", PACKAGE_NAME), {
      recursive: true,
      force: true,
    });
    await rm(runtimeDirectory(homeDirectory), { recursive: true, force: true });
    stdout("已移除 Native Host、扩展文件和本地偏好设置。");
    return 0;
  }

  throw new Error(`未知命令：${parsed.command}；支持 setup、status、select、remove`);
}

const invokedName = process.argv[1] ? path.basename(process.argv[1]) : "";
const isEntryPoint =
  invokedName === "cli.js" || invokedName === "vite-plugin-youzan-cookie";
if (isEntryPoint) {
  runCli(process.argv.slice(2)).then(
    code => {
      process.exitCode = code;
    },
    error => {
      console.error(`[${PACKAGE_NAME}] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    },
  );
}
