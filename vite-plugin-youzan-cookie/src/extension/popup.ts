function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`扩展弹窗缺少元素：${selector}`);
  return element;
}

interface BridgeStatus {
  state?: "connected" | "missing-host" | "forbidden" | "error";
}

const status = requiredElement<HTMLElement>("#status");

async function load(): Promise<void> {
  const stored = (await chrome.storage.local.get(["localhostSync", "bridgeStatus"])) as {
    localhostSync?: { count?: number; syncedAt?: number };
    bridgeStatus?: BridgeStatus;
  };
  const bridge = stored.bridgeStatus;
  if (bridge?.state === "missing-host") {
    status.textContent =
      "未找到 Native Host：请运行 npx vite-plugin-youzan-cookie setup，再重新加载本扩展。";
    return;
  }
  if (bridge?.state === "forbidden") {
    status.textContent = "Native Host 拒绝了本扩展，请重新运行 setup 后加载扩展。";
    return;
  }
  const sync = stored.localhostSync;
  if (sync?.syncedAt) {
    status.textContent = `已同步 ${sync.count ?? 0} 个 Cookie 到 localhost。`;
    return;
  }
  status.textContent =
    bridge?.state === "connected"
      ? "已连接 Native Host，等待 Vite 同步。"
      : "扩展已启用，正在连接 Native Host…";
}

void load();
