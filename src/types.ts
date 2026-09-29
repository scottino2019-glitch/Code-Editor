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
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'js':
      return 'javascript';
    case 'jsx':
      return 'javascript'; // Monaco handles JSX within javascript/typescript
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'svg':
      return 'xml';
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
