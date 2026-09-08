function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`扩展弹窗缺少元素：${selector}`);
  return element;
}

const status = requiredElement<HTMLElement>("#status");

async function load(): Promise<void> {
  const stored = (await chrome.storage.local.get(["localhostSync"])) as {
    localhostSync?: { count?: number; syncedAt?: number };
  };
  const sync = stored.localhostSync;
  status.textContent = sync?.syncedAt
    ? `已同步 ${sync.count ?? 0} 个 Cookie 到 localhost。`
    : "扩展已启用，等待 Vite 同步。";
}

void load();
