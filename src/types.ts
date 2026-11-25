export interface VirtualFile {
  path: string; // Full relative path, e.g. "my-folder/src/App.tsx" or "index.html"
  name: string; // File name only, e.g. "App.tsx"
  content: string; // File contents
  language: string; // Monaco editor language mode
}

export interface Tab {
  filePath: string;
}

export const getLanguageFromExtension = (fileName: string): string => {
  const lowerName = fileName.trim().toLowerCase();
  if (lowerName === 'dockerfile') return 'dockerfile';
  if (lowerName.startsWith('.env')) return 'ini';

  const ext = lowerName.split('.').pop();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
      return 'scss';
    case 'less':
      return 'less';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'json':
    case 'jsonc':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'svg':
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sql':
      return 'sql';
    case 'py':
      return 'python';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
    case 'bmp':
    case 'avif':
      return 'image';
    default:
      return 'plaintext';
  }
};
