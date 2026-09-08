import React, { useContext } from "react";
import "dayjs/locale/zh-cn";
import MainStyled from "./styles/MainStyled";
import OnlineScript from "./online-script/App";
import { ConfigProvider, theme as antTheme } from "antd";
import zhCN from "antd/es/locale/zh_CN";

import Context from "./store/context";

export const AntConfigProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { theme } = useContext(Context);

  return (
    <ConfigProvider
      locale={zhCN}
      getPopupContainer={() => document.getElementById("main")!}
      theme={{
        algorithm: theme === "dark" ? [antTheme.darkAlgorithm] : [antTheme.defaultAlgorithm],
        token: { colorPrimary: "#155bd4", borderRadius: 0 },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

export default function App() {
  const { theme } = useContext(Context);
  const { token: antToken } = antTheme.useToken();

  return (
    <MainStyled
      id="main"
      mode={theme}
      antToken={antToken}
      style={{ width: "100%", height: "100vh" }}
    >
      <OnlineScript />
    </MainStyled>
  );
}
