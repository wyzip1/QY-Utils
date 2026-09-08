import React, { useMemo } from "react";
import { Menu } from "antd";

import type { MenuProps } from "antd";
import type { router } from "@/components/RenderRouter";
import { useLocation, useNavigate } from "react-router-dom";
import routerListFn from "@/router";

const routerList = routerListFn();

const LayoutRouterList = routerList.find(router => router.name === "Layout")?.children || [];

interface MenuListProps {
  routerList: router[];
}

const mapPathLink = (router: router): string => {
  const path = router.path.replace("/*", "");
  if (!router._parent) return path;
  return mapPathLink(router._parent) + "/" + path;
};

const getItems = (routers?: router[]): MenuProps["items"] => {
  if (!routers) return;
  const mapMenu = (router: router) => ({
    label: router.title,
    key: mapPathLink(router),
    children: getItems(router.children),
  });

  const itemList = routers.filter(item => item.name && !item.hidden);

  return itemList.map(mapMenu);
};

const mapRouter = (router: router, parent?: router): router => {
  if (router.children?.length) router.children.forEach(_router => mapRouter(_router, router));
  router._parent = parent;
  return router;
};

const matchRouter = (
  url: string,
  idx: number = 8,
  base: string = "/layout",
  list: router[] = LayoutRouterList
): router | undefined => {
  for (const router of list) {
    if (!router.component) continue;
    const path = router.path.replace("/*", "");

    const findIdx = url.indexOf(path);
    if (findIdx !== idx) continue;
    base += (idx === 0 ? "" : "/") + path;
    if (url === base) return router;
    return matchRouter(url, idx + path.length + 1, base, router.children || []);
  }
};

export default function MenuList({ routerList }: MenuListProps) {
  const Location = useLocation();
  const navigate = useNavigate();

  const mapRouteList = useMemo<router[]>(() => {
    return routerList.map(router => mapRouter(router));
  }, [routerList]);

  const items = useMemo<MenuProps["items"]>(() => {
    return getItems(mapRouteList);
  }, [mapRouteList]);

  const expandAll = useMemo(() => {
    return mapRouteList.filter(router => router.children?.length).map(mapPathLink);
  }, [mapRouteList]);

  const activePath = useMemo(() => {
    const router = matchRouter(Location.pathname, 7, "/views");
    return router?.activePath;
  }, [Location.pathname]);

  return (
    <Menu
      items={items}
      mode="inline"
      theme="dark"
      defaultOpenKeys={expandAll}
      selectedKeys={[activePath || Location.pathname.replace("/views/", "")]}
      onSelect={({ selectedKeys }) => navigate(selectedKeys[0])}
    />
  );
}
