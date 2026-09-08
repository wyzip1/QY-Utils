import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export default function Loading() {
  const LoadingIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Spin indicator={LoadingIcon} />
    </div>
  );
}
