import { message } from "antd";
import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const baseURL =
  process.env.NODE_ENV === "development" ? "/developmentApi" : window.location.origin;

const instance = axios.create({ baseURL });

instance.interceptors.request.use(config => {
  return config;
});

instance.interceptors.response.use(
  res => res.data,
  (err: AxiosError) => {
    if (err.code !== "ERR_CANCELED") {
      message.error(err.message);
    }
    return Promise.reject(err);
  },
);

const request = (config: AxiosRequestConfig) => {
  return instance(config);
};

export default request;
