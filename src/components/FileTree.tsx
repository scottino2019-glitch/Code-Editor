import React, { useState, useRef } from 'react';
import { 
  Folder, 
  FolderOpen, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  Plus, 
  FolderUp, 
  FileUp, 
  Download, 
  Search, 
  X,
  FileCode,
  Sparkles
} from 'lucide-react';
import { VirtualFile, getLanguageFromExtension } from '../types';

interface FileTreeProps {
  files: VirtualFile[];
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onCreateFile: (path: string) => void;
  onUploadFiles: (uploaded: VirtualFile[]) => void;
  onDownloadAll: () => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Record<string, TreeNode>;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  onCreateFile,
  onUploadFiles,
  onDownloadAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle folder collapse state
  const toggleFolder = (path: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  // Build hierarchical tree structure from flat files
  const buildTree = (fileList: VirtualFile[]): TreeNode => {
    const root: TreeNode = { name: 'root', path: '', isFile: false, children: {} };

    fileList.forEach(file => {
      // Filter out files that don't match the search query if active
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase()) && !file.path.toLowerCase().includes(searchQuery.toLowerCase())) {
        return;
      }

      const parts = file.path.split('/');
      let current = root;
      let accumulatedPath = '';

      parts.forEach((part, index) => {
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
        const isLast = index === parts.length - 1;

        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: accumulatedPath,
            isFile: isLast,
            children: {},
          };
        }
        current = current.children[part];
      });
    });

    return root;
  };

  // Handler for directory / folder upload
  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newFiles: VirtualFile[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      // Ignore hidden files and standard ignore directories
      if (
        file.name.startsWith('.') || 
        file.webkitRelativePath.includes('/.') || 
        file.webkitRelativePath.includes('node_modules/') || 
        file.webkitRelativePath.includes('dist/') ||
        file.webkitRelativePath.includes('.git/')
      ) {
        continue;
      }

      try {
        const content = await file.text();
        const path = file.webkitRelativePath || file.name;
        newFiles.push({
          path,
          name: file.name,
          content,
          language: getLanguageFromExtension(file.name),
        });
      } catch (e) {
        console.error('Errore nella lettura del file caricato:', file.name, e);
      }
    }

    if (newFiles.length > 0) {
      onUploadFiles(newFiles);
    }
    
    // Reset file input value so same selection can be triggered
    if (event.target) event.target.value = '';
  };

  // Handler for single or multiple files upload
  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newFiles: VirtualFile[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.name.startsWith('.')) continue;

      try {
        const content = await file.text();
        newFiles.push({
          path: file.name,
          name: file.name,
          content,
          language: getLanguageFromExtension(file.name),
        });
      } catch (e) {
        console.error('Errore nella lettura del file caricato:', file.name, e);
      }
    }

    if (newFiles.length > 0) {
      onUploadFiles(newFiles);
    }

    if (event.target) event.target.value = '';
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    onCreateFile(newFileName.trim());
    setNewFileName('');
    setIsCreatingFile(false);
  };

  const handleRenameSubmit = (oldPath: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingName.trim() || renamingName.trim() === oldPath.split('/').pop()) {
      setRenamingPath(null);
      return;
    }

    const parts = oldPath.split('/');
    parts[parts.length - 1] = renamingName.trim();
    const newPath = parts.join('/');

    onRenameFile(oldPath, newPath);
    setRenamingPath(null);
    setRenamingName('');
  };

  // Get visually pleasing colors based on language extension for file icons
  const getIconColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html': return 'text-orange-500';
      case 'css': return 'text-blue-500';
      case 'js': return 'text-yellow-500';
      case 'jsx': return 'text-teal-400';
      case 'ts': return 'text-sky-500';
      case 'tsx': return 'text-indigo-400';
      case 'json': return 'text-amber-500';
      case 'md': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  // Recursively render node elements
  const renderTreeNodes = (node: TreeNode, depth: number = 0) => {
    const sortedNodes = Object.values(node.children).sort((a, b) => {
      // Folders first, then files
      if (a.isFile !== b.isFile) {
        return a.isFile ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    return sortedNodes.map(child => {
      const isCollapsed = collapsedFolders[child.path] || false;
      const isActive = activeFilePath === child.path;

      if (child.isFile) {
        const isRenamingThis = renamingPath === child.path;

        return (
          <div 
            key={child.path}
            className={`group flex items-center justify-between px-3 py-1.5 mx-1 rounded-md transition-all duration-150 cursor-pointer ${
              isActive 
                ? 'bg-[#1E293B] text-slate-100 font-medium border-l-2 border-[#38BDF8] pl-2.5' 
                : 'hover:bg-[#1E293B]/40 text-slate-300 hover:text-white'
            }`}
            onClick={() => !isRenamingThis && onSelectFile(child.path)}
            id={`file-item-${child.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0" style={{ paddingLeft: `${depth * 12 + 8}px` }}>
              <FileCode className={`w-4 h-4 flex-shrink-0 ${getIconColor(child.name)}`} />
              
              {isRenamingThis ? (
                <form 
                  onSubmit={(e) => handleRenameSubmit(child.path, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1"
                >
                  <input
                    type="text"
                    value={renamingName}
                    onChange={(e) => setRenamingName(e.target.value)}
                    className="w-full bg-slate-900 border border-sky-500 rounded px-1 text-xs py-0.5 text-white outline-none"
                    autoFocus
                    onBlur={() => setRenamingPath(null)}
                  />
                </form>
              ) : (
                <span className="text-xs truncate">{child.name}</span>
              )}
            </div>

            {!isRenamingThis && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingPath(child.path);
                    setRenamingName(child.name);
                  }}
                  title="Rinomina"
                  className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700/50 rounded"
                  id={`rename-btn-${child.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(child.path);
                  }}
                  title="Elimina"
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded"
                  id={`delete-btn-${child.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      } else {
        // Render Directory Folder Node
        return (
          <div key={child.path} className="flex flex-col">
            <div 
              className="group flex items-center justify-between px-3 py-1.5 mx-1 rounded-md cursor-pointer hover:bg-slate-800/40 text-slate-300 hover:text-white"
              onClick={() => toggleFolder(child.path)}
              id={`folder-item-${child.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
            >
              <div className="flex items-center space-x-2 flex-1 min-w-0" style={{ paddingLeft: `${depth * 12}px` }}>
                <span className="text-slate-500">
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
                {isCollapsed ? (
                  <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <span className="text-xs truncate font-medium text-slate-200">{child.name}</span>
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                {renderTreeNodes(child, depth + 1)}
              </div>
            )}
          </div>
        );
      }
    });
  };

  const treeRoot = buildTree(files);

  return (
    <div className="flex flex-col h-full bg-[#0B1120] border-r border-slate-800 text-slate-200 w-64 md:w-72 flex-shrink-0">
      
      {/* Brand & Stats Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-to-tr from-[#38BDF8] to-indigo-600 p-1.5 rounded-lg text-white shadow-md shadow-sky-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white font-sans uppercase">Codice Playground</h1>
            <span className="text-[10px] font-mono text-sky-400">{files.length} file attivi</span>
          </div>
        </div>
      </div>

      {/* Upload & Actions Controls */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2 bg-[#0B1120]/40">
        
        {/* Main interactive buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Upload Folder Button */}
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-md transition text-[11px] font-medium"
            title="Carica un'intera cartella locale"
            id="btn-upload-folder"
          >
            <FolderUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Carica Cartella</span>
          </button>
          
          {/* Upload Files Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-md transition text-[11px] font-medium"
            title="Carica singoli file locali"
            id="btn-upload-files"
          >
            <FileUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Carica File</span>
          </button>
        </div>

        {/* Hidden HTML Inputs */}
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderUpload}
          className="hidden"
          webkitdirectory=""
          directory=""
          multiple
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilesUpload}
          className="hidden"
          multiple
        />

        {/* ZIP Download & New File Button */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setIsCreatingFile(true)}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-[#38BDF8] hover:bg-[#7dd3fc] text-[#0F172A] rounded-md transition text-[11px] font-bold"
            id="btn-new-file"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuovo File</span>
          </button>

          <button
            onClick={onDownloadAll}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-md transition text-[11px] font-medium"
            title="Scarica tutti i file in formato ZIP"
            id="btn-download-zip"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scarica ZIP</span>
          </button>
        </div>
      </div>

      {/* Real-time File Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative flex items-center bg-[#0F172A] border border-slate-850 rounded-md focus-within:border-sky-500 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5" />
          <input
            type="text"
            placeholder="Cerca file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-8 pr-7 py-1 text-xs text-white placeholder-slate-500 outline-none"
            id="search-files"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col space-y-0.5 custom-scrollbar select-none">
        
        {/* Create File Mini Form */}
        {isCreatingFile && (
          <form 
            onSubmit={handleCreateFileSubmit}
            className="mx-3 my-1.5 p-2 bg-slate-950 rounded border border-sky-500/50 flex flex-col space-y-1.5"
            id="new-file-form"
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>NUOVO FILE</span>
              <button 
                type="button" 
                onClick={() => setIsCreatingFile(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="es. src/App.tsx o index.html"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded p-1.5 text-white outline-none focus:border-sky-500"
              autoFocus
            />
            <div className="flex justify-end space-x-1">
              <button
                type="button"
                onClick={() => setIsCreatingFile(false)}
                className="px-2 py-0.5 text-[10px] text-slate-400 hover:text-white"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-2.5 py-0.5 text-[10px] bg-sky-600 hover:bg-sky-500 text-white rounded font-medium"
              >
                Crea
              </button>
            </div>
          </form>
        )}

        {files.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Nessun file caricato. Trascina una cartella o premi 'Carica Cartella'.
          </div>
        ) : (
          <div className="flex flex-col">
            {renderTreeNodes(treeRoot)}
          </div>
        )}
      </div>
    </div>
  );
};
