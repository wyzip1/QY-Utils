import { describe, expect, test } from "vitest";
import { classifyNativeError } from "../src/extension/native-error.js";

describe("classifyNativeError", () => {
  test("清单缺失归为 missing-host", () => {
    expect(classifyNativeError("Specified native messaging host not found.")).toBe("missing-host");
  });

  test("来源未授权归为 forbidden", () => {
    expect(
      classifyNativeError("Access to the specified native messaging host is forbidden."),
    ).toBe("forbidden");
  });

  test("空值与其他错误不会当成配置问题", () => {
    expect(classifyNativeError(undefined)).toBe("other");
    expect(classifyNativeError("Native host has exited.")).toBe("other");
  });
});
