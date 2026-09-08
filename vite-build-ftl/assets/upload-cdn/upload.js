import path from 'path';
import qiniu from 'qiniu';
import { logger } from '../utils/logger.js';
import api from '../api/index.js';
import { getUserInfo, logout } from '../login/index.js';
import constants from '../constants.js';

const {
  CDN_DOMAIN
} = constants;

const formUploader = new qiniu.form_up.FormUploader(getQiniuConfig());

export default async function upload(cdnPath, files) {
  if (!files || files.length === 0) {
    logger.error("无可上传文件");

    process.exit(0);
  }

  let token;

  try {
    const userInfo = await getUserInfo({
      once: true
    });
    token = await getToken(userInfo);
  } catch (err) {
    await logout();
    return Promise.reject(err);
  }

  let currentFiles = [];

  if (typeof files !== "string" && !(files instanceof Array)) {
    return Promise.reject('上传文件参数类型错误: expect "string" or "Array"');
  } else if (typeof files === "string") {
    currentFiles.push(files);
  } else {
    currentFiles = files;
  }

  return Promise.all(currentFiles.map(file => {
    return new Promise((resolve, reject) => {
      const fileName = file.split(path.sep).pop();
      const fileFirstNameArr = fileName.split(".");
      const fileExt = fileFirstNameArr.pop();
      const fileFirstName = fileFirstNameArr.join(".");
      const uploadPath = cdnPath ? `${CDN_DOMAIN}/${cdnPath}` : `${CDN_DOMAIN}`;
      let newName = `${uploadPath}/${fileFirstName}.${fileExt}`;
      const putExtra = new qiniu.form_up.PutExtra();
      formUploader.putFile(token, newName, file, putExtra, (respErr, respBody, respInfo) => {
        if (respErr) {
          reject(respErr);
        }

        if (+respInfo.statusCode === 200) {
          const url = respBody.data.attachment_full_url;
          resolve({
            file,
            url: url.replace("http:", "https:")
          });
        } else {
          if (respInfo.data && respInfo.data.error === "file exists") {
            resolve({
              message: "file exists",
              file,
              url: uploadPath
            });
          }

          reject({
            data: respInfo.data,
            file
          });
        }
      });
    });
  }));
}

async function getToken(userInfo) {
  const res = await api.getToken(userInfo);

  if ((+res.status === 0 || +res.status === 200) && res.data && res.data.uploadToken) {
    return res.data.uploadToken;
  } else {
    throw new Error(res.data.msg || res.msg || "获取token失败");
  }
}

function getQiniuConfig() {
  return new qiniu.conf.Config({
    zone: qiniu.zone.Zone_z0,
    useHttpsDomain: true,
    useCdnDomain: true
  });
}
