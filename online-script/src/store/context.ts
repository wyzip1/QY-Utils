import React, { createContext } from "react";

const Context = createContext<unknown>({});

export default Context as React.Context<{
  theme: string;
  setTheme: (theme: string) => void;
  editorTheme: string;
  setEditorTheme: (theme: string) => void;
}>;
