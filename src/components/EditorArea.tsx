import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { VirtualFile } from '../types';

interface EditorAreaProps {
  filePath: string;
  value: string;
  language: string;
  files?: VirtualFile[];
  onChange: (newValue: string | undefined) => void;
  fontSize: number;
  wordWrap: boolean;
  onOpenPasteModal?: () => void;
  onEditorReady?: (editor: any) => void;
}

const AMBIENT_DECLARATIONS = `
declare module 'react' {
  const React: any;
  export = React;
  export as namespace React;
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module 'react-dom' {
  const ReactDOM: any;
  export = ReactDOM;
}
declare module 'react-dom/client' {
  export function createRoot(container: any): { render(element: any): void; unmount(): void };
  export function hydrateRoot(container: any, element: any): any;
}
declare module 'lucide-react' {
  const icons: Record<string, any>;
  export = icons;
}
declare module '*.css' { const styles: Record<string, string>; export default styles; }
declare module '*.scss' { const styles: Record<string, string>; export default styles; }
declare module '*.less' { const styles: Record<string, string>; export default styles; }
declare module '*.svg' { const src: string; export default src; export const ReactComponent: any; }
declare module '*.png' { const src: string; export default src; }
declare module '*.jpg' { const src: string; export default src; }
declare module '*.jpeg' { const src: string; export default src; }
declare module '*.gif' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
declare module '*.ico' { const src: string; export default src; }
`;

const toModelUriString = (p: string) => 'file:///' + (p || 'untitled.txt').replace(/^\/+/, '');

export const EditorArea: React.FC<EditorAreaProps> = ({
  filePath,
  value,
  language,
  files = [],
  onChange,
  fontSize,
  wordWrap,
  onOpenPasteModal,
  onEditorReady,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const isInternalChangeRef = useRef<boolean>(false);
  const currentPathRef = useRef<string>(filePath);
  const defaultsConfiguredRef = useRef<boolean>(false);

  useEffect(() => {
    currentPathRef.current = filePath;
  }, [filePath]);

  const configureMonacoDefaults = (monaco: any) => {
    if (!monaco || defaultsConfiguredRef.current) return;
    defaultsConfiguredRef.current = true;

    const ts = monaco.languages?.typescript;
    if (!ts) return;

    const sharedCompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
      allowNonTsExtensions: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      baseUrl: 'file:///',
      paths: {
        '@/*': ['file:///*'],
        '~/*': ['file:///*'],
      },
    };

    ts.typescriptDefaults.setCompilerOptions(sharedCompilerOptions);
    ts.javascriptDefaults.setCompilerOptions({
      ...sharedCompilerOptions,
      checkJs: false,
    });

    ts.typescriptDefaults.setEagerModelSync(true);
    ts.javascriptDefaults.setEagerModelSync(true);

    ts.typescriptDefaults.addExtraLib(AMBIENT_DECLARATIONS, 'file:///__ambient_playground__.d.ts');
    ts.javascriptDefaults.addExtraLib(AMBIENT_DECLARATIONS, 'file:///__ambient_playground__.d.ts');
  };

  // Sync all workspace files as Monaco models so newly created/uploaded/renamed files are recognized
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco || !files) return;

    const activeUriStr = toModelUriString(filePath);
    const validUris = new Set<string>();

    files.forEach((f) => {
      if (f.language === 'image') return;
      const uriStr = toModelUriString(f.path);
      validUris.add(uriStr);
      const uri = monaco.Uri.parse(uriStr);
      const existingModel = monaco.editor.getModel(uri);

      if (!existingModel) {
        monaco.editor.createModel(f.content || '', f.language || 'plaintext', uri);
      } else {
        if (existingModel.getLanguageId && existingModel.getLanguageId() !== f.language && f.language) {
          monaco.editor.setModelLanguage(existingModel, f.language);
        }
        // Only update background models (never overwrite the active model while user is typing)
        if (uriStr !== activeUriStr && existingModel.getValue() !== f.content) {
          existingModel.setValue(f.content || '');
        }
      }
    });

    // Dispose models for deleted or renamed files so recreated files don't keep stale content
    monaco.editor.getModels().forEach((model: any) => {
      const uriStr = model.uri.toString();
      if (uriStr.startsWith('file:///') && !uriStr.endsWith('__ambient_playground__.d.ts') && !validUris.has(uriStr)) {
        model.dispose();
      }
    });
  }, [files, filePath]);

  // Handle external updates to value (e.g. Paste Modal, Reset, External Upload)
  // When user is typing inside Monaco, isInternalChangeRef is true, so we NEVER overwrite Monaco!
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }

    if (editorRef.current && monacoRef.current) {
      const targetUri = toModelUriString(filePath);
      const model = editorRef.current.getModel();
      if (model && model.uri.toString() === targetUri) {
        if (model.getLanguageId && model.getLanguageId() !== language && language) {
          monacoRef.current.editor.setModelLanguage(model, language);
        }
        if (model.getValue() !== value) {
          const pos = editorRef.current.getPosition();
          model.setValue(value || '');
          if (pos) {
            try {
              editorRef.current.setPosition(pos);
            } catch (e) {}
          }
        }
      }
    }
  }, [value, filePath, language]);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    configureMonacoDefaults(monaco);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    configureMonacoDefaults(monaco);

    if (onEditorReady) {
      onEditorReady(editor);
    }

    // Ensure all existing workspace files are immediately registered on first mount
    files.forEach((f) => {
      if (f.language === 'image') return;
      const uri = monaco.Uri.parse(toModelUriString(f.path));
      if (!monaco.editor.getModel(uri)) {
        monaco.editor.createModel(f.content || '', f.language || 'plaintext', uri);
      }
    });

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
  const modelPath = toModelUriString(filePath);

  return (
    <div className="flex-1 w-full h-full relative bg-[#1e1e1e]">
      <Editor
        height="100%"
        width="100%"
        path={modelPath}
        defaultValue={value}
        language={language}
        defaultLanguage={language}
        theme="vs-dark"
        beforeMount={handleBeforeMount}
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

