import React from "react";
import { Input, InputProps } from "antd";

import type { ChangeState } from "../../type";

interface CreateInputProps {
  width: string;
  value: unknown;
  onChange: ChangeState;
  search: () => void;
  props?: InputProps;
}

export default function createInput(config: CreateInputProps) {
  return (
    <Input
      value={config.value as string}
      onChange={ev => config.onChange(ev.target.value)}
      style={{ width: config.width }}
      {...config.props}
      onKeyDown={ev => {
        if (ev.code !== "Enter") return;
        config.search();
        config.props?.onKeyDown?.(ev);
      }}
    />
  );
}
