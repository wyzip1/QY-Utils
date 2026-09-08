import { AxiosRequestConfig, CancelToken } from "axios";
import request from "./request";

interface CreateRequest {
  <T>(
    getReqConfig: (params: T) => AxiosRequestConfig,
  ): (params: T, cancelToken?: CancelToken) => Promise<any>;

  (
    getReqConfig: () => AxiosRequestConfig,
  ): (params?: unknown, cancelToken?: CancelToken) => Promise<any>;
}
export const createRequest: CreateRequest = (
  getReqConfig: (params: unknown) => AxiosRequestConfig,
) => {
  return (params: unknown, cancelToken?: CancelToken) =>
    request({ cancelToken, ...getReqConfig(params) });
};
