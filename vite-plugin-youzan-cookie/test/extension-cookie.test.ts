import { describe, expect, test, vi } from "vitest";
import {
  createLocalhostCookieDetails,
  syncCookiesToLocalhost,
  type BrowserCookie,
} from "../src/extension/cookies.js";

const sourceCookie: BrowserCookie = {
  name: "session",
  value: "secret",
  domain: ".youzan.com",
  path: "/admin",
  secure: true,
  httpOnly: true,
  sameSite: "no_restriction",
  session: false,
  expirationDate: 2_000_000_000,
  hostOnly: false,
  storeId: "0",
};

describe("扩展 localhost Cookie 同步", () => {
  test("HTTP localhost 会统一路径并降级 Secure 与 SameSite=None", () => {
    expect(createLocalhostCookieDetails(sourceCookie, "http://localhost/")).toEqual({
      url: "http://localhost/",
      name: "session",
      value: "secret",
      path: "/",
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      expirationDate: 2_000_000_000,
      storeId: "0",
    });
  });

  test("每次同步覆盖当前 Cookie 并删除上次遗留名称", async () => {
    const set = vi.fn(async (_details: chrome.cookies.SetDetails) => undefined);
    const remove = vi.fn(async (_details: chrome.cookies.CookieDetails) => undefined);
    const { expirationDate: _expirationDate, ...sessionSource } = sourceCookie;

    const syncedNames = await syncCookiesToLocalhost(
      [sourceCookie, { ...sessionSource, name: "sid", session: true }],
      ["old", "session"],
      "http://localhost/",
      { set, remove },
    );

    expect(syncedNames).toEqual(["session", "sid"]);
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith({
      url: "http://localhost/",
      name: "old",
      storeId: "0",
    });
    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls[1]?.[0]).not.toHaveProperty("expirationDate");
  });
});
