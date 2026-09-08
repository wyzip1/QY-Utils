import React, { forwardRef, ForwardedRef, useRef, useEffect, useContext } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import { registerGroovyLanguageForMonaco } from "../language/groovy";
import Context from "@/store/context";
import Themes from "monaco-editor-themes";

console.log(Themes.themes);

Object.keys(Themes.themes.light).forEach(theme => {
  const data = Themes.themes.light[theme];
  monaco.editor.defineTheme(data.name.replaceAll(" ", "-"), data);
});

Object.keys(Themes.themes.dark).forEach(theme => {
  const data = Themes.themes.dark[theme];
  if (data.name === "Github Light") return;
  monaco.editor.defineTheme(data.name.replaceAll(" ", "-"), data);
});

loader.config({ monaco });
registerGroovyLanguageForMonaco();

export type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;

interface CodeEditorProps {}

function debounce(event: Function, delay = 300) {
  let timer: number = -1;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(event, delay);
  };
}

const CodeEditor = (_props: CodeEditorProps, ref: ForwardedRef<IStandaloneCodeEditor>) => {
  const editorRef = useRef<IStandaloneCodeEditor>();
  const { editorTheme } = useContext(Context);
  function editorMounted(editor: IStandaloneCodeEditor) {
    if (typeof ref === "function") ref(editor);
    else if (ref !== null) ref.current = editor;
    editorRef.current = editor;
  }

  const saveCatchValue = debounce(() => {
    const value = editorRef.current?.getValue();
    localStorage.setItem("catch_value", value || "");
  });

  const defaultContent = localStorage.getItem("catch_value") || "";

  useEffect(() => {
    const preventSave = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "s") e.preventDefault();
    };
    window.addEventListener("keydown", preventSave);
    return () => window.removeEventListener("keydown", preventSave);
  }, []);

  console.log("editorTheme", editorTheme);

  return (
    <Editor
      width="100%"
      height="calc(100vh - 70px)"
      theme={editorTheme}
      language="groovy"
      defaultValue={defaultContent}
      onMount={editorMounted}
      onChange={saveCatchValue}
    />
  );
};

export default forwardRef<IStandaloneCodeEditor>(CodeEditor);
