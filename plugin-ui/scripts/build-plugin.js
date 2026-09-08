const fs = require("fs");
const path = require("path");
const routerConfig = require("../src/router/index");

const routerList = routerConfig.default();
console.log("routerList", routerList);
const pluginRouterEntry = routerList.find(item => item.pluginEntry);
console.log("pluginRouterEntry", pluginRouterEntry);
if (!pluginRouterEntry) {
  console.log("pluginRouterEntry not found");
  process.exit(1);
}

function buildMenuList(list, parentPath = "") {
  const result = [];
  for (const router of list) {
    const options = {
      icon: "dashboard",
      name: router.title,
      path: `${parentPath.replace("*", "")}${router.path.replace("*", "")}`,
    };
    if (router.children) {
      options.children = buildMenuList(router.children, options.path);
      delete options.path;
    }
    result.push(options);
  }
  return result;
}

const pluginOptions = {
  pluginEntry: "http://192.168.0.181:8181/eam_ui/index.html",
  menuList: [],
};

pluginOptions.menuList = buildMenuList(pluginRouterEntry.children, pluginRouterEntry.path);
console.log("pluginOptions", pluginOptions);
fs.writeFileSync(
  path.resolve(__dirname, "../dist/plugin.json"),
  JSON.stringify(pluginOptions)
);
