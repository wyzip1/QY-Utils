import React from "react";
import type { RenderItemProps } from "../type";

export default function RenderItem({ options, state, setState, search }: RenderItemProps) {
  const onChange = (value: unknown) => {
    state[options.key] = value;
    setState({ ...state });
  };

  return (
    <div className="search-item">
      <div className="label" style={{ width: options.labelWidth }}>
        {options.label}
      </div>
      <div className="value">
        {options.component!(
          onChange,
          state[options.key] === undefined ? options.defaultValue : state[options.key],
          search
        )}
      </div>
    </div>
  );
}
