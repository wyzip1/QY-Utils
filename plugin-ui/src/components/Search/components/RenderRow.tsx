import React from "react";
import RenderItem from "./RenderItem";
import type { RenderRowProps } from "../type";

export default function RenderRow({ options, state, setState, search }: RenderRowProps) {
  return (
    <div className="search-row">
      {options.map((item, idx) => (
        <RenderItem
          search={search}
          options={item}
          key={idx}
          state={state}
          setState={setState}
        />
      ))}
    </div>
  );
}
