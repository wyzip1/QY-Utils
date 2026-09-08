// 上下文变量 直接使用即可
declare var context: Record<string, any>;

/**
 * 获取变量值
 * @param tagname string
 */
function GetTagValue(tagname: string): any;
/**
 * 设置变量值
 */
function SetTagValue(context: object, tagname: string, value: any);

/**
 * 设置延迟
 * @param seconds
 */
function Delay(seconds: number): void;
