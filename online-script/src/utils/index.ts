import { message } from "antd";
import Path from "./path";

export { default as events } from "./subscribe";

export function guid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function transferDataToQuery(data: object, isStart = true): string {
  let result = isStart ? "?" : "";
  for (const key in data) {
    const value = typeof data[key] === "object" ? JSON.stringify(data[key]) : data[key];
    if ([undefined, null].includes(value)) continue;
    result += `${key}=${value}&`;
  }
  return result.substring(0, result.length - 1);
}

export function parseJSON(value: string): Record<string, unknown> | string {
  try {
    return JSON.parse(value);
  } catch (_) {
    /* empty */
  }
  return value;
}

export function transferStringListToData(list: string[]): Record<string, unknown> {
  return list.reduce((prev: Record<string, unknown>, current) => {
    const [key, data] = current.split("=");
    prev[key] = parseJSON(data);
    return prev;
  }, {});
}

export function transferQueryToData(search: string | undefined = location.href.split("?")[1]) {
  if (!search) return {};
  return transferStringListToData(search.split("&"));
}

export function getCookie() {
  return transferStringListToData(document.cookie.split("; "));
}

export function formatNum(num: number, fixed = 2): string {
  const value = num.toString();
  if (fixed <= value.length) return value;
  const preload = Array.from({ length: fixed - value.length }, () => "0").join("");
  return preload + value;
}

interface DateFormatSetting {
  value: "Y" | "M" | "D" | "H" | "m" | "s" | string;
  index: number;
}

export function parseDateFormatSetting(setting: string): DateFormatSetting[] {
  const result: DateFormatSetting[] = [];
  const map: Record<string, number> = {};
  for (const index in setting.split("")) {
    const value = setting[index];
    map[value] = map[value] !== undefined ? map[value] + 1 : 0;
    result.push({ value, index: map[value] });
  }
  return result;
}

export function formatDate(
  value: number | string | Date,
  formatSetting = "YYYY-MM-DD HH:mm:ss",
): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear().toString();
  const month = formatNum(date.getMonth() + 1);
  const day = formatNum(date.getDate());
  const hour = formatNum(date.getHours());
  const minute = formatNum(date.getMinutes());
  const second = formatNum(date.getSeconds());
  const map = { Y: year, M: month, D: day, H: hour, m: minute, s: second };
  const setting = parseDateFormatSetting(formatSetting);
  let result = "";
  for (const item of setting) {
    const data = map[item.value];
    const value = data ? data[item.index] : item.value;
    result += value;
  }
  return result;
}

export function getValue<T>(data: T, path?: Path<T>): any {
  if (!path) return;
  for (const key of path.split(".")) data = data?.[key];
  return data;
}

export function setValue<T>(data: T, value: any, path?: Path<T>) {
  if (!path) return data;

  const props = path.split(".");
  let current = data;

  for (let i = 0; i < props.length - 1; i++) {
    const prop = props[i];
    if (!current[prop]) current[prop] = {};

    current = current[prop];
  }

  current[props[props.length - 1]] = value;
  return data;
}

export function debounce(event: Function, delay = 300) {
  let timer: NodeJS.Timer | undefined;
  return (...args: unknown[]) => {
    timer && clearTimeout(timer as unknown as number);
    timer = setTimeout(() => event(...args), delay);
  };
}

export function assembleTree<T = any>(
  list: T[],
  key: keyof T,
  parentKey: keyof T,
  children: keyof T,
) {
  const result: T[] = [];
  const catched: Array<T[keyof T]> = [];
  for (const item of list) {
    item[children] = list.filter(data => {
      data[parentKey] === item[key] && catched.push(data[key]);
      return data[parentKey] === item[key];
    }) as T[keyof T];
    result.push(item);
  }
  return result.filter(item => !catched.includes(item[key]));
}

export function eachTree<T = any>(
  tree: T[],
  callback: (item: T) => boolean | undefined | void,
  key = "children",
) {
  const list = [tree];
  for (let i = 0; i < list.length; i++) {
    for (const node of list[i]) {
      if (node[key]?.length) list.push(node[key]);
      const value = callback(node);
      if (value) return node;
    }
  }
}

export function formatTree<T>(
  tree: T[],
  callback: (item: T, children: T[], parent?: any) => any,
  key = "children",
  parent?: any,
): any[] {
  const result: any[] = [];
  for (const node of tree) {
    const data = { ...node };
    const value = callback(data, data[key] as T[], parent);
    result.push(value);
    if (value[key]) {
      value[key] = formatTree(value[key] as T[], callback, key, value) as any;
    }
  }
  return result;
}

export function findTreePath<T = any>(
  tree: T[],
  callback: (item: T) => boolean | undefined,
  key = "children",
  path: T[] = [],
): T[] | undefined {
  for (const node of tree) {
    const currentPath = [...path];
    currentPath.push(node);
    const isFind = callback(node);

    if (isFind) return currentPath;

    if ((node as any)[key]?.length) {
      const findPath = findTreePath((node as any)[key], callback, key, currentPath);
      if (findPath) return findPath;
    }
  }
}

export const toggleList = <T>(list: T[], item: T, customValidate?: (item: T) => boolean) => {
  const index = list.findIndex(e =>
    typeof customValidate === "function" ? customValidate(e) : e === item,
  );
  if (index > -1) list.splice(index, 1);
  else list.push(item);
  return list;
};

export function throttle(fn: Function, delay = 300) {
  // eslint-disable-next-line no-undef
  let timer: NodeJS.Timer | undefined;
  return (...args: unknown[]) => {
    if (timer) return;
    fn(...args);
    timer = setTimeout(() => (timer = undefined), delay);
  };
}

interface RangeNumProps {
  start: number;
  end: number;
  format?: boolean;
  afterValue?: string;
}
export function rangeNum({ start = 0, end, format = true, afterValue = "" }: RangeNumProps) {
  return Array.from({ length: end - start + 1 }, (_, v) =>
    format ? formatNum(start + v) + afterValue : start + v + afterValue,
  );
}

export const formatMutipleNum = (num: number, mutiple = 100, forceNumer = true) => {
  const value = (mutiple === 0 ? num : num / mutiple).toFixed(2);
  return forceNumer ? Number(value) : value;
};

export const formatMoneyPreSubFix = (num: number, mutiple = 0) => {
  const value = formatMutipleNum(num, mutiple, false).toString();
  return value.split(".");
};

export const createImg = (url: string) => {
  return new Promise<HTMLImageElement>((rev, rej) => {
    const img = document.createElement("img");
    img.src = url;
    img.crossOrigin = "Anonymous"; //解决跨域图片问题

    img.onload = () => rev(img);
    img.onerror = e => rej(e);
  });
};

export const copyToEl = (el: Element) => {
  const selection = window.getSelection()!;
  if (selection.rangeCount > 0) selection.removeAllRanges();
  const range = document.createRange();
  document.body.appendChild(el);
  range.selectNode(el); //传入dom
  selection.addRange(range);
  document.execCommand("copy");
  document.body.removeChild(el);
};

export const copyText = async (data: string) => {
  // @ts-ignore
  const permissions = await navigator.permissions.query({ name: "clipboard-write" });
  if (permissions.state === "granted") {
    await navigator.clipboard.writeText(data);
    return;
  }

  const text = document.createElement("span");
  text.innerText = data;
  copyToEl(text);
};

export const copyImg = async (data: { type: "img"; url: string }) => {
  // @ts-ignore
  const permissions = await navigator.permissions.query({ name: "clipboard-write" });
  if (permissions.state === "granted") {
    const res = await fetch(data.url, { headers: { "Response-Type": "blob" } });
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return;
  }

  const img = await createImg(data.url);
  copyToEl(img);
};

export const copyInfo = async (data?: string | { type: "img"; url: string }) => {
  try {
    if (!data) return;
    typeof data === "string" ? copyText(data) : copyImg(data);
    message.success("复制成功");
  } catch (error) {
    console.log("copy error:", error);
    message.error("复制失败");
  }
};

export const SelectFile = (type = "*") => {
  return new Promise(resolve => {
    const input = document.createElement("input");
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          resolve(input.files?.[0]);
        }, 300);
      },
      { once: true },
    );
    input.type = "file";
    input.accept = type;
    input.click();
  });
};
