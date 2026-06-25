import React from 'react';
import { 
  X, 
  FileCode, 
  Download, 
  Settings, 
  AlignLeft, 
  Maximize2,
  Type,
  WrapText
} from 'lucide-react';
import { VirtualFile } from '../types';

interface EditorHeaderProps {
  files: VirtualFile[];
  activeFilePath: string | null;
  openTabs: string[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onDownloadCurrentFile: () => void;
  
  // Editor preferences
  fontSize: number;
  setFontSize: (size: number) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  files,
  activeFilePath,
  openTabs,
  onSelectTab,
  onCloseTab,
  onDownloadCurrentFile,
  fontSize,
  setFontSize,
  wordWrap,
  setWordWrap,
}) => {
  const activeFile = files.find(f => f.path === activeFilePath);

  // Helper to format file size
  const getFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to get tab visual styling based on file extension
  const getTabAccent = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'border-orange-500';
      case 'css': return 'border-blue-500';
      case 'js': return 'border-yellow-500';
      case 'jsx': return 'border-teal-400';
      case 'ts': return 'border-sky-500';
      case 'tsx': return 'border-indigo-400';
      default: return 'border-slate-400';
    }
  };

  return (
    <div className="flex flex-col bg-[#0B1120] border-b border-slate-800 select-none">
      
      {/* 1. Tabs Row */}
      <div className="flex items-center justify-between border-b border-slate-850 overflow-x-auto custom-scrollbar scrollbar-none h-11 bg-[#0B1120]">
        <div className="flex items-center h-full">
          {openTabs.map(tabPath => {
            const file = files.find(f => f.path === tabPath);
            if (!file) return null;

            const isActive = activeFilePath === tabPath;
            return (
              <div
                key={tabPath}
                onClick={() => onSelectTab(tabPath)}
                className={`group flex items-center h-full px-4 border-r border-slate-800 cursor-pointer transition-all duration-150 text-xs min-w-[120px] max-w-[180px] relative ${
                  isActive 
                    ? 'bg-[#1E293B] text-slate-100 font-medium border-t-2' 
                    : 'bg-[#0B1120] text-slate-400 hover:bg-white/5 hover:text-slate-200'
                } ${isActive ? getTabAccent(file.name) : 'border-t-transparent'}`}
                id={`tab-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
              >
                <FileCode className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${
                  isActive ? 'opacity-100' : 'opacity-60'
                }`} />
                <span className="truncate flex-1 pr-3">{file.name}</span>
                
                {/* Close tab button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tabPath);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Chiudi pannello"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {openTabs.length > 0 && (
          <div className="flex items-center px-4 space-x-2">
            <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
              Workspace Locale
            </span>
          </div>
        )}
      </div>

      {/* 2. File Metadata & Control Row */}
      {activeFile && (
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-2 gap-2 bg-[#0F172A] text-xs text-slate-400">
          
          {/* File details */}
          <div className="flex items-center space-x-3 truncate">
            <span className="font-mono text-[11px] text-slate-400 truncate bg-[#0B1120]/80 px-2 py-0.5 rounded border border-slate-800">
              {activeFile.path}
            </span>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 flex-shrink-0">
              <span>•</span>
              <span>Dimensione: {getFileSize(activeFile.content)}</span>
              <span>•</span>
              <span>Linguaggio: <span className="uppercase text-sky-400/80 font-semibold">{activeFile.language}</span></span>
            </div>
          </div>

          {/* Quick actions & Editor Preferences */}
          <div className="flex items-center space-x-4 self-end md:self-auto flex-shrink-0">
            
            {/* Font Size Pref */}
            <div className="flex items-center space-x-1.5" title="Dimensione Font">
              <Type className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-[#0B1120] border border-slate-800 rounded px-1.5 py-0.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-sky-500"
                id="select-font-size"
              >
                {[12, 13, 14, 15, 16, 18, 20].map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
            </div>

            {/* Word Wrap Toggle */}
            <button
              onClick={() => setWordWrap(!wordWrap)}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded border transition-colors ${
                wordWrap 
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                  : 'bg-[#0B1120] border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="A capo automatico (Word Wrap)"
              id="btn-toggle-wordwrap"
            >
              <WrapText className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">A Capo</span>
            </button>

            {/* Download File Button */}
            <button
              onClick={onDownloadCurrentFile}
              className="flex items-center space-x-1 bg-[#38BDF8] hover:bg-[#7dd3fc] text-[#0F172A] font-bold px-3 py-1 rounded transition-colors text-[11px]"
              title="Scarica questo file sul PC"
              id="btn-download-current"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Scarica File</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
