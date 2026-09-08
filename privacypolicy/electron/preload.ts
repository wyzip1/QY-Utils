// preload.js

// 所有Node.js API都可以在预加载过程中使用。
// 它拥有与Chrome扩展一样的沙盒。
import { contextBridge, ipcRenderer } from "electron";
import path from "path";

contextBridge.exposeInMainWorld("ipcRenderer", {
  ...ipcRenderer,
  invoke: ipcRenderer.invoke.bind(ipcRenderer),
});

contextBridge.exposeInMainWorld(
  "__basePath",
  process.env.VITE_DEV_SERVER_URL ||
    `file://${path.join(__dirname, "../dist/")}`,
);

window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector: string, text = "") => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
