import React, { useContext } from "react";
import { Button, Select, Switch } from "antd";
import styled from "styled-components";
import Context from "@/store/context";
import Themes from "monaco-editor-themes";

interface HeaderProps {
  run(ev: React.MouseEvent<HTMLElement, MouseEvent>): void;
  loading?: boolean;
}

const HeaderStyled = styled.div`
  width: 100%;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24px;
  font-weight: bold;
  color: var(--text-primary);
  padding: 15px 20px;
  box-sizing: border-box;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--color-border);
`;

export default function Header({ run, loading }: HeaderProps) {
  const { theme, setTheme, editorTheme, setEditorTheme } = useContext(Context);

  return (
    <HeaderStyled>
      <div className="flex items-center gap-2">
        <span>Groovy在线运行</span>
        <Select
          style={{ width: 180 }}
          value={editorTheme}
          options={[
            {
              label: theme === "light" ? "vs-light" : "vs-dark",
              value: theme === "light" ? "vs-light" : "vs-dark",
            },
            ...Object.keys(Themes.themes[theme]).map(v => ({
              label: Themes.themes[theme][v].name.replaceAll(" ", "-"),
              value: Themes.themes[theme][v].name.replaceAll(" ", "-"),
            })),
          ]}
          onChange={v => setEditorTheme(v)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checkedChildren="dark"
          unCheckedChildren="light"
          checked={theme === "dark"}
          onChange={v => setTheme(v ? "dark" : "light")}
        />
        <Button loading={loading} type="primary" onClick={run}>
          运行
        </Button>
      </div>
    </HeaderStyled>
  );
}
