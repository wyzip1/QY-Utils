import { logger } from './logger.js';
import { promiseExec } from './run.js';

export async function getGitInfo(gitRepoDir) {
  const gitInfo = {};

  try {
    const remoteInfo = await promiseExec("git remote -v", {
      cwd: gitRepoDir
    });
    const appNameArr = remoteInfo.split("/").pop().split(".");
    gitInfo.appName = appNameArr.slice(0, appNameArr.length - 1).join("/");
    const username = await promiseExec("git config user.name", {
      cwd: gitRepoDir
    });
    gitInfo.username = username || "unknown";
    const commitId = await promiseExec("git rev-parse HEAD", {
      cwd: gitRepoDir
    });
    gitInfo.commitId = commitId;
    return gitInfo;
  } catch (error) {
    logger.error("请在项目目录下操作");

    process.exit(0);
  }
}

export async function checkGitStatus(gitRepoDir) {
  try {
    const statusInfo = await promiseExec("git status -s", {
      cwd: gitRepoDir
    });
    return !statusInfo;
  } catch (error) {
    logger.error("请在项目目录下操作");

    process.exit(0);
  }
}
