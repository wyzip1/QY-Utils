type Primitive = null | undefined | symbol | string | number | boolean | bigint;
type PathImpl<K extends string | number, V> = V extends Primitive
  ? `${K}`
  : `${K}` | `${K}.${Path<V>}`;
type ArrayIndex<K> = K extends `${number}` ? K : never;
type IsTuple<T extends Array<unknown>> = number extends T["length"] ? false : true;

type Path<T> = T extends Primitive
  ? never
  : T extends Array<infer V>
    ? IsTuple<T> extends true
      ? { [K in ArrayIndex<keyof T>]: PathImpl<K & string, T[K]> }[ArrayIndex<keyof T>]
      : PathImpl<number, V>
    : { [K in keyof T]: PathImpl<K & string, T[K]> }[keyof T];

export default Path;
