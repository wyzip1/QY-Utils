import fs from 'fs-extra';
import upload from './upload.js';
import { logger } from '../utils/logger.js';

export default async function uploadCdn(data, config) {
  let [cdnPath, ...filePaths] = data;

  if (fs.existsSync(cdnPath)) {
    filePaths.unshift(cdnPath);
    cdnPath = undefined;
  }

  const defaultConfig = {
    showInfo: true,
    hasHash: false
  };
  const curConfig = { ...defaultConfig,
    ...config
  };

  try {
    const result = await upload(cdnPath, filePaths, curConfig);

    if (curConfig && curConfig.showInfo) {
      result.map(item => {
        if (item.message && item.message === "file exists") {
          logger.warn(`${item.file} 上传文件已存在`);
        } else {
          logger.success(`${item.file}  ->  ${item.url}`);
        }
      });
    }

    return result.map(item => item.url);
  } catch (err) {
    let {
      data,
      file
    } = err;

    if (file) {
      logger.error(`${file}上传失败：${data}`);
    } else {
      logger.error(`上传失败：${err}`);
    }

    process.exit(-1);
  }
}
