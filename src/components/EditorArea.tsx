import React from 'react';
import Editor from '@monaco-editor/react';

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
  return (
    <div className="flex-1 w-full h-full relative bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
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
