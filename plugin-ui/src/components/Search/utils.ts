import mapComponent from "./components/mapComponent";
import type { Options } from "./type";

export const covertLength = (len?: number | string): string | undefined => {
  if (typeof len === "number") return len + "px";
  return len;
};

export const initComponentList = (config: Options[][]): Options[][] => {
  const initComponent = (option: Options): Options => {
    if (option.component) return option;
    if (!option.type) option.type = "input";
    option.component = mapComponent(option);
    return option;
  };

  return config.map(options => options.map(initComponent));
};
