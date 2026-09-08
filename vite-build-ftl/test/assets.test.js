import assert from "assert";
import constants from "../assets/constants.js";
import userhome from "../assets/utils/userhome.js";
import { logger, createInteractive } from "../assets/utils/logger.js";
import { promiseExec, promiseSpawm } from "../assets/utils/run.js";
import { getGitInfo, checkGitStatus } from "../assets/utils/git.js";
import api from "../assets/api/index.js";
import { getUserInfo, login, logout } from "../assets/login/index.js";
import upload from "../assets/upload-cdn/upload.js";
import uploadCdn from "../assets/upload-cdn/index.js";
import { injectToHead, addJsImportFile, getAppName, uploadCdnFn } from "../assets/utils.js";

console.log("开始运行ES6模块化重构后的单元测试...\n");

try {
  console.log("测试1: 验证constants模块导出");
  assert.strictEqual(constants.GLOBAL_OBJECT, "mallCloud");
  assert.strictEqual(constants.CDN_DOMAIN, "mall-cloud");
  assert.strictEqual(constants.YOUZANYUN_HOST, "diy.youzanyun.com");
  console.log("✓ constants模块测试通过\n");

  console.log("测试2: 验证userhome模块导出");
  const homePath = userhome();
  assert.ok(typeof homePath === "string");
  assert.ok(homePath.length > 0);
  console.log("✓ userhome模块测试通过\n");

  console.log("测试3: 验证logger模块导出");
  assert.ok(logger);
  assert.ok(typeof createInteractive === "function");
  console.log("✓ logger模块测试通过\n");

  console.log("测试4: 验证run模块导出");
  assert.ok(typeof promiseExec === "function");
  assert.ok(typeof promiseSpawm === "function");
  console.log("✓ run模块测试通过\n");

  console.log("测试5: 验证git模块导出");
  assert.ok(typeof getGitInfo === "function");
  assert.ok(typeof checkGitStatus === "function");
  console.log("✓ git模块测试通过\n");

  console.log("测试6: 验证api模块导出");
  assert.ok(api.getLoginCheck);
  assert.ok(api.getToken);
  assert.ok(api.saveInfo);
  console.log("✓ api模块测试通过\n");

  console.log("测试7: 验证login模块导出");
  assert.ok(typeof getUserInfo === "function");
  assert.ok(typeof login === "function");
  assert.ok(typeof logout === "function");
  console.log("✓ login模块测试通过\n");

  console.log("测试8: 验证upload模块导出");
  assert.ok(typeof upload === "function");
  console.log("✓ upload模块测试通过\n");

  console.log("测试9: 验证uploadCdn模块导出");
  assert.ok(typeof uploadCdn === "function");
  console.log("✓ uploadCdn模块测试通过\n");

  console.log("测试10: 验证utils模块导出");
  assert.ok(typeof injectToHead === "function");
  assert.ok(typeof addJsImportFile === "function");
  assert.ok(typeof getAppName === "function");
  assert.ok(typeof uploadCdnFn === "function");
  console.log("✓ utils模块测试通过\n");

  console.log("测试11: 验证injectToHead功能");
  const html = "<html><head></head><body></body></html>";
  const tags = [{ tag: "meta", attrs: { charset: "utf-8" } }];
  const result = injectToHead(html, tags);
  assert.ok(result.includes('<meta charset="utf-8">'));
  console.log("✓ injectToHead功能测试通过\n");

  console.log("========================================");
  console.log("所有测试通过！ES6模块化重构成功！");
  console.log("========================================");
} catch (error) {
  console.error("测试失败:", error.message);
  console.error(error.stack);
  process.exit(1);
}
