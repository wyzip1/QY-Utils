import React from "react";
import { Button, Popconfirm } from "antd";
import { ActionStyled } from "./styled";

import type { ReactNode } from "react";
import type { ButtonProps, PopconfirmProps } from "antd";

interface ActionProps {
  children: ReactNode;
  btnProps?: ButtonProps | true;
  confirmProps?: PopconfirmProps;
}

type TypeMap = "button" | "confirm";
type GetProps<T extends TypeMap> = T extends "button"
  ? ButtonProps
  : PopconfirmProps;

function getNode<T extends TypeMap>(
  type: T,
  node: ReactNode,
  props?: GetProps<T>
) {
  if (!props) return <>{node}</>;
  switch (type) {
    // eslint-disable-next-line prettier/prettier
    case "button": return <Button {...(props as ButtonProps)}>{node}</Button>;
    // eslint-disable-next-line prettier/prettier
    case "confirm": return <Popconfirm {...(props as PopconfirmProps)}>{node}</Popconfirm>;
  }
}

export default function Action({
  children,
  btnProps,
  confirmProps,
}: ActionProps) {
  const btnNode = getNode(
    "button",
    children,
    btnProps === true ? {} : btnProps
  );
  const confirmNode = getNode("confirm", btnNode, confirmProps);

  return <ActionStyled>{confirmNode}</ActionStyled>;
}
