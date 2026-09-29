import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface EditorAreaProps {
  filePath: string;
  value: string;
  language: string;
  onChange: (newValue: string | undefined) => void;
  fontSize: number;
  wordWrap: boolean;
  onOpenPasteModal?: () => void;
  onEditorReady?: (editor: any) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  filePath,
  value,
  language,
  onChange,
  fontSize,
  wordWrap,
  onOpenPasteModal,
  onEditorReady,
}) => {
  const editorRef = useRef<any>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const currentPathRef = useRef<string>(filePath);

  useEffect(() => {
    currentPathRef.current = filePath;
  }, [filePath]);

  // Handle external updates to value (e.g. Paste Modal, Reset, External Upload)
  // When user is typing inside Monaco, isInternalChangeRef is true, so we NEVER overwrite Monaco!
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== value) {
        // Value changed from an outside action (Paste modal, reset, etc.)
        const pos = editorRef.current.getPosition();
        model.setValue(value || '');
        if (pos) {
          try {
            editorRef.current.setPosition(pos);
          } catch (e) {}
        }
      }
    }
  }, [value, filePath]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    if (onEditorReady) {
      onEditorReady(editor);
    }

    // Register custom context menu Paste action for right-click
    // Note: Do NOT bind KeyMod.CtrlCmd | KeyCode.KeyV so the browser's native paste handler works flawlessly!
    editor.addAction({
      id: 'custom-paste-action',
      label: 'Incolla Codice (Finestra di Incolla)...',
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
          throw new Error('Clipboard API unavailable in iframe');
        } catch (err) {
          if (onOpenPasteModal) {
            onOpenPasteModal();
          }
        }
      }
    });
  };

  const handleEditorChange = (newVal: string | undefined) => {
    isInternalChangeRef.current = true;
    onChange(newVal);
  };

  if (language === 'image') {
    const isDataUrl = value && value.startsWith('data:image/');
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 bg-[#0F172A] overflow-auto select-none">
        <div className="max-w-md w-full bg-[#1E293B] border border-slate-700/60 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
          <div className="w-full h-64 rounded-lg border border-slate-700 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center p-4 overflow-hidden mb-4">
            {isDataUrl ? (
              <img 
                src={value} 
                alt="Anteprima risorsa" 
                className="max-h-full max-w-full object-contain drop-shadow-md rounded"
              />
            ) : (
              <div className="text-slate-400 text-sm">
                Nessun dato immagine valido caricato
              </div>
            )}
          </div>
          <h4 className="text-slate-200 font-semibold text-base mb-1">File Immagine Binario</h4>
          <p className="text-slate-400 text-xs mb-4">
            Questo file è caricato nel workspace ed è utilizzabile in tempo reale nell'anteprima:
          </p>
          <div className="w-full bg-[#0F172A] rounded-lg p-3 text-left font-mono text-[11px] text-sky-300 space-y-1.5 border border-slate-800">
            <div><span className="text-slate-500">HTML:</span> &lt;img src="nome-file.png" /&gt;</div>
            <div><span className="text-slate-500">CSS:</span> background-image: url('nome-file.png');</div>
            <div><span className="text-slate-500">React:</span> import img from './nome-file.png';</div>
          </div>
        </div>
      </div>
    );
  }

  // Generate unique model URI for each file
  const modelPath = 'file:///' + (filePath || 'untitled.txt').replace(/^\/+/, '');

  return (
    <div className="flex-1 w-full h-full relative bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        path={modelPath}
        defaultValue={value}
        defaultLanguage={language}
        theme="vs-dark"
        onChange={handleEditorChange}
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
          cursorSmoothCaretAnimation: 'off', // 'off' prevents cursor jumping/gliding artifacts
          smoothScrolling: true,
          padding: {
            top: 12,
            bottom: 12
          },
          renderWhitespace: 'selection',
          tabSize: 2,
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          autoClosingBrackets: 'languageDefined',
          autoClosingQuotes: 'languageDefined',
        }}
      />
    </div>
  );
};

