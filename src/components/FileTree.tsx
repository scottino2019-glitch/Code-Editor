import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, 
  FolderOpen, 
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
  Sparkles,
  FolderInput
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
  createFileTrigger?: number;
}

interface TreeNode {
  name: string;
  path: string;
  isFile: boolean;
  children: Record<string, TreeNode>;
}

interface PendingUploadFile {
  name: string;
  content: string;
  language: string;
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
  createFileTrigger,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [targetFolder, setTargetFolder] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');

  // Upload destination modal state (when uploading via "Carica File" button)
  const [pendingUploadFiles, setPendingUploadFiles] = useState<PendingUploadFile[] | null>(null);
  const [uploadModalFolder, setUploadModalFolder] = useState('');
  const [uploadCustomFolder, setUploadCustomFolder] = useState('');

  // Drag & drop state
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggingFilePath, setDraggingFilePath] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetFolderRef = useRef<string | null>(null);
  const treeScrollRef = useRef<HTMLDivElement>(null);

  // Open inline creation form when triggered externally (e.g. from WelcomeScreen)
  useEffect(() => {
    if (createFileTrigger && createFileTrigger > 0) {
      setTargetFolder('');
      setIsCreatingFile(true);
      treeScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [createFileTrigger]);

  // Collect all unique existing folder paths sorted alphabetically
  const existingFolders = React.useMemo(() => {
    const folderSet = new Set<string>();
    files.forEach(file => {
      const parts = file.path.replace(/\\/g, '/').split('/').map(p => p.trim()).filter(Boolean);
      let acc = '';
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        folderSet.add(acc);
      }
    });
    return Array.from(folderSet).sort((a, b) => a.localeCompare(b));
  }, [files]);

  const expandFolderChain = (folderPath: string) => {
    const parts = folderPath.replace(/\\/g, '/').split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setCollapsedFolders(prev => {
      const next = { ...prev };
      let acc = '';
      for (let i = 0; i < parts.length; i++) {
        acc = acc ? `${acc}/${parts[i]}` : parts[i];
        next[acc] = false;
      }
      return next;
    });
  };

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

      const parts = file.path.replace(/\\/g, '/').split('/').map(p => p.trim()).filter(Boolean);
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

  // Helper to read file as text or binary data URL for images
  const readFileData = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isBinaryImage = ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif'].includes(ext);
      if (isBinaryImage) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      } else {
        file.text().then(resolve).catch(reject);
      }
    });
  };

  const finalizeUploadedFiles = (items: PendingUploadFile[], destinationFolder: string) => {
    const cleanFolder = destinationFolder
      .replace(/\\/g, '/')
      .split('/')
      .map(s => s.trim())
      .filter(Boolean)
      .join('/');

    const virtualFiles: VirtualFile[] = items.map(item => ({
      path: cleanFolder ? `${cleanFolder}/${item.name}` : item.name,
      name: item.name,
      content: item.content,
      language: item.language,
    }));

    if (cleanFolder) {
      expandFolderChain(cleanFolder);
    }
    setSearchQuery('');
    onUploadFiles(virtualFiles);
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
        const content = await readFileData(file);
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
      setSearchQuery('');
      onUploadFiles(newFiles);
    }
    
    // Reset file input value so same selection can be triggered
    if (event.target) event.target.value = '';
  };

  // Handler for single or multiple files upload
  const handleFilesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const directFolder = uploadTargetFolderRef.current;
    uploadTargetFolderRef.current = null;

    const parsedFiles: PendingUploadFile[] = [];
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.name.startsWith('.')) continue;

      try {
        const content = await readFileData(file);
        parsedFiles.push({
          name: file.name,
          content,
          language: getLanguageFromExtension(file.name),
        });
      } catch (e) {
        console.error('Errore nella lettura del file caricato:', file.name, e);
      }
    }

    if (event.target) event.target.value = '';
    if (parsedFiles.length === 0) return;

    if (directFolder !== null) {
      finalizeUploadedFiles(parsedFiles, directFolder);
      return;
    }

    // Determine sensible default folder from currently active file
    const activeDir = activeFilePath && activeFilePath.includes('/')
      ? activeFilePath.split('/').slice(0, -1).join('/')
      : '';
    setUploadModalFolder(activeDir);
    setUploadCustomFolder('');
    setPendingUploadFiles(parsedFiles);
  };

  const handleConfirmUploadModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUploadFiles || pendingUploadFiles.length === 0) return;

    const chosenFolder = uploadCustomFolder.trim()
      ? uploadCustomFolder.trim()
      : uploadModalFolder;

    finalizeUploadedFiles(pendingUploadFiles, chosenFolder);
    setPendingUploadFiles(null);
    setUploadModalFolder('');
    setUploadCustomFolder('');
  };

  const handleTriggerFolderFileUpload = (folderPath: string) => {
    uploadTargetFolderRef.current = folderPath;
    fileInputRef.current?.click();
  };

  const handleTriggerRootFileUpload = () => {
    uploadTargetFolderRef.current = null;
    fileInputRef.current?.click();
  };

  // Handle dropping OS files or dragging existing workspace files onto a folder (or root '')
  const handleDropOnTarget = async (e: React.DragEvent, destinationFolder: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);

    const internalPath = e.dataTransfer.getData('application/x-playground-file');
    if (internalPath) {
      setDraggingFilePath(null);
      const fileName = internalPath.split('/').pop() || internalPath;
      const cleanFolder = destinationFolder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const newPath = cleanFolder ? `${cleanFolder}/${fileName}` : fileName;
      if (newPath !== internalPath) {
        if (cleanFolder) expandFolderChain(cleanFolder);
        onRenameFile(internalPath, newPath);
      }
      return;
    }

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles || droppedFiles.length === 0) return;

    const parsedFiles: PendingUploadFile[] = [];
    for (let i = 0; i < droppedFiles.length; i++) {
      const file = droppedFiles[i];
      if (file.name.startsWith('.')) continue;
      try {
        const content = await readFileData(file);
        parsedFiles.push({
          name: file.name,
          content,
          language: getLanguageFromExtension(file.name),
        });
      } catch (err) {
        console.error('Errore nella lettura del file trascinato:', file.name, err);
      }
    }

    if (parsedFiles.length > 0) {
      finalizeUploadedFiles(parsedFiles, destinationFolder);
    }
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedInput = newFileName
      .replace(/\\/g, '/')
      .split('/')
      .map(s => s.trim())
      .filter(Boolean)
      .join('/');

    if (!cleanedInput) return;

    let finalPath = cleanedInput;
    if (targetFolder) {
      const folderLower = targetFolder.toLowerCase();
      const inputLower = cleanedInput.toLowerCase();

      // Avoid duplicating folder prefix if user already typed it (e.g. "src/components/Foo.tsx" with "src/components" selected)
      if (inputLower.startsWith(folderLower + '/')) {
        finalPath = targetFolder + cleanedInput.slice(targetFolder.length);
      } else {
        // Also check if user typed a trailing portion of targetFolder (e.g. "components/Foo.tsx" when "src/components" is selected)
        const folderParts = targetFolder.split('/');
        let matchedSuffix = false;
        for (let i = 1; i < folderParts.length; i++) {
          const suffix = folderParts.slice(i).join('/').toLowerCase();
          if (inputLower.startsWith(suffix + '/')) {
            finalPath = `${targetFolder}/${cleanedInput.slice(suffix.length + 1)}`;
            matchedSuffix = true;
            break;
          }
        }
        if (!matchedSuffix) {
          finalPath = `${targetFolder}/${cleanedInput}`;
        }
      }
    }

    // Auto-expand parent folders and clear search filter so the new file is immediately visible
    const finalParts = finalPath.split('/');
    if (finalParts.length > 1) {
      expandFolderChain(finalParts.slice(0, -1).join('/'));
    }
    setSearchQuery('');

    onCreateFile(finalPath);
    setNewFileName('');
    setTargetFolder('');
    setIsCreatingFile(false);
  };

  const handleRenameSubmit = (oldPath: string, e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = renamingName.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (!trimmedInput) {
      setRenamingPath(null);
      return;
    }

    let newPath: string;
    if (trimmedInput.includes('/')) {
      // User specified a folder path (e.g. "src/components/Button.tsx") -> move + rename
      newPath = trimmedInput
        .split('/')
        .map(s => s.trim())
        .filter(Boolean)
        .join('/');
    } else {
      const parts = oldPath.split('/');
      parts[parts.length - 1] = trimmedInput;
      newPath = parts.join('/');
    }

    if (!newPath || newPath === oldPath) {
      setRenamingPath(null);
      return;
    }

    const newParts = newPath.split('/');
    if (newParts.length > 1) {
      expandFolderChain(newParts.slice(0, -1).join('/'));
    }

    onRenameFile(oldPath, newPath);
    setRenamingPath(null);
    setRenamingName('');
  };

  // Get visually pleasing colors based on language extension for file icons
  const getIconColor = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm': return 'text-orange-500';
      case 'css':
      case 'scss':
      case 'less': return 'text-blue-500';
      case 'js':
      case 'mjs':
      case 'cjs': return 'text-yellow-500';
      case 'jsx': return 'text-teal-400';
      case 'ts':
      case 'mts':
      case 'cts': return 'text-sky-500';
      case 'tsx': return 'text-indigo-400';
      case 'json':
      case 'jsonc': return 'text-amber-500';
      case 'md':
      case 'mdx': return 'text-purple-400';
      case 'svg':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'ico': return 'text-pink-400';
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
            draggable={!isRenamingThis}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/x-playground-file', child.path);
              e.dataTransfer.effectAllowed = 'move';
              setDraggingFilePath(child.path);
            }}
            onDragEnd={() => {
              setDraggingFilePath(null);
              setDragOverFolder(null);
            }}
            className={`group flex items-center justify-between px-3 py-1.5 mx-1 rounded-md transition-all duration-150 cursor-pointer ${
              isActive 
                ? 'bg-[#1E293B] text-slate-100 font-medium border-l-2 border-[#38BDF8] pl-2.5' 
                : 'hover:bg-[#1E293B]/40 text-slate-300 hover:text-white'
            } ${draggingFilePath === child.path ? 'opacity-50' : ''}`}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setRenamingPath(null);
                      }
                    }}
                    title="Inserisci un nuovo nome o percorso (es. src/file.tsx)"
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
                    setRenamingName(child.path);
                  }}
                  title="Rinomina o sposta (es. src/nome.tsx)"
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
        const isDragOver = dragOverFolder === child.path;
        return (
          <div key={child.path} className="flex flex-col">
            <div 
              className={`group flex items-center justify-between px-3 py-1.5 mx-1 rounded-md cursor-pointer transition-colors ${
                isDragOver
                  ? 'bg-sky-500/20 border border-sky-400/60 text-white'
                  : 'hover:bg-slate-800/40 text-slate-300 hover:text-white'
              }`}
              onClick={() => toggleFolder(child.path)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragOverFolder !== child.path) {
                  setDragOverFolder(child.path);
                }
              }}
              onDragLeave={(e) => {
                e.stopPropagation();
                if (dragOverFolder === child.path) {
                  setDragOverFolder(null);
                }
              }}
              onDrop={(e) => handleDropOnTarget(e, child.path)}
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

              <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTriggerFolderFileUpload(child.path);
                  }}
                  title={`Carica file in ${child.path}`}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded"
                  id={`upload-file-in-${child.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                >
                  <FileUp className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetFolder(child.path);
                    setCollapsedFolders(prev => ({ ...prev, [child.path]: false }));
                    setIsCreatingFile(true);
                    treeScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title={`Nuovo file in ${child.path}`}
                  className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-700/50 rounded"
                  id={`new-file-in-${child.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
                >
                  <Plus className="w-3 h-3" />
                </button>
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
            onClick={handleTriggerRootFileUpload}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-md transition text-[11px] font-medium"
            title="Carica singoli file locali e scegli la cartella di destinazione"
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
          {...({ webkitdirectory: "", directory: "" } as any)}
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
            onClick={() => {
              setTargetFolder('');
              setIsCreatingFile(true);
              treeScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
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
      <div
        ref={treeScrollRef}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOverFolder !== '') {
            setDragOverFolder('');
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setDragOverFolder(null);
          }
        }}
        onDrop={(e) => handleDropOnTarget(e, '')}
        className={`flex-1 overflow-y-auto py-2 flex flex-col space-y-0.5 custom-scrollbar select-none transition-colors ${
          dragOverFolder === '' ? 'bg-sky-500/5 ring-1 ring-inset ring-sky-500/30' : ''
        }`}
      >
        
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
                onClick={() => {
                  setIsCreatingFile(false);
                  setTargetFolder('');
                }}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {existingFolders.length > 0 && (
              <select
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-[11px] rounded p-1.5 text-slate-200 outline-none focus:border-sky-500 font-mono"
                title="Cartella di destinazione"
                id="select-target-folder"
              >
                <option value="">/ (cartella principale)</option>
                {existingFolders.map(folder => (
                  <option key={folder} value={folder}>
                    {folder}/
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder={targetFolder ? 'es. Button.tsx' : 'es. src/App.tsx o index.html'}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded p-1.5 text-white outline-none focus:border-sky-500"
              autoFocus
            />
            <div className="flex justify-end space-x-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFile(false);
                  setTargetFolder('');
                }}
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
            Nessun file caricato. Trascina file qui o premi 'Carica Cartella'.
          </div>
        ) : (
          <div className="flex flex-col">
            {renderTreeNodes(treeRoot)}
          </div>
        )}
      </div>

      {/* Upload Destination Modal */}
      {pendingUploadFiles && pendingUploadFiles.length > 0 && (
        <div
          className="fixed inset-0 bg-[#0F172A]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPendingUploadFiles(null)}
        >
          <form
            onSubmit={handleConfirmUploadModal}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0B1120] border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col space-y-4"
            id="upload-destination-modal"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderInput className="w-4 h-4 text-[#38BDF8]" />
                <span>Scegli cartella di destinazione</span>
              </h3>
              <button
                type="button"
                onClick={() => setPendingUploadFiles(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 max-h-28 overflow-y-auto space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                File selezionati ({pendingUploadFiles.length}):
              </div>
              {pendingUploadFiles.map((f, idx) => (
                <div key={idx} className="text-xs text-slate-200 font-mono truncate flex items-center gap-1.5">
                  <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${getIconColor(f.name)}`} />
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Cartella esistente:
              </label>
              <select
                value={uploadModalFolder}
                onChange={(e) => {
                  setUploadModalFolder(e.target.value);
                  setUploadCustomFolder('');
                }}
                className="bg-slate-900 border border-slate-700 text-xs rounded-md p-2 text-slate-100 outline-none focus:border-sky-500 font-mono"
                id="select-upload-destination-folder"
              >
                <option value="">/ (cartella principale)</option>
                {existingFolders.map(folder => (
                  <option key={folder} value={folder}>
                    {folder}/
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">
                Oppure inserisci un percorso personalizzato (opzionale):
              </label>
              <input
                type="text"
                value={uploadCustomFolder}
                onChange={(e) => setUploadCustomFolder(e.target.value)}
                placeholder="es. src/components o assets/images"
                className="bg-slate-900 border border-slate-700 text-xs rounded-md p-2 text-white outline-none focus:border-sky-500 font-mono"
                id="input-upload-custom-folder"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingUploadFiles(null)}
                className="px-3.5 py-1.5 bg-[#1E293B] hover:bg-slate-700 text-slate-300 rounded-md text-xs transition"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#38BDF8] hover:bg-[#7dd3fc] text-[#0F172A] font-bold rounded-md text-xs transition"
                id="btn-confirm-upload-folder"
              >
                Carica qui
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
