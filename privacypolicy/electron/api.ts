import youzanyun from "youzanyun-sdk";

/**
 * 获取token的默认参数
 * 默认是有武汉大客容器的参数
 * grant_id: 默认店铺ID
 * client_id: 有赞云颁发给开发者的应用ID
 * client_secret: 有赞云颁发给开发者的应用secret
 */
const defaultOptions = {
  grant_id: "99228216",
  client_secret: "5aa8469cef7c5e57faee9680b161ad91",
  client_id: "742b82c9ce775b821d",
};

/**
 * 有赞云api集合名称
 */
const apiName = {
  createAgreement: "youzan.scrm.agreement.create.bespoke",
  deleteAgreement: "youzan.scrm.agreement.delete.bespoke",
  updateAgreement: "youzan.scrm.agreement.update.bespoke",
};

/**
 * 获取有赞云token接口,默认采用静默方式获取，且不刷新token
 * @param {*} params
 * @returns
 */
function getAccessToken(params) {
  const options = Object.assign({}, defaultOptions, params);
  return youzanyun.token
    .get({
      authorize_type: "silent",
      ...options,
      refresh: false,
    })
    .then((res) => res.data);
  // return Promise.resolve({ success: true, data: { access_token: '3291ea9894512d9813338aed8ad73cf'} })
}

/**
 * 新增商家隐私协议接口
 * @param {*} params
 * @param {*} tokenParams 是否传入外部token获取参数
 * @returns
 */
export const createAgreement = (params, tokenParams) => {
  return getAccessToken(tokenParams)
    .then((res) => {
      if (!res.success) return res;
      const token = res.data.access_token;

      return youzanyun.client
        .call({
          api: apiName.createAgreement,
          version: "1.0.0",
          token,
          params,
        })
        .then((res) => res.data);
    })
    .catch((err) => {
      console.log("createAgreement Error:", err);
    });
};

/**
 *
 * @param {*} params
 * @param {*} tokenParams 是否传入外部token获取参数
 * @returns
 */
export const deleteAgreement = (params, tokenParams) => {
  return getAccessToken(tokenParams)
    .then((res) => {
      if (!res.success) return res;
      const token = res.data.access_token;

      return youzanyun.client
        .call({
          api: apiName.deleteAgreement,
          version: "1.0.0",
          token,
          params,
        })
        .then((res) => res.data);
    })
    .catch((err) => {
      console.log("deleteAgreement Error:", err);
    });
};

/**
 *
 * @param {*} params
 * @param {*} tokenParams 是否传入外部token获取参数
 * @returns
 */
export const updateAgreement = (params, tokenParams) => {
  return getAccessToken(tokenParams)
    .then((res) => {
      if (!res.success) return res;
      const token = res.data.access_token;

      return youzanyun.client
        .call({
          api: apiName.updateAgreement,
          version: "1.0.0",
          token,
          params,
        })
        .then((res) => res.data);
    })
    .catch((err) => {
      console.log("updateAgreement Error:", err);
    });
};
