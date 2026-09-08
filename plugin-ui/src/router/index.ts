import { router } from "@/components/RenderRouter";
import { lazy } from "react";

const Layout = lazy(() => import("@/layout"));
const Template = lazy(() => import("@/router/template"));

const mode = !(global || window).__POWERED_BY_QIANKUN__ ? "brower" : "plugin";

const routerList = (baseURL: string = ""): router[] => [
  {
    path: "/",
    redirect: baseURL + "/views",
  },
  {
    path: baseURL + "/views/*",
    name: "Layout",
    redirect: baseURL + "/views/template",
    pluginEntry: true,
    component: mode === "brower" ? Layout : Template,
    children: [
      {
        path: "template",
        name: "Temp",
        title: "example",
        component: lazy(() => import("@/pages/template/App")),
      },
    ],
  },
];

export default routerList;
