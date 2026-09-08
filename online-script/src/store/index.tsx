import React, { useEffect, useState } from "react";
import Context from "./context";
import storage from "@/utils/storage";

const getEdiorTheme = (theme: string) => {
  return storage.get(`editor-theme-${theme}`) || (theme === "dark" ? "vs-dark" : "vs-light");
};

export default function StoreProvider({ children }) {
  const [theme, setTheme] = useState(storage.get("theme") || "light");
  const [editorTheme, setEditorTheme] = useState(getEdiorTheme(theme));

  function _setTheme(value: string) {
    setTheme(value);
    storage.set("theme", value);
    _setEditorTheme(getEdiorTheme(value), value);
  }

  function _setEditorTheme(value: string, forceTheme?: string) {
    setEditorTheme(value);
    storage.set(`editor-theme-${forceTheme || theme}`, value);
  }

  useEffect(() => {
    function changeTheme() {
      const isDark = prefers.matches;
      _setTheme(isDark ? "dark" : "light");
    }
    // 获取系统主题 是否为暗色，当然也可以匹配亮色：prefers-color-scheme: light
    const prefers = window.matchMedia?.("(prefers-color-scheme: dark)");
    prefers.addEventListener("change", changeTheme);

    return () => {
      prefers.removeEventListener("change", changeTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Context.Provider
      value={{
        theme,
        editorTheme,
        setTheme: _setTheme,
        setEditorTheme: _setEditorTheme,
      }}
    >
      {children}
    </Context.Provider>
  );
}
