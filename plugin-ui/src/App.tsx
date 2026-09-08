import React from "react";
import { HashRouter } from "react-router-dom";
import RenderRouter from "@/components/RenderRouter";
import routerList from "@/router";
import { useSelector } from "react-redux";
import { RootState } from "./store";

export default function App() {
  const baseURL = useSelector<RootState, string>(state => state.global.baseURL);

  console.log("--plugin-- / baseURL:", baseURL);

  return (
    <main style={{ width: "100%", height: "100vh" }}>
      <HashRouter>
        <RenderRouter routerList={routerList(baseURL)} />
      </HashRouter>
    </main>
  );
}
