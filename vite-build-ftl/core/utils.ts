import child_process from "child_process";

export function getAppName() {
  const remote = child_process.execSync("git remote -v").toString("utf8");
  const appNameArr = remote.split("/").pop()?.split(".");
  return appNameArr?.slice(0, appNameArr.length - 1).join("/");
}

export function createMaxLenArray(callBack: (idx: number) => unknown, ...lens: number[]) {
  const length = Math.max(...lens);
  return Array.from({ length }, (_, idx) => callBack(idx));
}

type MergeOptions = Record<string, unknown>;

export function hasNotObject(...objs: unknown[]) {
  return objs.some(obj => obj === null || typeof obj !== "object");
}

export function getValue(v1: unknown, v2: unknown) {
  return [undefined].includes(v1) ? v2 : v1;
}

export function merge(config: MergeOptions, options: MergeOptions) {
  const result: MergeOptions = {};
  const keyList = [...new Set<string>(Object.keys(config).concat(Object.keys(options)))];

  for (const key of keyList) {
    if (Array.isArray(config[key]) && Array.isArray(options[key])) {
      result[key] = createMaxLenArray(
        idx => {
          if (hasNotObject(config[key][idx], options[key][idx])) {
            return getValue(options[key][idx], config[key][idx]);
          }
          return merge(config[key][idx], options[key][idx]);
        },
        (config[key] as Array<unknown>).length,
        (options[key] as Array<unknown>).length
      );
    } else if (!hasNotObject(config[key], options[key])) {
      result[key] = merge(config[key] as MergeOptions, options[key] as MergeOptions);
    } else {
      result[key] = getValue(options[key], config[key]);
    }
  }
  return result;
}

export const covertSrc = (src: string) => {
  return __dirname.includes("\\") ? src.replace(/\//g, "\\") : src;
};
