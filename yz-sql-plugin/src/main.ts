import { createApp } from "vue";
import App from "./App.vue";
import "./styles/tailwind.css";
import "./styles/index.css";

const app = document.createElement("div");
app.id = "__sql_ui__";

Object.defineProperty(window, "require", {
  get() {
    return unsafeWindow.require;
  },
});

const timer = setInterval(() => {
  const tabsActions = document.querySelector(
    ".tabs-actions .tabs-actions-add",
  ) as HTMLDivElement;
  if (!tabsActions) return;

  tabsActions.parentElement!.style.display = "flex";
  tabsActions.parentElement!.style.alignItems = "center";
  tabsActions.parentElement!.style.gap = "10px";

  clearInterval(timer);
  tabsActions.parentNode!.insertBefore(app, tabsActions);

  createApp(App).mount(app);
}, 500);
