import React, { useRef, useState } from "react";
import Header from "./components/Header";
import ResizeArea from "./components/ResizeArea";
import CodeEditor from "./components/CodeEditor";
import OutputResult from "./components/OutputResult";
import styled from "styled-components";
import { getHistoryList, saveHistoryList } from "./components/HistoryListDialog";
import { message } from "antd";
import type { IStandaloneCodeEditor } from "./components/CodeEditor";
import { postServerRunCode } from "@/api";

const OnlineScriptStyled = styled.div`
  display: flex;
  flex-direction: column;
`;

function guid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function OnlineScript() {
  const [result, setResult] = useState<string>("");
  const [runLoading, setRunLoading] = useState<boolean>(false);
  const editorRef = useRef<IStandaloneCodeEditor>(null);

  function getContent(): string | undefined {
    return editorRef.current?.getValue();
  }

  function setContent(value: string): void {
    editorRef.current?.setValue(value);
  }

  function saveHistory(value: string) {
    const historyList = getHistoryList();
    historyList.unshift({ id: guid(), value, isFavorite: false });
    saveHistoryList(historyList);
  }

  function run() {
    const value = getContent();
    if (!value?.trim()) return message.warning("内容不能为空");
    setRunLoading(true);
    saveHistory(value);

    postServerRunCode(value)
      .then(res => setResult(typeof res === "object" ? JSON.stringify(res) : res))
      .finally(() => setRunLoading(false));
  }

  return (
    <OnlineScriptStyled>
      <Header loading={runLoading} run={run} />
      <ResizeArea
        areaA={<CodeEditor ref={editorRef} />}
        areaB={<OutputResult result={result} onChangeValue={setContent} />}
      />
    </OnlineScriptStyled>
  );
}
