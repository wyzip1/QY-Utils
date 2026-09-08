import React, { Suspense, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";

import Loading from "./Loading";

import type { LazyExoticComponent, CSSProperties, FC } from "react";

export interface RouterComponentProps {
  children?: null | number | string | JSX.Element;
  style?: CSSProperties;
  [key: string]: unknown;
}

export interface router {
  hidden?: boolean;
  title?: string;
  name?: string;
  role?: string[];
  pluginEntry?: boolean;
  redirect?: string;
  path: string;
  component?: LazyExoticComponent<FC<RouterComponentProps>>;
  children?: router[];
  _parent?: router;
  activePath?: string;
}

interface RenderRouterProps {
  routerList: router[];
  parent?: router;
}

interface ProfileProps {
  redirect?: string;
  path: string;
  children: JSX.Element;
}

interface RouterElementProps {
  router: router;
}

const Profile = ({ redirect, children, path }: ProfileProps) => {
  const navigate = useNavigate();
  const Location = useLocation();

  useEffect(() => {
    const canRedirect =
      Location.pathname.split(path.replace("/*", ""))[1].split("/").length === 1;
    if (!canRedirect) return;
    if (!redirect) return;
    navigate(redirect, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Location.pathname]);

  return <>{children}</>;
};

const getComponent = (
  children?: router[],
  Component?: React.LazyExoticComponent<FC<RouterComponentProps>>
) => {
  if (!Component) return;
  if (!children?.length) return <Component />;
  return (
    <Component>
      <RenderRouter routerList={children} />
    </Component>
  );
};

const RouterElement = ({
  router: { redirect, path, children, component },
}: RouterElementProps) => {
  return (
    <Profile redirect={redirect} path={path}>
      <Suspense fallback={<Loading />}>{getComponent(children, component)}</Suspense>
    </Profile>
  );
};

const createRouter = (router: router, index: number) => {
  const { name, path } = router;
  return <Route key={name || index} path={path} element={<RouterElement router={router} />} />;
};

const mapRouter = (routerList: router[]) => {
  return routerList.map(createRouter);
};

export default function RenderRouter({ routerList }: RenderRouterProps) {
  return <Routes>{mapRouter(routerList)}</Routes>;
}
