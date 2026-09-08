export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "unspecified" | "no_restriction" | "lax" | "strict";
  session: boolean;
  expirationDate?: number;
  hostOnly: boolean;
  storeId: string;
}

export interface LocalhostCookieApi {
  set(details: chrome.cookies.SetDetails): Promise<unknown>;
  remove(details: chrome.cookies.CookieDetails): Promise<unknown>;
}

function normalizedTargetURL(targetURL: string): string {
  const url = new URL(targetURL);
  return `${url.protocol}//${url.hostname}/`;
}

export function createLocalhostCookieDetails(
  cookie: BrowserCookie,
  targetURL: string,
): chrome.cookies.SetDetails {
  const url = normalizedTargetURL(targetURL);
  const isSecureTarget = new URL(url).protocol === "https:";
  const sameSite = !isSecureTarget && cookie.sameSite === "no_restriction"
    ? "lax"
    : cookie.sameSite;
  return {
    url,
    name: cookie.name,
    value: cookie.value,
    path: "/",
    secure: isSecureTarget && cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite,
    ...(cookie.session || cookie.expirationDate === undefined
      ? {}
      : { expirationDate: cookie.expirationDate }),
    storeId: cookie.storeId,
  };
}

function uniqueCookiesByName(cookies: readonly BrowserCookie[]): BrowserCookie[] {
  const sorted = [...cookies].sort((left, right) => {
    const pathDifference = right.path.length - left.path.length;
    if (pathDifference !== 0) return pathDifference;
    return Number(right.hostOnly) - Number(left.hostOnly);
  });
  const selected = new Map<string, BrowserCookie>();
  for (const cookie of sorted) {
    if (!selected.has(cookie.name)) selected.set(cookie.name, cookie);
  }
  return [...selected.values()];
}

export async function syncCookiesToLocalhost(
  cookies: readonly BrowserCookie[],
  previousNames: readonly string[],
  targetURL: string,
  api: LocalhostCookieApi,
): Promise<string[]> {
  const target = normalizedTargetURL(targetURL);
  const selected = uniqueCookiesByName(cookies);
  const names = selected.map(cookie => cookie.name);
  const nameSet = new Set(names);
  const storeId = selected[0]?.storeId ?? "0";

  for (const name of previousNames) {
    if (!nameSet.has(name)) {
      await api.remove({ url: target, name, storeId });
    }
  }
  for (const cookie of selected) {
    await api.set(createLocalhostCookieDetails(cookie, target));
  }
  return names;
}
