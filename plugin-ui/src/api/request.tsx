import React from "react";
import axios, { InternalAxiosRequestConfig } from "axios";
import { notification } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { downloadBlob } from "@/utils/index";

import type { AxiosRequestConfig, AxiosError } from "axios";

interface NotifyProps {
  msg?: string;
  desc?: string;
  type: "success" | "error";
}

export function notify({ msg, desc, type }: NotifyProps) {
  return notification.open({
    icon: {
      success: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      error: <CloseCircleOutlined style={{ color: "#f5222d" }} />,
    }[type],
    message: msg,
    description: desc,
  });
}

const baseURL =
  process.env.NODE_ENV === "development" ? "/developmentApi" : window.location.origin;

const ignoreUrlList = ["/api/v1/images"];

const instance = axios.create({
  baseURL,
  headers: {
    Authorization:
      "Bearer " +
      JSON.parse((window.top || window).localStorage.getItem("Authorization") || '""'),
  },
});

function unifiedParams(config: InternalAxiosRequestConfig) {
  if (config.method?.toLocaleUpperCase() === "GET") config.params = config.data;
  return config;
}

instance.interceptors.request.use(unifiedParams);

instance.interceptors.response.use(
  res => {
    return res.data;
  },
  async (res: AxiosError<{ message?: string; objectName?: string }>) => {
    if (process.env.NODE_ENV === "development" && res.response?.status === 401) {
      await autoLoginToken();
      return await request({
        url: res.config?.url,
        method: res.config?.method,
        data: res.config?.params || res.config?.data,
        responseType: res.config?.responseType,
      });
    }
    if (!ignoreUrlList.includes(res.config?.url || "")) {
      notify({
        type: "error",
        msg: "系统错误",
        desc: res.response?.data?.message || res.message,
      });
    }

    return Promise.reject(res);
  }
);

export default function request<T>(config: AxiosRequestConfig): Promise<T> {
  return instance(config);
}

export interface DownLoadData {
  content: BlobPart;
  contentType: string;
  filename: string;
}

const download = axios.create({ baseURL, responseType: "arraybuffer" });
download.interceptors.request.use(unifiedParams);
download.interceptors.response.use(
  res => {
    const contentType = res.headers["content-type"];
    const propList = res.headers["content-disposition"]?.split(";");
    const filename = propList?.find(i => i.includes("filename"))?.split("=")[1];

    res.data = { contentType, filename, content: res.data } as DownLoadData;
    return res.data;
  },
  (res: AxiosError<{ message?: string; objectName?: string }>) => {
    notify({
      type: "error",
      msg: "系统错误",
      desc: res.response?.data?.message || res.message,
    });
    return Promise.reject(res);
  }
);

function requestFile(config: AxiosRequestConfig): Promise<DownLoadData> {
  return download(config);
}

export async function downloadFile(config: AxiosRequestConfig): Promise<void> {
  const data = await requestFile(config);
  return downloadBlob(data.content, data.contentType, data.filename);
}

const catchAuthQueue: Array<(value: unknown) => void> = [];

async function autoLoginToken() {
  return new Promise((rev, rej) => {
    catchAuthQueue.push(rev);
    if (catchAuthQueue.length > 1) return;
    request<{ token: string; userInfo: unknown }>({
      url: "/api/v1/login",
      method: "POST",
      data: {
        password: "123456",
        userName: "super",
      },
    })
      .then(res => {
        localStorage.setItem("Authorization", JSON.stringify(res.token));
        instance.defaults.headers["Authorization"] =
          "Bearer " + JSON.parse(localStorage.getItem("Authorization") || '""');
        while (catchAuthQueue.length) {
          catchAuthQueue.shift()!(undefined);
        }
      })
      .catch(rej);
  });
}