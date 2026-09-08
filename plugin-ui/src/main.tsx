import React from "react";
import { Provider } from "react-redux";
import { createRoot, Root } from "react-dom/client";
import App from "./App";
import { ConfigProvider as AntConfigProvider } from "antd";
import zhCN from "antd/es/locale/zh_CN";
import "dayjs/locale/zh-cn";
import "@/styles/reset.css";
import "@/styles/index.css";
import { StyleSheetManager } from "styled-components";
import { store } from "./store";
import { SET_BASE_URL } from "./store/global";

interface QianKunProps {
  container?: HTMLDivElement;
  baseURL?: string;
}

let root: Root;
const render = (props: QianKunProps) => {
  const { container } = props;

  store.dispatch(SET_BASE_URL(props.baseURL || ""));

  root = createRoot(
    container ? container.querySelector("#root")! : document.querySelector("#root")!
  );
  root.render(
    <AntConfigProvider
      locale={zhCN}
      theme={{
        token: { colorPrimary: "#3dcd58", borderRadius: 0, fontSize: 12 },
        components: {
          Select: { borderRadius: 4 },
          Table: { borderRadius: 4 },
        },
      }}
    >
      <StyleSheetManager disableCSSOMInjection>
        <Provider store={store}>
          <App />
        </Provider>
      </StyleSheetManager>
    </AntConfigProvider>
  );
};
if (!window.__POWERED_BY_QIANKUN__) {
  render({});
}
export const bootstrap = async () => {};

export const mount = async (props: QianKunProps) => {
  render(props);
};
export const unmount = async () => {
  console.log("unmount");
  root?.unmount();
};

export const update = async (props: QianKunProps) => {
  console.log("update");
  render(props);
};
