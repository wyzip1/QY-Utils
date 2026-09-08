import axios from 'axios';
import fs from 'fs-extra';
import constants from '../constants.js';
import userhome from '../utils/userhome.js';

const {
  VERSION_API,
  TOKEN_API,
  LOGIN_API,
  YOUZANYUN_HOST,
  YOUZANYUN_BASEURL
} = constants;

let config = {
  baseURL: YOUZANYUN_BASEURL,
  headers: {
    host: YOUZANYUN_HOST
  }
};

if (fs.pathExistsSync(userhome('.youzanyun/config.json'))) {
  const custom_config = fs.readJsonSync(userhome('.youzanyun/config.json'));

  if (custom_config) {
    if (custom_config.YOUZANYUN_HOST) {
      config.headers.host = custom_config.YOUZANYUN_HOST;
    }

    if (custom_config.sc) {
      config.headers['X-Service-Chain'] = `{"name": "${custom_config.sc}"}`;
    }

    if (custom_config.YOUZANYUN_BASEURL) {
      config.baseURL = custom_config.YOUZANYUN_BASEURL;
    }
  }
}

export default {
  getLoginCheck: data => axios.get(LOGIN_API, {
    params: data,
    ...config
  }),
  getToken: params => axios.get(TOKEN_API, {
    params,
    ...config
  }),
  saveInfo: data => axios.post(VERSION_API, data, config)
};
