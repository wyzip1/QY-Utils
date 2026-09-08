import React from "react";
import { createRoot } from "react-dom/client";
import "@/styles/tailwind.css";
import "@/styles/index.css";
import "dayjs/locale/zh-cn";
import App, { AntConfigProvider } from "./App";
import StoreProvider from "./store";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StoreProvider>
    <AntConfigProvider>
      <App />
    </AntConfigProvider>
  </StoreProvider>,
);
