import { useRef } from "react";

export function useWindowEvent<T extends keyof WindowEventMap>(
  name: T,
  callback: Parameters<typeof window.addEventListener<T>>[1],
) {
  const cbRef = useRef<Parameters<typeof window.addEventListener<T>>[1]>();

  if (cbRef.current) {
    window.removeEventListener?.(name, cbRef.current);
  }

  cbRef.current = callback;
  window.addEventListener?.(name as any, cbRef.current);
}
