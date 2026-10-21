/**
 * chrome.runtime.lastError 的文案归类。
 *
 * `connectNative` 失败不会抛异常，错误只会出现在 onDisconnect 时的 lastError 里；
 * 若不在监听器里读取，控制台就会持续打印 "Unchecked runtime.lastError"。
 * 其中“host not found”属于配置问题，重试再快也不会自愈，需要长退避并提示用户。
 */
export type NativeFailure = "missing-host" | "forbidden" | "other";

export function classifyNativeError(message: string | undefined): NativeFailure {
  const text = (message ?? "").toLowerCase();
  if (text.includes("host not found") || text.includes("native messaging host not found")) {
    return "missing-host";
  }
  if (text.includes("forbidden") || text.includes("not allowed")) {
    return "forbidden";
  }
  return "other";
}
