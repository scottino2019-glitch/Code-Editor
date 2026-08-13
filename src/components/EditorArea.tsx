import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface EditorAreaProps {
  value: string;
  language: string;
  onChange: (newValue: string | undefined) => void;
  fontSize: number;
  wordWrap: boolean;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  value,
  language,
  onChange,
  fontSize,
  wordWrap,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register custom context menu Paste action for right-click in iframe
    editor.addAction({
      id: 'custom-paste-action',
      label: 'Incolla Codice (Paste)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
      contextMenuGroupId: '9_cutcopypaste',
      contextMenuOrder: 1,
      run: async (ed) => {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              const selection = ed.getSelection();
              if (selection) {
                ed.executeEdits('custom-paste', [{
                  range: selection,
                  text: text,
                  forceMoveMarkers: true
                }]);
                return;
              }
            }
          }
          throw new Error('Clipboard API unavailable or permission denied');
        } catch (err) {
          // Fallback if browser blocks clipboard API reading inside iframe
          const pastedText = window.prompt('Incolla qui il tuo codice (Ctrl+V / Cmd+V) e premi OK:');
          if (pastedText !== null && pastedText !== undefined) {
            const selection = ed.getSelection();
            if (selection) {
              ed.executeEdits('custom-paste', [{
                range: selection,
                text: pastedText,
                forceMoveMarkers: true
              }]);
            }
          }
        }
      }
    });
  };

  return (
    <div className="flex-1 w-full h-full relative bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        loading={
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A] text-slate-400 gap-3">
            <div className="w-8 h-8 border-4 border-[#38BDF8] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium animate-pulse">Inizializzazione Monaco Editor...</p>
          </div>
        }
        options={{
          fontSize: fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          readOnly: false,
          contextmenu: true,
          wordWrap: wordWrap ? 'on' : 'off',
          minimap: {
            enabled: true,
          },
          automaticLayout: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          padding: {
            top: 12,
            bottom: 12
          },
          renderWhitespace: 'selection',
          tabSize: 2,
        }}
      />
    </div>
  );
};

