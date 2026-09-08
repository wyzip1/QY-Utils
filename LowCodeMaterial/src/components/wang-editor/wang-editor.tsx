import { useEffect, useState, ComponentType, createElement } from 'react';
import '@wangeditor/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import styled from 'styled-components';

export interface router {
  path: string;
  name?: string;
  component?: ComponentType;
  children?: router[];
  redirect?: string;
  exact?: boolean;
}

export type onEditorChange = (value: string, editor: IDomEditor | null) => void;

export interface WangEditorProps {
  onChange?: onEditorChange;
  onBlur?: (editor: IDomEditor) => void;
  value?: string;
  disabled?: boolean;
}

const WangEditorStyled = styled.div`
  line-height: 1.5;
  position: relative;

  & > .disbaled-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100;
    background-color: transparent;
    cursor: not-allowed;

    & + div div[role='textarea'] {
      color: #ccc;
    }
  }
`;

function WangEditor(props: WangEditorProps) {
  const { onChange, onBlur, value, disabled, ...otherProps } = props;
  // editor 实例
  const [editor, setEditor] = useState<IDomEditor | null>(null); // TS 语法
  // const firstLoad = useRef(true)

  // 工具栏配置
  const toolbarConfig: Partial<IToolbarConfig> = {}; // TS 语法

  // 编辑器配置
  const editorConfig: Partial<IEditorConfig> = {
    // TS 语法
    placeholder: '请输入内容...',
    onBlur,
    autoFocus: false,
  };

  // 及时销毁 editor ，重要！
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  return (
    <WangEditorStyled {...otherProps}>
      {disabled && <div className="disbaled-mask" />}
      <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="simple"
          style={{ borderBottom: '1px solid #ccc' }}
        />
        <Editor
          defaultConfig={editorConfig}
          value={value || ''}
          onCreated={setEditor}
          onChange={(editorCtx) => {
            // if(firstLoad.current) return firstLoad.current = false
            onChange?.(editorCtx.getHtml(), editorCtx);
          }}
          mode="simple"
          style={{ height: '500px', overflowY: 'hidden' }}
        />
      </div>
    </WangEditorStyled>
  );
}

export default WangEditor;
