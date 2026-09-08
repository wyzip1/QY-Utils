import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import trim from 'lodash.trim';
import userhome from '../utils/userhome.js';
import { getGitInfo } from '../utils/git.js';

let yzyunCacheDir = userhome(".youzanyun");

fs.ensureDirSync(yzyunCacheDir);

let authResultPath = path.resolve(yzyunCacheDir, "authResult");

fs.ensureFileSync(authResultPath);

export async function getUserInfo({ once } = {
  once: false,
}) {
  let userInfo = {};

  if (once) {
    try {
      userInfo = await fs.readJSON(authResultPath, "utf8");
    } catch (err) {
      userInfo = {};
    }
  }

  if (
    !userInfo ||
    !userInfo.mobile ||
    !userInfo.token ||
    !userInfo.appName ||
    !userInfo.authType
  ) {
    userInfo = await login();
  }

  return userInfo;
}

export async function login() {
  const { default: inquirerModule } = await inquirer;
  const gitInfo = await getGitInfo();
  let answers = await inquirerModule.prompt([
    {
      type: "input",
      name: "username",
      message: "请输入username(手机号)：",
    },
    {
      type: "password",
      name: "password",
      message: "请输入password(GitToken)：",
    },
  ]);
  let username = trim(answers.username);
  let password = trim(answers.password);
  const userInfo = {
    mobile: username,
    token: password,
    appName: gitInfo.appName,
    authType: "CDN",
  };
  await fs.writeFile(authResultPath, JSON.stringify(userInfo), "utf8");
  return userInfo;
}

export async function logout() {
  const userInfo = {};
  await fs.writeFile(authResultPath, JSON.stringify(userInfo), "utf8");
}
