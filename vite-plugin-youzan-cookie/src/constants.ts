export const PACKAGE_NAME = "vite-plugin-youzan-cookie";
export const NATIVE_HOST_NAME = "com.youzan.vite_plugin_cookie";
export const EXTENSION_ID = "liiackjgjejkmbcnbdkkipneidpghmna";
export const EXTENSION_ORIGIN = `chrome-extension://${EXTENSION_ID}/`;
export const EXTENSION_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApq7I2LRJuWoNL0uWyshFhuE+nakCPk/sA5LN/+300GGsihPcQb8Mq6tGT2wPfY9UnMqRKkEN+yWAS94kiUTqX5sMknpMPSV/ggTJfKXN7oJf5TgsCYeQ8N0+tn/Z/7GOOxBGww5ASOhoym9RnU+rDngrpF8svAHvmhwNVFf7ZP5BDiDMH1s+4qNC2Mgepu69OaOqblDxs9F3CsITiRUkgtD71wAg3ajiI8X7K0bDsdkb1p7kNy+gcqcxJozi9x8AFS6uVgE5Pe9h7FfZlUlyvZoZU8dGxUZw3xloYix7WrnFikZHzCcqNPRbwSOqsvVwSWf3qjMG/F8zzIn6Au5+FQIDAQAB";

/**
 * 支持的浏览器标识。扩展上报值与启动器注入值共用同一份白名单，
 * 新增 Chromium 分支（例如 ego lite）时只需在此登记。
 */
export const BROWSER_IDS = ["chrome", "edge", "brave", "chromium", "ego"] as const;

export type BrowserId = (typeof BROWSER_IDS)[number];

export function isBrowserId(value: unknown): value is BrowserId {
  return typeof value === "string" && (BROWSER_IDS as readonly string[]).includes(value);
}
