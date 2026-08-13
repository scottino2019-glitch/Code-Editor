import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { 
  FileTree 
} from './components/FileTree';
import { 
  EditorHeader 
} from './components/EditorHeader';
import { 
  EditorArea 
} from './components/EditorArea';
import { 
  WelcomeScreen 
} from './components/WelcomeScreen';
import { 
  Preview 
} from './components/Preview';
import { 
  VirtualFile, 
  getLanguageFromExtension 
} from './types';
import { defaultFiles } from './defaultFiles';
import { 
  Info, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  FileCode,
  FolderOpen,
  Settings,
  HelpCircle,
  X
} from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

export default function App() {
  // --- STATE ---
  const [files, setFiles] = useState<VirtualFile[]>(() => {
    const saved = localStorage.getItem('codice_playground_files');
    return saved ? JSON.parse(saved) : defaultFiles;
  });

  const [activeFilePath, setActiveFilePath] = useState<string | null>(() => {
    const savedActive = localStorage.getItem('codice_playground_active');
    if (savedActive) {
      // Ensure the saved active file actually exists
      const savedExists = localStorage.getItem('codice_playground_files');
      if (savedExists) {
        const parsedFiles = JSON.parse(savedExists) as VirtualFile[];
        if (parsedFiles.some(f => f.path === savedActive)) return savedActive;
      }
    }
    return defaultFiles.length > 0 ? defaultFiles[0].path : null;
  });

  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const savedTabs = localStorage.getItem('codice_playground_tabs');
    if (savedTabs) {
      const parsedTabs = JSON.parse(savedTabs) as string[];
      // Filter out any tabs that no longer exist
      const savedFilesStr = localStorage.getItem('codice_playground_files');
      const filesList = savedFilesStr ? JSON.parse(savedFilesStr) as VirtualFile[] : defaultFiles;
      return parsedTabs.filter(p => filesList.some(f => f.path === p));
    }
    return defaultFiles.slice(0, 3).map(f => f.path);
  });

  // Editor configuration
  const [fontSize, setFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('codice_playground_font_size');
    return saved ? Number(saved) : 14;
  });

  const [wordWrap, setWordWrap] = useState<boolean>(() => {
    const saved = localStorage.getItem('codice_playground_word_wrap');
    return saved ? saved === 'true' : true;
  });

  const [showPreview, setShowPreview] = useState<boolean>(() => {
    const saved = localStorage.getItem('codice_playground_show_preview');
    return saved ? saved === 'true' : true;
  });

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // --- LOCALSTORAGE PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem('codice_playground_files', JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    if (activeFilePath) {
      localStorage.setItem('codice_playground_active', activeFilePath);
    } else {
      localStorage.removeItem('codice_playground_active');
    }
  }, [activeFilePath]);

  useEffect(() => {
    localStorage.setItem('codice_playground_tabs', JSON.stringify(openTabs));
  }, [openTabs]);

  useEffect(() => {
    localStorage.setItem('codice_playground_font_size', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('codice_playground_word_wrap', String(wordWrap));
  }, [wordWrap]);

  useEffect(() => {
    localStorage.setItem('codice_playground_show_preview', String(showPreview));
  }, [showPreview]);

  // --- TOAST NOTIFICATIONS HELPER ---
  const showToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- ACTIONS ---

  // Select/Open file
  const handleSelectFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
    setActiveFilePath(path);
  };

  // Close tab
  const handleCloseTab = (path: string) => {
    const nextTabs = openTabs.filter(t => t !== path);
    setOpenTabs(nextTabs);

    if (activeFilePath === path) {
      if (nextTabs.length > 0) {
        // Set the last tab as active
        setActiveFilePath(nextTabs[nextTabs.length - 1]);
      } else {
        setActiveFilePath(null);
      }
    }
  };

  // Create file
  const handleCreateFile = (path: string) => {
    const trimmedPath = path.trim().replace(/^\/+/, ''); // remove leading slashes
    if (!trimmedPath) return;

    if (files.some(f => f.path.toLowerCase() === trimmedPath.toLowerCase())) {
      showToast('Un file con questo percorso esiste già!', 'error');
      return;
    }

    const name = trimmedPath.split('/').pop() || trimmedPath;
    const language = getLanguageFromExtension(name);

    // Dynamic initial template boilerplate
    let initialContent = `// File: ${name}\n`;
    if (language === 'html') {
      initialContent = `<!DOCTYPE html>\n<html lang="it">\n<head>\n  <meta charset="UTF-8">\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>\n`;
    } else if (language === 'css') {
      initialContent = `/* Stili per ${name} */\n\nbody {\n  margin: 0;\n  padding: 0;\n}\n`;
    } else if (name.endsWith('.tsx') || name.endsWith('.jsx')) {
      initialContent = `import React from 'react';\n\nexport default function Component() {\n  return (\n    <div>\n      <h3>${name}</h3>\n    </div>\n  );\n}\n`;
    } else if (language === 'json') {
      initialContent = `{\n  "key": "value"\n}\n`;
    }

    const newFile: VirtualFile = {
      path: trimmedPath,
      name,
      content: initialContent,
      language
    };

    setFiles(prev => [...prev, newFile]);
    handleSelectFile(trimmedPath);
    showToast(`File "${name}" creato con successo!`, 'success');
  };

  // Delete file
  const handleDeleteFile = (path: string) => {
    const fileToDelete = files.find(f => f.path === path);
    const fileName = fileToDelete ? fileToDelete.name : path;

    setFiles(prev => prev.filter(f => f.path !== path));
    handleCloseTab(path);
    showToast(`"${fileName}" eliminato.`, 'info');
  };

  // Rename file
  const handleRenameFile = (oldPath: string, newPath: string) => {
    const trimmedNew = newPath.trim().replace(/^\/+/, '');
    if (!trimmedNew || trimmedNew === oldPath) return;

    if (files.some(f => f.path.toLowerCase() === trimmedNew.toLowerCase())) {
      showToast('Un file con questo percorso esiste già!', 'error');
      return;
    }

    const newName = trimmedNew.split('/').pop() || trimmedNew;
    const newLang = getLanguageFromExtension(newName);

    setFiles(prev => prev.map(f => {
      if (f.path === oldPath) {
        return {
          ...f,
          path: trimmedNew,
          name: newName,
          language: newLang
        };
      }
      return f;
    }));

    // Update active path
    if (activeFilePath === oldPath) {
      setActiveFilePath(trimmedNew);
    }

    // Update tabs
    setOpenTabs(prev => prev.map(t => t === oldPath ? trimmedNew : t));
    showToast('File rinominato correttamente!', 'success');
  };

  // Content change handler
  const handleContentChange = (newValue: string | undefined) => {
    if (!activeFilePath || newValue === undefined) return;

    setFiles(prev => prev.map(f => {
      if (f.path === activeFilePath) {
        return { ...f, content: newValue };
      }
      return f;
    }));
  };

  // Upload/merge files
  const handleUploadFiles = (uploaded: VirtualFile[]) => {
    setFiles(prev => {
      // Overwrite any file with matching path, append new ones
      const pathMap = new Map<string, VirtualFile>();
      prev.forEach(f => pathMap.set(f.path, f));
      uploaded.forEach(f => pathMap.set(f.path, f));
      return Array.from(pathMap.values());
    });

    // Automatically open first uploaded file
    if (uploaded.length > 0) {
      handleSelectFile(uploaded[0].path);
    }

    showToast(`Caricati con successo ${uploaded.length} file!`, 'success');
  };

  // Reset workspace
  const handleResetWorkspace = () => {
    setFiles(defaultFiles);
    setOpenTabs(defaultFiles.slice(0, 3).map(f => f.path));
    setActiveFilePath(defaultFiles[0].path);
    setShowResetConfirm(false);
    showToast('Workspace ripristinato ai file di esempio!', 'info');
  };

  // Clear everything
  const handleClearWorkspace = () => {
    setFiles([]);
    setOpenTabs([]);
    setActiveFilePath(null);
    setShowResetConfirm(false);
    showToast('Tutti i file sono stati rimossi.', 'info');
  };

  // Download ZIP
  const handleDownloadAllAsZip = async () => {
    if (files.length === 0) {
      showToast('Nessun file presente nel workspace da scaricare!', 'error');
      return;
    }

    try {
      const zip = new JSZip();
      files.forEach(file => {
        // Add file to ZIP. JSZip supports nested folders out of the box if paths have slashes
        zip.file(file.path, file.content);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `codice-playground-workspace.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Workspace scaricato correttamente in formato ZIP!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Errore durante la creazione del file ZIP', 'error');
    }
  };

  // Download active file
  const handleDownloadActiveFile = () => {
    const activeFile = files.find(f => f.path === activeFilePath);
    if (!activeFile) return;

    try {
      const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = activeFile.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`File "${activeFile.name}" scaricato con successo!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Errore durante il download del file', 'error');
    }
  };

  // Keyboard shortcut listener (Ctrl + S for individual download)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFilePath) {
          handleDownloadActiveFile();
        } else {
          showToast('Nessun file aperto da salvare!', 'info');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilePath, files]);

  const activeFile = files.find(f => f.path === activeFilePath);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0F172A] font-sans text-slate-100 antialiased selection:bg-sky-500/30 selection:text-white">
      
      {/* Top Header Navigation */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-[#0F172A] px-6 z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white tracking-tight">
              Codice<span className="text-[#38BDF8]">.</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#0B1120] border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Anteprima Live
            </span>
          </div>
        </div>

        {/* Global actions: Preview / Reset / Clear / Help */}
        <div className="flex items-center space-x-3">
          
          {/* Toggle Live Preview Header Button */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              showPreview 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-[#1E293B] border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Attiva o disattiva l'anteprima live in tempo reale"
            id="btn-header-toggle-preview"
          >
            <span className={`w-2 h-2 rounded-full ${showPreview ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
            <span>{showPreview ? 'Anteprima On' : 'Mostra Anteprima'}</span>
          </button>

          {/* Shortcuts Help */}
          <button
            onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-md hover:bg-[#1E293B] transition-colors"
            title="Mostra scorciatoie da tastiera"
            id="btn-help"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Aiuto</span>
          </button>

          {/* Settings / Reset Dropdown Button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-[#1E293B] hover:bg-[#1E293B]/80 text-slate-300 hover:text-white rounded-md border border-slate-800 transition-colors"
            title="Cancella o resetta lo spazio di lavoro"
            id="btn-workspace-options"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Ripristina / Svuota</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Side: Virtual File Tree Explorer */}
        <FileTree
          files={files}
          activeFilePath={activeFilePath}
          onSelectFile={handleSelectFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onCreateFile={handleCreateFile}
          onUploadFiles={handleUploadFiles}
          onDownloadAll={handleDownloadAllAsZip}
        />

        {/* Workspace Body: Split View of Code Editor & Live Preview */}
        <div className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden bg-[#1e1e1e]">
          
          {/* Editor Container */}
          <div className={`flex-1 flex flex-col overflow-hidden ${showPreview ? 'md:w-1/2' : 'w-full'}`}>
            {activeFile ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <EditorHeader
                  files={files}
                  activeFilePath={activeFilePath}
                  openTabs={openTabs}
                  onSelectTab={handleSelectFile}
                  onCloseTab={handleCloseTab}
                  onDownloadCurrentFile={handleDownloadActiveFile}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  wordWrap={wordWrap}
                  setWordWrap={setWordWrap}
                  showPreview={showPreview}
                  onTogglePreview={() => setShowPreview(!showPreview)}
                />
                <div className="flex-1 overflow-hidden relative">
                  <EditorArea
                    value={activeFile.content}
                    language={activeFile.language}
                    onChange={handleContentChange}
                    fontSize={fontSize}
                    wordWrap={wordWrap}
                  />
                </div>
              </div>
            ) : (
              <WelcomeScreen
                onCreateNewFile={() => {
                  const input = prompt('Inserisci il nome del file (es: index.html, styles.css):');
                  if (input) handleCreateFile(input);
                }}
                onUploadFolder={() => {
                  const btn = document.getElementById('btn-upload-folder');
                  btn?.click();
                }}
                onUploadFiles={() => {
                  const btn = document.getElementById('btn-upload-files');
                  btn?.click();
                }}
              />
            )}
          </div>

          {/* Live Preview Panel */}
          {showPreview && (
            <div className="md:w-1/2 h-1/2 md:h-full border-t md:border-t-0 md:border-l border-slate-800 flex flex-col overflow-hidden">
              <Preview 
                files={files} 
                onClose={() => setShowPreview(false)}
              />
            </div>
          )}

        </div>

      </div>

      {/* --- CONFIRM DIALOGS --- */}

      {/* Reset Confirmation Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-[#0F172A]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center space-x-2">
              <RefreshCw className="w-5 h-5 text-[#38BDF8] animate-spin-slow" />
              <span>Gestisci Spazio di Lavoro</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Puoi ripristinare il playground con i file di esempio predefiniti, oppure svuotare interamente l'editor per iniziare un progetto completamente da zero.
            </p>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-slate-300 rounded-md text-xs transition animate-none"
              >
                Annulla
              </button>
              <button
                onClick={handleClearWorkspace}
                className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-md text-xs transition"
              >
                Svuota Tutto
              </button>
              <button
                onClick={handleResetWorkspace}
                className="px-4 py-2 bg-[#38BDF8] hover:bg-[#7dd3fc] text-[#0F172A] font-bold rounded-md text-xs transition"
              >
                Ripristina Esempi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Help Overlay */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-[#0F172A]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShortcutsHelp(false)}>
          <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[#38BDF8]" />
                <span>Scorciatoie e Informazioni</span>
              </h3>
              <button onClick={() => setShowShortcutsHelp(false)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4 text-xs text-slate-300">
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Tasti di scelta rapida</h4>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span>Salva / Scarica file attivo</span>
                  <span className="font-mono text-[#38BDF8] bg-[#0F172A] px-1.5 py-0.5 rounded border border-slate-850">Ctrl + S</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span>Cerca all'interno del file</span>
                  <span className="font-mono text-[#38BDF8] bg-[#0F172A] px-1.5 py-0.5 rounded border border-slate-850">Ctrl + F</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-850">
                  <span>Trova e Sostituisci</span>
                  <span className="font-mono text-[#38BDF8] bg-[#0F172A] px-1.5 py-0.5 rounded border border-slate-850">Ctrl + H</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-400 border-b border-slate-800 pb-1 uppercase tracking-wider text-[10px]">Funzionamento in locale</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tutto il codice che scrivi rimane conservato in locale sul tuo browser tramite <span className="text-slate-200">localStorage</span>. Nessun dato viene mai inviato a server esterni, garantendoti privacy assoluta e rapidità.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowShortcutsHelp(false)}
                className="px-4 py-1.5 bg-[#38BDF8] hover:bg-[#7dd3fc] text-[#0F172A] font-bold rounded-md text-xs transition"
              >
                Ho Capito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOASTS NOTIFICATION LAYER --- */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-xl text-xs font-medium border text-white transition-all duration-300 transform translate-y-0 animate-in slide-in-from-bottom-5 ${
              toast.type === 'success' 
                ? 'bg-emerald-950/95 border-emerald-500/30' 
                : toast.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/30'
                  : 'bg-[#0B1120]/95 border-slate-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />}
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
