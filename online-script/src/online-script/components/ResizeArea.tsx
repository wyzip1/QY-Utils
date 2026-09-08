import { useWindowEvent } from "@/hooks/useWindowEvent";
import React, { useRef, useState } from "react";
import styled from "styled-components";

const ResizeAreaStyled = styled.div`
  display: flex;
  position: relative;
  overflow: hidden;
  height: calc(-70px + 100vh);
  .move-area {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 500;
    cursor: col-resize;
  }

  .left-area,
  .right-area {
    --width: calc(50% - 2px);
    height: 100%;
  }

  .left-area {
    position: relative;
    z-index: 20;
    width: calc(var(--width) - var(--translate-x));
  }

  .right-area {
    width: calc(var(--width) + var(--translate-x));
  }

  .line {
    cursor: col-resize;
    display: block;
    width: 4px;
    background-color: var(--primary-color);
    height: 100%;
    filter: brightness(0.8);

    &:hover,
    &.active {
      filter: brightness(1);
    }
  }
`;

interface ResizeAreaProps {
  areaA?: React.ReactNode;
  areaB?: React.ReactNode;
}

export default function ResizeArea({ areaA, areaB }: ResizeAreaProps) {
  const [enableResize, setEnableResize] = useState<boolean>(false);
  const [translate, setTranslate] = useState<number>(0);
  const startX = useRef<number>(0);
  const catchTranslate = useRef<number>(0);

  function startResize(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    startX.current = ev.clientX;
    catchTranslate.current = translate;
    setEnableResize(true);
  }

  function resize(ev: MouseEvent) {
    if (!enableResize) return;
    setTranslate(catchTranslate.current + startX.current - ev.clientX);
  }

  function endResize() {
    startX.current = 0;
    catchTranslate.current = translate;
    setEnableResize(false);
  }

  useWindowEvent("mousemove", resize);
  useWindowEvent("mouseup", endResize);

  return (
    <ResizeAreaStyled style={{ "--translate-x": translate + "px" } as React.CSSProperties}>
      {enableResize && <div className="move-area" />}
      <div className="left-area">{areaA}</div>
      <div className={`line${enableResize ? " active" : ""}`} onMouseDown={startResize}></div>
      <div className="right-area">{areaB}</div>
    </ResizeAreaStyled>
  );
}
