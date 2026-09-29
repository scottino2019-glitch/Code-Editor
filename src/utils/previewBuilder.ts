import * as Babel from '@babel/standalone';
import { VirtualFile } from '../types';

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: string;
}

// -------------------------------------------------------------
// 1. Loop Protection Plugin to prevent browser freeze on infinite loops
// -------------------------------------------------------------
try {
  if (typeof Babel.registerPlugin === 'function') {
    Babel.registerPlugin('loop-protection', function loopProtectionPlugin({ types: t }: any) {
      return {
        visitor: {
          'WhileStatement|ForStatement|DoWhileStatement'(path: any) {
            const loopId = path.scope.generateUidIdentifier('loopGuard');
            const initGuard = t.variableDeclaration('let', [
              t.variableDeclarator(loopId, t.numericLiteral(0))
            ]);
            const checkGuard = t.ifStatement(
              t.binaryExpression('>', t.updateExpression('++', loopId, false), t.numericLiteral(50000)),
              t.throwStatement(t.newExpression(t.identifier('Error'), [
                t.stringLiteral('Possibile ciclo infinito interrotto automaticamente per proteggere l\'editor!')
              ]))
            );
            path.insertBefore(initGuard);
            if (t.isBlockStatement(path.node.body)) {
              path.node.body.body.unshift(checkGuard);
            } else {
              path.node.body = t.blockStatement([checkGuard, path.node.body]);
            }
          }
        }
      };
    });
  }
} catch (e) {
  // Plugin might already be registered
}

// -------------------------------------------------------------
// 2. High-Speed Transpilation Cache
// -------------------------------------------------------------
interface CachedTranspile {
  content: string;
  compiledCode: string;
  error?: string;
}

const transpileCache = new Map<string, CachedTranspile>();

/**
 * Normalizes a virtual file path: strips leading slashes, backslashes,
 * and trims whitespace from individual path segments.
 */
function normalizePath(p: string): string {
  if (!p) return '';
  const clean = String(p).replace(/\\/g, '/').trim();
  const segments = clean.split('/').map(s => s.trim()).filter(Boolean);
  const resolved: string[] = [];
  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') {
      if (resolved.length > 0) resolved.pop();
    } else {
      resolved.push(seg);
    }
  }
  return resolved.join('/');
}

/**
 * Generates an elegant SVG data URL placeholder for missing local images.
 * This guarantees the UI does not show broken image boxes or 404 network errors.
 */
function getPlaceholderDataUrl(name: string): string {
  const cleanName = name.split('/').pop() || name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGrad)" rx="12" stroke="#334155" stroke-width="2"/>
  <circle cx="160" cy="75" r="26" fill="#38bdf8" opacity="0.15"/>
  <path d="M148 65 L172 65 M160 55 L160 75 M148 88 L172 88" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
  <text x="160" y="130" fill="#f1f5f9" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" text-anchor="middle">🖼️ ${cleanName}</text>
  <text x="160" y="152" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11" text-anchor="middle">Immagine locale collegata</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Searches and resolves a virtual file across the workspace.
 * Handles relative paths, absolute paths, casing differences, and filename-only fallbacks.
 */
function resolveVirtualFile(specifier: string, fromPath: string, allFiles: VirtualFile[]): VirtualFile | undefined {
  if (!specifier) return undefined;

  let clean = String(specifier).replace(/\\/g, '/').trim();
  clean = clean.replace(/^["']|["']$/g, '');
  clean = clean.split('?')[0].split('#')[0]; // remove query / hash

  // Remove alias @/ or ~/
  if (clean.startsWith('@/')) clean = clean.slice(2);
  else if (clean.startsWith('~/')) clean = clean.slice(2);

  const normalizedTarget = normalizePath(clean);
  const targetBaseName = (normalizedTarget.split('/').pop() || '').toLowerCase();
  const targetBaseWithoutExt = targetBaseName.replace(/\.[^.]+$/, '');

  // 1. Direct path matches (exact or normalized)
  const exactMatch = allFiles.find(f => {
    const fnNorm = normalizePath(f.path);
    return fnNorm === normalizedTarget || fnNorm.toLowerCase() === normalizedTarget.toLowerCase();
  });
  if (exactMatch) return exactMatch;

  // 2. Relative from fromPath
  if (fromPath && (clean.startsWith('./') || clean.startsWith('../') || !clean.includes('/'))) {
    const fromDir = normalizePath(fromPath).split('/').slice(0, -1).join('/');
    const combined = fromDir ? `${fromDir}/${clean}` : clean;
    const normCombined = normalizePath(combined);
    const relMatch = allFiles.find(f => {
      const fnNorm = normalizePath(f.path);
      return fnNorm === normCombined || fnNorm.toLowerCase() === normCombined.toLowerCase();
    });
    if (relMatch) return relMatch;
  }

  // 3. Search in src/ or components/ subdirectories
  const prefixes = ['src/', 'src/components/', 'components/', 'assets/', 'images/', 'public/'];
  for (const prefix of prefixes) {
    const candidate = normalizePath(prefix + clean);
    const m = allFiles.find(f => normalizePath(f.path).toLowerCase() === candidate.toLowerCase());
    if (m) return m;
  }

  // 4. Filename exact match (ignoring folder location)
  const filenameMatch = allFiles.find(f => {
    const fName = f.name.trim().toLowerCase();
    return fName === targetBaseName;
  });
  if (filenameMatch) return filenameMatch;

  // 5. Filename without extension match
  const noExtMatch = allFiles.find(f => {
    const fNameNoExt = f.name.trim().replace(/\.[^.]+$/, '').toLowerCase();
    return fNameNoExt === targetBaseWithoutExt;
  });
  if (noExtMatch) return noExtMatch;

  return undefined;
}

/**
 * Resolves an asset specifier (image, svg, etc.) to a usable data URL.
 */
function resolveAssetDataUrl(specifier: string, fromPath: string, allFiles: VirtualFile[]): string {
  if (!specifier) return '';
  const trimmed = specifier.trim();

  // If already an external URL or data URL, leave as is
  if (/^(https?:|\/\/|data:)/i.test(trimmed)) {
    return trimmed;
  }

  const foundFile = resolveVirtualFile(trimmed, fromPath, allFiles);
  if (foundFile) {
    const content = foundFile.content;
    if (content.startsWith('data:')) {
      return content;
    }
    const ext = foundFile.name.split('.').pop()?.toLowerCase();
    if (ext === 'svg' || content.trim().startsWith('<svg') || content.trim().startsWith('<?xml')) {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`;
    }
    // Binary image data
    let mime = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
    else if (ext === 'webp') mime = 'image/webp';
    else if (ext === 'gif') mime = 'image/gif';
    else if (ext === 'ico') mime = 'image/x-icon';

    if (/^[A-Za-z0-9+/=]+$/.test(content.trim()) && content.length > 50) {
      return `data:${mime};base64,${content.trim()}`;
    }
    return getPlaceholderDataUrl(foundFile.name);
  }

  // Return a stylish inline SVG placeholder for missing images so no broken boxes/404s appear
  return getPlaceholderDataUrl(trimmed);
}

/**
 * Inlines @import statements and converts url(...) declarations in CSS.
 */
function processCssStyles(cssContent: string, cssFilePath: string, allFiles: VirtualFile[], visited = new Set<string>()): string {
  if (visited.has(cssFilePath)) return ''; // Prevent cyclic @import
  visited.add(cssFilePath);

  // 1. Resolve @import statements
  let processed = cssContent.replace(/@import\s+(?:url\(['"]?([^'")]+)['"]?\)|['"]([^'"]+)['"])\s*;?/gi, (match, url1, url2) => {
    const importPath = (url1 || url2 || '').trim();
    if (!importPath || /^(https?:|\/\/)/i.test(importPath)) return match;

    const importedFile = resolveVirtualFile(importPath, cssFilePath, allFiles);
    if (importedFile && importedFile.name.toLowerCase().endsWith('.css')) {
      return `\n/* Inlined @import "${importPath}" */\n${processCssStyles(importedFile.content, importedFile.path, allFiles, visited)}\n`;
    }
    return `/* @import "${importPath}" non trovato */`;
  });

  // 2. Resolve url(...) references (images, fonts, assets)
  processed = processed.replace(/url\(\s*(['"]?)(?!data:)(?!https?:)(?!\/\/)([^'")]+)\1\s*\)/gi, (match, quote, url) => {
    const cleanUrl = url.trim();
    if (!cleanUrl || cleanUrl.startsWith('#')) return match; // SVG anchors/fragments

    const resolvedUrl = resolveAssetDataUrl(cleanUrl, cssFilePath, allFiles);
    return `url("${resolvedUrl}")`;
  });

  return processed;
}

export function buildPreviewHtml(files: VirtualFile[]): string {
  try {
    // 1. Find HTML entrypoint, default to index.html or first .html file
    let htmlFile = files.find(f => f.name.toLowerCase() === 'index.html');
    if (!htmlFile) {
      htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
    }

    // 2. Group files by type
    const cssFiles = files.filter(f => f.name.toLowerCase().endsWith('.css'));
    const jsFiles = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext && ['js', 'jsx', 'ts', 'tsx'].includes(ext);
    });
    const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));
    const assetFiles = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg', 'bmp', 'avif'].includes(ext);
    });

    // Base HTML content
    let rawHtml = htmlFile ? htmlFile.content : `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anteprima Live</title>
</head>
<body>
    <div id="root"></div>
    <div id="app"></div>
</body>
</html>`;

    // Ensure there is a #root container for React apps to mount into
    if (!rawHtml.includes('id="root"') && !rawHtml.includes('id="app"')) {
      if (rawHtml.includes('</main>')) {
        rawHtml = rawHtml.replace('</main>', () => `<div id="root" style="margin-top: 1.5rem;"></div>\n</main>`);
      } else if (rawHtml.includes('</body>')) {
        rawHtml = rawHtml.replace('</body>', () => `<div id="root" style="margin-top: 1.5rem;"></div>\n</body>`);
      } else {
        rawHtml += `\n<div id="root" style="margin-top: 1.5rem;"></div>`;
      }
    }

    // 3. Console Interceptor & Error Catching Script
    const consoleScript = `
<script>
(function() {
  function sendLog(type, args) {
    try {
      const formattedArgs = Array.from(args).map(arg => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch(e) {
            return String(arg);
          }
        }
        return String(arg);
      });

      const strContent = formattedArgs.join(' ');
      if (strContent.includes('cdn.tailwindcss.com should not be used in production')) {
        return;
      }

      window.parent.postMessage({
        type: 'PREVIEW_CONSOLE_LOG',
        logType: type,
        args: formattedArgs,
        timestamp: new Date().toLocaleTimeString()
      }, '*');
    } catch(e) {}
  }

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origInfo = console.info;

  console.log = function() { sendLog('log', arguments); origLog.apply(console, arguments); };
  console.warn = function() { sendLog('warn', arguments); origWarn.apply(console, arguments); };
  console.error = function() { sendLog('error', arguments); origError.apply(console, arguments); };
  console.info = function() { sendLog('info', arguments); origInfo.apply(console, arguments); };

  window.addEventListener('error', function(event) {
    sendLog('error', [(event.message || 'Errore') + (event.lineno ? ' (linea ' + event.lineno + ')' : '')]);
  });

  window.addEventListener('unhandledrejection', function(event) {
    sendLog('error', ['Promise non gestita: ' + (event.reason ? (event.reason.message || event.reason) : 'Errore sconosciuto')]);
  });
})();
</script>
`;

    // 4. Global CDN Dependencies (React 18, ReactDOM 18, Tailwind CSS, Lucide Icons)
    const cdnScripts = `
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
`;

    // 5. Connect HTML to CSS: Inline all <link rel="stylesheet"> references seamlessly
    const inlinedCssPaths = new Set<string>();

    rawHtml = rawHtml.replace(/<link\b([^>]*\b(?:rel=["']stylesheet["']|href=["'][^"']+\.css["'])[^>]*)>/gi, (match, attrs) => {
      const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
      if (!hrefMatch) return match;
      const href = hrefMatch[1].trim();

      if (/^(https?:|\/\/)/i.test(href)) {
        return match; // Keep external CDN stylesheets
      }

      const matchingCss = resolveVirtualFile(href, htmlFile ? htmlFile.path : '', files);
      if (matchingCss && matchingCss.name.toLowerCase().endsWith('.css')) {
        inlinedCssPaths.add(matchingCss.path);
        const processed = processCssStyles(matchingCss.content, matchingCss.path, files);
        return `<style data-source="${matchingCss.path}">\n/* Collegato da HTML: <link rel="stylesheet" href="${href}"> */\n${processed}\n</style>`;
      }

      // If only 1 CSS file in project, connect it as the main stylesheet fallback
      if (cssFiles.length === 1 && !inlinedCssPaths.has(cssFiles[0].path)) {
        inlinedCssPaths.add(cssFiles[0].path);
        const processed = processCssStyles(cssFiles[0].content, cssFiles[0].path, files);
        return `<style data-source="${cssFiles[0].path}">\n/* Foglio di stile principale per "${href}" */\n${processed}\n</style>`;
      }

      return `<!-- [Foglio di stile locale non trovato: ${href}] -->`;
    });

    // Also include any remaining workspace CSS files (e.g. App.css, styles.css)
    let remainingCss = '';
    cssFiles.forEach(file => {
      if (!inlinedCssPaths.has(file.path)) {
        const processed = processCssStyles(file.content, file.path, files);
        remainingCss += `\n/* Stile workspace: ${file.path} */\n${processed}\n`;
      }
    });

    if (remainingCss.trim()) {
      const styleBlock = `<style id="__playground_workspace_styles__">\n${remainingCss}\n</style>`;
      if (rawHtml.includes('</head>')) {
        rawHtml = rawHtml.replace('</head>', () => `${styleBlock}\n</head>`);
      } else {
        rawHtml = styleBlock + '\n' + rawHtml;
      }
    }

    // 6. Connect HTML to Images: Resolve <img src="...">, <source srcset="...">, <link rel="icon">
    rawHtml = rawHtml.replace(/<img\b([^>]*\bsrc=["'])(?!data:)(?!https?:)(?!\/\/)([^"']+)(["'][^>]*)>/gi, (match, prefix, src, suffix) => {
      const resolved = resolveAssetDataUrl(src, htmlFile ? htmlFile.path : '', files);
      return `${prefix}${resolved}${suffix}`;
    });

    rawHtml = rawHtml.replace(/<source\b([^>]*\bsrcset=["'])(?!data:)(?!https?:)(?!\/\/)([^"']+)(["'][^>]*)>/gi, (match, prefix, srcset, suffix) => {
      const resolved = resolveAssetDataUrl(srcset, htmlFile ? htmlFile.path : '', files);
      return `${prefix}${resolved}${suffix}`;
    });

    rawHtml = rawHtml.replace(/<link\b([^>]*\b(?:rel=["'](?:icon|shortcut icon)["']|href=["'][^"']+\.(?:png|jpg|jpeg|ico|svg)["'])[^>]*)>/gi, (match, attrs) => {
      const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
      if (hrefMatch && !/^(https?:|\/\/|data:)/i.test(hrefMatch[1])) {
        const resolved = resolveAssetDataUrl(hrefMatch[1], htmlFile ? htmlFile.path : '', files);
        return match.replace(hrefMatch[0], `href="${resolved}"`);
      }
      return match;
    });

    // 7. Extract local <script src="..."> tags and transpile inline scripts from HTML
    const localScriptEntries: string[] = [];
    rawHtml = rawHtml.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/script>/gi, (match, before, src, after) => {
      if (/^(https?:|\/\/)/i.test(src)) {
        return match; // Keep external CDN scripts
      }
      localScriptEntries.push(src);
      return `<!-- [Script eseguito dal modulo virtuale: ${src}] -->`;
    });

    // Transpile any inline <script>...</script> tags in HTML that might contain import/export or JSX
    rawHtml = rawHtml.replace(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, inlineCode) => {
      if (/type=["'](application\/json|text\/html|text\/template)["']/i.test(attrs)) {
        return match;
      }
      if (/\b(import|export)\b/.test(inlineCode) || /<[A-Za-z0-9]/.test(inlineCode)) {
        try {
          const transformedInline = Babel.transform(inlineCode, {
            presets: [
              ['env', {
                targets: { chrome: '100', safari: '15', firefox: '100', edge: '100' },
                modules: 'cjs',
                loose: true
              }],
              'react',
              'typescript'
            ],
            filename: 'inline.tsx'
          });
          const wrapped = `(function(require, module, exports) {\n${transformedInline.code}\n})(window.__createRequire ? window.__createRequire('') : function(m){ return window[m]; }, { exports: {} }, {});`;
          return `<script ${attrs}>\n${wrapped}\n</script>`;
        } catch (e) {
          return `<script type="module" ${attrs}>\n${inlineCode}\n</script>`;
        }
      }
      return match;
    });

    // 8. Transpile all JS / TS / JSX / TSX files with Babel and build virtual modules dictionary
    const transpileErrors: string[] = [];
    const moduleDefs: string[] = [];
    const rawFileMap: Record<string, string> = {};

    // Populate raw files
    files.forEach(f => {
      rawFileMap[f.path] = f.content;
      rawFileMap[f.name] = f.content;
      const norm = normalizePath(f.path);
      if (norm) rawFileMap[norm] = f.content;
    });

    // Register Asset & Image Virtual Modules
    assetFiles.forEach(asset => {
      const dataUrl = resolveAssetDataUrl(asset.name, asset.path, files);
      const escapedDataUrl = JSON.stringify(dataUrl);
      const isSvg = asset.name.toLowerCase().endsWith('.svg');

      const assetModuleCode = isSvg ? `
  var SvgComp = function(props) {
    props = props || {};
    var p = Object.assign({
      src: ${escapedDataUrl},
      alt: ${JSON.stringify(asset.name)}
    }, props);
    return window.React ? window.React.createElement('img', p) : null;
  };
  SvgComp.default = ${escapedDataUrl};
  SvgComp.ReactComponent = SvgComp;
  SvgComp.toString = function() { return ${escapedDataUrl}; };
  SvgComp.valueOf = function() { return ${escapedDataUrl}; };
  module.exports = SvgComp;
` : `
  var assetVal = ${escapedDataUrl};
  var AssetExport = {
    default: assetVal,
    __esModule: true,
    toString: function() { return assetVal; },
    valueOf: function() { return assetVal; }
  };
  module.exports = AssetExport;
`;

      moduleDefs.push(`
// --- Asset Module: ${asset.path} ---
(function() {
  window.__modules__ = window.__modules__ || {};
  var modFn = function(require, module, exports) {
${assetModuleCode}
  };
  window.__modules__[${JSON.stringify(asset.path)}] = modFn;
  window.__modules__[${JSON.stringify(asset.name)}] = modFn;
  var normP = ${JSON.stringify(normalizePath(asset.path))};
  if (normP) window.__modules__[normP] = modFn;
})();
`);
    });

    // Transpile JS / TS / JSX / TSX with high-performance caching & modern targets
    const babelPlugins: string[] = [];
    if (Babel.availablePlugins && Babel.availablePlugins['loop-protection']) {
      babelPlugins.push('loop-protection');
    }

    jsFiles.forEach(jsFile => {
      const cacheKey = jsFile.path || jsFile.name;
      const cached = transpileCache.get(cacheKey);

      let compiledCode = '';

      if (cached && cached.content === jsFile.content) {
        if (cached.error) {
          transpileErrors.push(cached.error);
          return;
        }
        compiledCode = cached.compiledCode;
      } else {
        let code = jsFile.content;

        // Smart JSX Fix: <Component.tsx ... /> -> <Component ... />
        code = code.replace(/<(\/?)\s*([A-Za-z0-9_$]+)\.(?:tsx|jsx|ts|js)\b/gi, '<$1$2');

        try {
          const transformed = Babel.transform(code, {
            presets: [
              ['env', {
                targets: { chrome: '100', safari: '15', firefox: '100', edge: '100' },
                modules: 'cjs',
                loose: true
              }],
              'react',
              'typescript'
            ],
            plugins: babelPlugins,
            filename: jsFile.name.endsWith('.tsx') || jsFile.name.endsWith('.ts') ? jsFile.name : 'component.tsx'
          });

          compiledCode = transformed.code || '';
          transpileCache.set(cacheKey, {
            content: jsFile.content,
            compiledCode
          });
        } catch (err: any) {
          const errMsg = `[${jsFile.path}] Sintassi non valida: ${err?.message || err}`;
          transpileCache.set(cacheKey, {
            content: jsFile.content,
            compiledCode: '',
            error: errMsg
          });
          transpileErrors.push(errMsg);
          return;
        }
      }

      const escapedPath = JSON.stringify(jsFile.path);
      const escapedName = JSON.stringify(jsFile.name);
      const normalizedP = JSON.stringify(normalizePath(jsFile.path));

      moduleDefs.push(`
// --- Module: ${jsFile.path} ---
(function() {
  window.__modules__ = window.__modules__ || {};
  var modFn = function(require, module, exports) {
    try {
${compiledCode}
    } catch(err) {
      console.error("Errore durante l'esecuzione di ${jsFile.path}:", err);
      throw err;
    }
  };
  window.__modules__[${escapedPath}] = modFn;
  window.__modules__[${escapedName}] = modFn;
  if (${normalizedP}) {
    window.__modules__[${normalizedP}] = modFn;
  }
})();
`);
    });

    // 9. Virtual Module Loader & Auto-Mount Runtime
    const runtimeScript = `
<script id="__playground_bundler_runtime__">
(function() {
  window.__modules__ = window.__modules__ || {};
  window.__moduleCache__ = window.__moduleCache__ || {};
  window.__rawFiles__ = ${JSON.stringify(rawFileMap)};
  window.__scriptEntries__ = ${JSON.stringify(localScriptEntries)};

  function cleanStr(s) {
    if (!s) return '';
    var str = String(s).replace(/\\\\/g, '/').trim();
    str = str.replace(/^["']|["']$/g, '');
    str = str.split('?')[0].split('#')[0];
    if (str.startsWith('@/')) str = str.slice(2);
    else if (str.startsWith('~/')) str = str.slice(2);
    return str;
  }

  function norm(p) {
    if (!p) return '';
    var s = cleanStr(p);
    var parts = s.split('/').map(function(seg) { return seg.trim(); }).filter(Boolean);
    var resolved = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (part === '.') continue;
      if (part === '..') {
        if (resolved.length > 0) resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    return resolved.join('/');
  }

  // Enhanced Module Path Resolver
  window.__resolveModulePath = function(currentFile, specifier) {
    currentFile = norm(currentFile);
    var cleanSpecifier = cleanStr(specifier);
    if (!cleanSpecifier) return null;

    var available = Object.keys(window.__modules__).concat(Object.keys(window.__rawFiles__));

    function findMatch(target) {
      var nTarget = norm(target);
      if (!nTarget) return null;
      for (var i = 0; i < available.length; i++) {
        if (norm(available[i]) === nTarget) return available[i];
      }
      for (var i = 0; i < available.length; i++) {
        if (norm(available[i]).toLowerCase() === nTarget.toLowerCase()) return available[i];
      }
      return null;
    }

    var exts = [
      '', '.tsx', '.ts', '.jsx', '.js', '.json',
      '.svg', '.png', '.jpg', '.jpeg', '.webp', '.css',
      '/index.tsx', '/index.ts', '/index.jsx', '/index.js'
    ];

    // 1. Relative specifier (./ or ../)
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      var currentParts = currentFile ? currentFile.split('/').slice(0, -1) : [];
      var specParts = cleanSpecifier.split('/');
      for (var i = 0; i < specParts.length; i++) {
        var part = specParts[i].trim();
        if (part === '.' || part === '') continue;
        if (part === '..') {
          if (currentParts.length > 0) currentParts.pop();
        } else {
          currentParts.push(part);
        }
      }
      var basePath = currentParts.join('/');
      for (var j = 0; j < exts.length; j++) {
        var m = findMatch(basePath + exts[j]);
        if (m) return m;
      }
    }

    // 2. Absolute / project specifier (including @/ or ~/ alias)
    for (var j = 0; j < exts.length; j++) {
      var m = findMatch(cleanSpecifier + exts[j]);
      if (m) return m;
    }

    // 3. Search in caller's directory even if missing ./
    if (currentFile && !specifier.startsWith('.')) {
      var currentDir = currentFile.split('/').slice(0, -1).join('/');
      if (currentDir) {
        for (var j = 0; j < exts.length; j++) {
          var m = findMatch(currentDir + '/' + cleanSpecifier + exts[j]);
          if (m) return m;
        }
      }
    }

    // 4. Search in common folders (src/, src/components/, components/)
    var commonPrefixes = ['src/', 'src/components/', 'components/', 'assets/'];
    for (var p = 0; p < commonPrefixes.length; p++) {
      for (var j = 0; j < exts.length; j++) {
        var m = findMatch(commonPrefixes[p] + cleanSpecifier + exts[j]);
        if (m) return m;
      }
    }

    // 5. Global Fuzzy fallback: match by base filename anywhere in workspace
    var baseName = (cleanSpecifier.split('/').pop() || '').trim();
    var baseWithoutExt = baseName.replace(/\\.[^.]+$/, '');
    if (baseName) {
      for (var j = 0; j < exts.length; j++) {
        var target = (baseName + exts[j]).toLowerCase();
        for (var i = 0; i < available.length; i++) {
          var fn = (available[i].split('/').pop() || '').trim().toLowerCase();
          if (fn === target) return available[i];
        }
      }
      // Also match without extension
      for (var i = 0; i < available.length; i++) {
        var fn = (available[i].split('/').pop() || '').trim().toLowerCase();
        var fnNoExt = fn.replace(/\\.[^.]+$/, '');
        if (fnNoExt === baseWithoutExt.toLowerCase()) return available[i];
      }
    }

    return null;
  };

  // Smart Module Proxy to bridge named vs default export mismatches seamlessly
  function createModuleProxy(rawExports, modulePath) {
    if (!rawExports || (typeof rawExports !== 'object' && typeof rawExports !== 'function')) {
      return rawExports;
    }

    // 1. Auto-bridge default export if missing
    if (rawExports.default === undefined) {
      if (typeof rawExports === 'function') {
        rawExports.default = rawExports;
      } else {
        var keys = Object.keys(rawExports).filter(function(k) { return k !== '__esModule'; });
        var modBase = (modulePath.split('/').pop() || '').split('.')[0].toLowerCase().trim();
        var foundKey = null;

        for (var k = 0; k < keys.length; k++) {
          if (keys[k].toLowerCase().trim() === modBase && typeof rawExports[keys[k]] === 'function') {
            foundKey = keys[k];
            break;
          }
        }
        if (!foundKey && keys.length === 1 && typeof rawExports[keys[0]] === 'function') {
          foundKey = keys[0];
        }
        if (!foundKey) {
          for (var k = 0; k < keys.length; k++) {
            if (typeof rawExports[keys[k]] === 'function') {
              foundKey = keys[k];
              break;
            }
          }
        }
        if (foundKey) {
          rawExports.default = rawExports[foundKey];
        }
      }
    }

    // 2. Wrap in Proxy so named imports (e.g. import { Header } from './Header')
    // can fallback safely WITHOUT hijacking React internal properties, thenables or symbols
    return new Proxy(rawExports, {
      get: function(target, prop) {
        if (typeof prop === 'symbol') return target[prop];
        if (prop === '__esModule') return target.__esModule !== undefined ? target.__esModule : true;
        // Never return a function for 'then' - avoids infinite Promise / Suspense recursion
        if (prop === 'then') return undefined;
        // Never hijack React / JS lifecycle internals
        if (prop === '$$typeof' || prop === 'defaultProps' || prop === 'propTypes' || prop === 'contextTypes' || prop === 'childContextTypes' || prop === 'getDerivedStateFromProps' || prop === 'getDerivedStateFromError' || prop === 'prototype' || prop === 'displayName') {
          return target[prop];
        }
        if (prop in target) return target[prop];

        // Case-insensitive & trimmed property lookup
        var propStr = String(prop).toLowerCase().trim();
        for (var key in target) {
          if (key.toLowerCase().trim() === propStr) {
            return target[key];
          }
        }

        // If named import requested, only fallback to target.default IF it matches component name or module name
        if (target.default) {
          if (typeof target.default === 'function') {
            var defName = (target.default.name || '').toLowerCase().trim();
            var modBase = (modulePath.split('/').pop() || '').split('.')[0].toLowerCase().trim();
            if (defName === propStr || modBase === propStr) {
              return target.default;
            }
          }
          if (typeof target.default === 'object' && target.default !== null && prop in target.default) {
            return target.default[prop];
          }
        }

        // If default requested, find any exported component function
        if (prop === 'default') {
          for (var key in target) {
            if (key !== '__esModule' && typeof target[key] === 'function') {
              return target[key];
            }
          }
        }

        return undefined;
      }
    });
  }

  // Create scoped require function
  window.__createRequire = function(currentFile) {
    return function require(specifier) {
      if (specifier === 'react') {
        if (window.React && !window.React.default) window.React.default = window.React;
        return window.React;
      }
      if (specifier === 'react-dom') {
        if (window.ReactDOM && !window.ReactDOM.default) window.ReactDOM.default = window.ReactDOM;
        return window.ReactDOM;
      }
      if (specifier === 'react-dom/client') {
        return {
          createRoot: window.ReactDOM && window.ReactDOM.createRoot ? window.ReactDOM.createRoot.bind(window.ReactDOM) : null,
          hydrateRoot: window.ReactDOM && window.ReactDOM.hydrateRoot ? window.ReactDOM.hydrateRoot.bind(window.ReactDOM) : null,
          default: window.ReactDOM
        };
      }
      if (specifier === 'react/jsx-runtime' || specifier === 'react/jsx-dev-runtime') {
        return {
          jsx: window.React.createElement,
          jsxs: window.React.createElement,
          Fragment: window.React.Fragment
        };
      }
      if (specifier.endsWith('.css')) {
        return {}; // CSS imported in JS is bundled globally
      }
      if (specifier === 'lucide-react') {
        return new Proxy({}, {
          get: function(target, prop) {
            if (prop === '__esModule') return true;
            if (prop === 'default') return target;
            return function LucideIcon(props) {
              props = props || {};
              var iconName = String(prop);
              var kebab = iconName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
              var iconData = window.lucide && window.lucide.icons && (window.lucide.icons[prop] || window.lucide.icons[kebab] || window.lucide.icons[iconName.toLowerCase()]);
              
              if (iconData && iconData[2]) {
                var children = iconData[2].map(function(child, idx) {
                  var tag = child[0];
                  var attrs = Object.assign({ key: idx }, child[1]);
                  return window.React.createElement(tag, attrs);
                });
                var svgProps = Object.assign({
                  xmlns: 'http://www.w3.org/2000/svg',
                  width: props.size || 20,
                  height: props.size || 20,
                  viewBox: '0 0 24 24',
                  fill: props.fill || 'none',
                  stroke: props.stroke || 'currentColor',
                  strokeWidth: props.strokeWidth || 2,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round'
                }, props);
                return window.React.createElement('svg', svgProps, children);
              }

              return window.React.createElement('svg', Object.assign({
                xmlns: 'http://www.w3.org/2000/svg',
                width: props.size || 18,
                height: props.size || 18,
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
              }, props),
                window.React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
                window.React.createElement('path', { d: 'M12 8v4m0 4h.01' })
              );
            };
          }
        });
      }

      var resolved = window.__resolveModulePath(currentFile, specifier);
      if (!resolved) {
        console.warn("[Modulo virtuale non trovato] '" + specifier + "' (richiesto da '" + (currentFile || 'root') + "').");

        var makeFallback = function(name) {
          var cleanName = String(name || 'Modulo').replace(/[^a-zA-Z0-9_$]/g, '');
          var FallbackComp = function(props) {
            return window.React ? window.React.createElement('div', {
              style: {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                margin: '2px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px dashed #f59e0b',
                borderRadius: '6px',
                color: '#d97706',
                fontSize: '11px',
                fontFamily: 'monospace'
              },
              title: "Modulo non trovato: " + specifier
            }, '⚠️ ' + (cleanName || specifier)) : null;
          };

          FallbackComp.displayName = 'MissingModule_' + cleanName;
          FallbackComp.default = FallbackComp;
          FallbackComp.__esModule = true;

          return new Proxy(FallbackComp, {
            get: function(t, p) {
              if (typeof p === 'symbol') return undefined;
              if (p === '__esModule') return true;
              if (p === 'default') return t;
              if (p === 'then' || p === '$$typeof' || p === 'defaultProps' || p === 'propTypes' || p === 'contextTypes') return undefined;
              if (p in t) return t[p];
              return FallbackComp;
            }
          });
        };

        return makeFallback(specifier);
      }

      if (window.__moduleCache__[resolved]) {
        return window.__moduleCache__[resolved].exports;
      }

      // JSON files
      if (resolved.endsWith('.json')) {
        var jsonContent = window.__rawFiles__[resolved];
        if (jsonContent !== undefined) {
          try {
            var parsed = JSON.parse(jsonContent);
            var m = { exports: parsed };
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsed.default = parsed;
            }
            window.__moduleCache__[resolved] = m;
            return m.exports;
          } catch(err) {
            throw new Error("Errore nel parsing JSON di " + resolved + ": " + err.message);
          }
        }
      }

      var fn = window.__modules__[resolved];
      if (!fn) {
        throw new Error("Modulo non compilato o non trovato: " + resolved);
      }

      var moduleObj = { exports: {} };
      window.__moduleCache__[resolved] = moduleObj;
      fn(window.__createRequire(resolved), moduleObj, moduleObj.exports);

      // Auto-bridge and wrap in resilient Proxy
      moduleObj.exports = createModuleProxy(moduleObj.exports, resolved);

      return moduleObj.exports;
    };
  };

  // Launch application
  function runPlaygroundApp() {
    // 1. Run scripts explicitly declared in HTML
    var scriptEntries = window.__scriptEntries__ || [];
    scriptEntries.forEach(function(entry) {
      try {
        var resolved = window.__resolveModulePath('', entry);
        if (resolved) {
          window.__createRequire('')(resolved);
        }
      } catch (e) {
        console.error("Errore durante l'avvio dello script '" + entry + "':", e);
      }
    });

    // 2. Discover React entry points (e.g. App.tsx, src/App.tsx, app.tsx, main.tsx)
    var commonEntries = [
      'src/App.tsx', 'src/App.jsx', 'App.tsx', 'App.jsx',
      'src/app.tsx', 'src/app.jsx', 'app.tsx', 'app.jsx',
      'src/main.tsx', 'src/main.jsx', 'main.tsx', 'main.jsx',
      'src/index.tsx', 'src/index.jsx', 'index.tsx', 'index.jsx'
    ];

    // Safe createElement to prevent blank screens when rendering undefined components
    if (window.React && !window.React.__origCreateElement) {
      window.React.__origCreateElement = window.React.createElement;
      window.React.createElement = function(type) {
        if (type === undefined || type === null) {
          console.error("Tentativo di renderizzare un componente 'undefined'. Verifica l'export del componente (export default vs named export).");
          return window.React.__origCreateElement('div', {
            style: {
              padding: '12px 16px',
              margin: '8px 0',
              border: '1px dashed #ef4444',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontSize: '13px',
              fontFamily: 'sans-serif'
            }
          }, "⚠️ Componente non trovato o non esportato correttamente. Controlla il nome del componente.");
        }
        return window.React.__origCreateElement.apply(window.React, arguments);
      };
    }

    var appComponent = null;
    var lastLoadError = null;

    for (var i = 0; i < commonEntries.length; i++) {
      var match = window.__resolveModulePath('', commonEntries[i]);
      if (match && window.__modules__[match]) {
        try {
          var modExports = window.__createRequire('')(match);
          if (modExports) {
            var candidate = modExports.default || modExports.App || modExports.app || (typeof modExports === 'function' ? modExports : null);
            if (!candidate && typeof modExports === 'object') {
              for (var prop in modExports) {
                if (prop !== '__esModule' && typeof modExports[prop] === 'function') {
                  candidate = modExports[prop];
                  break;
                }
              }
            }
            if (candidate && !appComponent) {
              appComponent = candidate;
              break;
            }
          }
        } catch (e) {
          lastLoadError = e;
          console.error("Errore durante l'inizializzazione di '" + match + "':", e);
        }
      }
    }

    // 2b. If no component found in common entries, scan compiled modules (filtering duplicates)
    if (!appComponent) {
      var visitedFiles = {};
      var modKeys = Object.keys(window.__modules__);
      for (var m = 0; m < modKeys.length; m++) {
        var modKey = modKeys[m];
        if (!modKey.endsWith('.tsx') && !modKey.endsWith('.jsx') && !modKey.endsWith('.js') && !modKey.endsWith('.ts')) continue;
        var canonical = norm(modKey);
        if (visitedFiles[canonical]) continue;
        visitedFiles[canonical] = true;

        try {
          var exportsObj = window.__createRequire('')(modKey);
          if (exportsObj) {
            var comp = exportsObj.default;
            if (!comp || typeof comp !== 'function') {
              for (var p in exportsObj) {
                if (p !== '__esModule' && typeof exportsObj[p] === 'function') {
                  comp = exportsObj[p];
                  break;
                }
              }
            }
            if (comp && typeof comp === 'function') {
              appComponent = comp;
              break;
            }
          }
        } catch (err) {
          lastLoadError = lastLoadError || err;
        }
      }
    }

    // Display error box if component failed to load
    if (!appComponent && lastLoadError) {
      var errorRoot = document.getElementById('root') || document.getElementById('app') || document.body;
      if (errorRoot) {
        var errContainer = document.createElement('div');
        errContainer.innerHTML = '<div style="padding: 20px; margin: 16px; background: #1e1e2e; border: 2px solid #ef4444; border-radius: 10px; color: #f8fafc; font-family: system-ui, sans-serif;">' +
          '<div style="font-size: 16px; font-weight: bold; color: #f87171; margin-bottom: 8px;">⚠️ Errore di Caricamento Modulo</div>' +
          '<p style="font-size: 13px; color: #cbd5e1; margin-bottom: 8px;">Si è verificato un errore durante l\\'inizializzazione:</p>' +
          '<pre style="background: #0f172a; color: #fca5a5; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; white-space: pre-wrap; border: 1px solid #334155;">' + (lastLoadError.message || String(lastLoadError)) + '</pre>' +
        '</div>';
        errorRoot.appendChild(errContainer);
      }
    }

    // 3. Auto-mount React App if found
    if (appComponent && window.React && window.ReactDOM) {
      var rootEl = document.getElementById('root') || document.getElementById('app');
      if (!rootEl) {
        rootEl = document.createElement('div');
        rootEl.id = 'root';
        document.body.appendChild(rootEl);
      }

      if (rootEl) {
        rootEl.style.width = '100%';
        try {
          // React Error Boundary
          var ErrorBoundaryClass = (function(_super) {
            function ErrorBoundaryClass(props) {
              _super.call(this, props);
              this.state = { hasError: false, error: null };
            }
            if (window.React.Component) {
              ErrorBoundaryClass.prototype = Object.create(window.React.Component.prototype);
              ErrorBoundaryClass.prototype.constructor = ErrorBoundaryClass;
              ErrorBoundaryClass.getDerivedStateFromError = function(error) {
                return { hasError: true, error: error };
              };
              ErrorBoundaryClass.prototype.componentDidCatch = function(error, info) {
                console.error("Errore nel rendering React:", error, info);
              };
              ErrorBoundaryClass.prototype.render = function() {
                if (this.state.hasError) {
                  return window.React.createElement('div', {
                    style: {
                      padding: '20px',
                      margin: '16px',
                      backgroundColor: '#1e1e2e',
                      border: '2px solid #ef4444',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }
                  },
                    window.React.createElement('div', {
                      style: { display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }
                    }, '⚠️ Errore nel Componente React'),
                    window.React.createElement('pre', {
                      style: {
                        background: '#0f172a',
                        color: '#fca5a5',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid #334155'
                      }
                    }, this.state.error ? (this.state.error.message || String(this.state.error)) : 'Errore sconosciuto')
                  );
                }
                return this.props.children;
              };
            }
            return ErrorBoundaryClass;
          })(window.React.Component);

          var appElem = window.React.createElement(ErrorBoundaryClass, null, window.React.createElement(appComponent));
          if (window.ReactDOM.createRoot) {
            window.ReactDOM.createRoot(rootEl).render(appElem);
          } else if (window.ReactDOM.render) {
            window.ReactDOM.render(appElem, rootEl);
          }
        } catch (mountErr) {
          console.error("Errore durante il montaggio del componente principale:", mountErr);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runPlaygroundApp);
  } else {
    runPlaygroundApp();
  }
})();
</script>
`;

    // 10. Combine all compiled modules
    const modulesBundle = `
<script id="__playground_modules__">
${moduleDefs.join('\n')}
</script>
`;

    // 11. Inject into HTML document
    if (rawHtml.includes('<head>')) {
      rawHtml = rawHtml.replace('<head>', () => `<head>\n${consoleScript}\n${cdnScripts}`);
    } else {
      rawHtml = `<!DOCTYPE html><html><head>${consoleScript}${cdnScripts}</head><body>${rawHtml}</body></html>`;
    }

    const initScript = `
<script id="__playground_init__">
  window.__modules__ = window.__modules__ || {};
  window.__moduleCache__ = window.__moduleCache__ || {};
</script>
`;

    const scriptsBlock = `\n${initScript}\n${modulesBundle}\n${runtimeScript}\n`;
    if (rawHtml.includes('</body>')) {
      rawHtml = rawHtml.replace('</body>', () => `${scriptsBlock}</body>`);
    } else {
      rawHtml += scriptsBlock;
    }

    // 12. If syntax/transpile errors occurred, show error banner
    if (transpileErrors.length > 0) {
      const errorHtml = `
        <div style="background:#450a0a; color:#fca5a5; padding:12px; border-bottom:2px solid #ef4444; font-family:monospace; font-size:12px; z-index:9999; position:relative;">
          <strong>⚠️ Errore di Compilazione nel Codice:</strong>
          <ul style="margin:6px 0 0 18px; padding:0;">
            ${transpileErrors.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `;
      if (rawHtml.includes('<body')) {
        rawHtml = rawHtml.replace(/<body[^>]*>/, match => `${match}\n${errorHtml}`);
      } else {
        rawHtml = errorHtml + rawHtml;
      }
    }

    return rawHtml;
  } catch (err: any) {
    return `<!DOCTYPE html><html><head><style>body{background:#0F172A;color:#f87171;font-family:sans-serif;padding:24px;}</style></head><body><h3>⚠️ Errore nella generazione dell'Anteprima</h3><pre>${err?.message || err}</pre></body></html>`;
  }
}
