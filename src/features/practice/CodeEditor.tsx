import { useEffect, useRef } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { CodeLanguage } from '../../content/types.ts';
import { languageFor, modelPath, setupMonaco } from '../../editor/monaco.ts';
import { useTheme } from '../../state/theme.ts';

interface Props {
  id: string;
  language: CodeLanguage;
  value: string;
  onChange: (value: string) => void;
  onCheck: () => void;
  onRun: () => void;
  onReady?: (monaco: Monaco, editor: editor.IStandaloneCodeEditor) => void;
}

export function CodeEditor({ id, language, value, onChange, onCheck, onRun, onReady }: Props) {
  const [theme] = useTheme();
  const checkRef = useRef(onCheck);
  const runRef = useRef(onRun);
  checkRef.current = onCheck;
  runRef.current = onRun;

  useEffect(() => {
    void setupMonaco();
  }, []);

  const onMount: OnMount = (editorInstance, monaco) => {
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => checkRef.current());
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => runRef.current());
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => checkRef.current());
    onReady?.(monaco, editorInstance);
  };

  return (
    <div className="editor">
      <Editor
        path={modelPath(id, language)}
        language={languageFor(language)}
        value={value}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        onChange={(v) => onChange(v ?? '')}
        onMount={onMount}
        loading={<div className="editor-loading">Loading editor…</div>}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          tabSize: 2,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 12 },
          renderLineHighlight: 'line',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          bracketPairColorization: { enabled: true },
          fixedOverflowWidgets: true,
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
          fontLigatures: false,
        }}
      />
    </div>
  );
}
