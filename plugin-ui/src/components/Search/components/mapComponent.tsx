/* eslint-disable react/display-name */
import React from "react";
import { Select } from "antd";
import createInput from "./items/Input";
import createDatePicker from "./items/DatePicker";
import { covertLength } from "../utils";

import type { ChangeState, Options } from "../type";
import type { RangeValue } from "./items/DatePicker";

const mapComponent = (options: Options) => {
  const width = covertLength(options.width) || "100%";
  switch (options.type) {
    case "input":
      return (onChange: ChangeState, value: unknown, search: () => void) =>
        createInput({ width, props: options.props, onChange, search, value });
    case "select":
      return (onChange: ChangeState, value: unknown) => (
        <Select value={value} onChange={onChange} style={{ width }} {...options.props} />
      );
    case "dateRange":
      return (onChange: ChangeState, value: RangeValue<string>) =>
        createDatePicker({
          value,
          width,
          onChange,
          props: options.props,
          type: "dateRange",
        });
    case "date":
      return (onChange: ChangeState, value: string) =>
        createDatePicker({
          value,
          width,
          onChange,
          props: options.props,
          type: "date",
        });
    default:
      return () => <></>;
  }
};

export default mapComponent;
