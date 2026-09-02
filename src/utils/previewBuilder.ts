import * as Babel from '@babel/standalone';
import { VirtualFile } from '../types';

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: string;
}

export function buildPreviewHtml(files: VirtualFile[]): string {
  try {
    // 1. Find HTML entrypoint, default to index.html or first .html file
    let htmlFile = files.find(f => f.name.toLowerCase() === 'index.html');
    if (!htmlFile) {
      htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
    }

    // 2. Get CSS files
    const cssFiles = files.filter(f => f.name.toLowerCase().endsWith('.css'));
    
    // 3. Get JS / JSX / TS / TSX files
    const jsFiles = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext && ['js', 'jsx', 'ts', 'tsx'].includes(ext);
    });

    // 4. Get JSON files
    const jsonFiles = files.filter(f => f.name.toLowerCase().endsWith('.json'));

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

    // 5. Console Interceptor & Error Catching Script
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
      // Ignora l'avviso informativo standard del CDN di Tailwind (normale nei playground/sandbox)
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

    // 6. Global CDN Dependencies (React 18, ReactDOM 18, Tailwind CSS)
    const cdnScripts = `
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://cdn.tailwindcss.com"></script>
`;

    // 7. Prepare CSS styles
    let combinedStyles = '';
    cssFiles.forEach(file => {
      combinedStyles += `\n/* ${file.path} */\n${file.content}\n`;
    });
    const styleTag = `<style id="__playground_styles__">\n${combinedStyles}\n</style>`;

    if (cssFiles.length > 0) {
      cssFiles.forEach(cssFile => {
        const regex = new RegExp(`<link[^>]*href=["'](?:\.\/)?${cssFile.name.replace('.', '\\.')}["'][^>]*>`, 'gi');
        rawHtml = rawHtml.replace(regex, () => `<!-- Stile integrato: ${cssFile.name} -->`);
      });
      if (rawHtml.includes('</head>')) {
        rawHtml = rawHtml.replace('</head>', () => `${styleTag}\n</head>`);
      } else {
        rawHtml = styleTag + '\n' + rawHtml;
      }
    }

    // 8. Extract local <script src="..."> tags from HTML
    const localScriptEntries: string[] = [];
    rawHtml = rawHtml.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (match, _before, src, _after) => {
      if (/^(https?:|\/\/)/i.test(src)) {
        return match; // Keep external CDN scripts
      }
      localScriptEntries.push(src);
      return `<!-- [Script eseguito dal modulo virtuale: ${src}] -->`;
    });

    // 9. Transpile all JS / TS / JSX / TSX files with Babel and build virtual modules dictionary
    const transpileErrors: string[] = [];
    const moduleDefs: string[] = [];
    const rawFileMap: Record<string, string> = {};

    jsonFiles.forEach(jf => {
      rawFileMap[jf.path] = jf.content;
      if (!rawFileMap[jf.name]) rawFileMap[jf.name] = jf.content;
    });

    jsFiles.forEach(jsFile => {
      let code = jsFile.content;

      // Smart JSX Fix:
      // If user wrote <ComponentName.tsx ... /> or <ComponentName.jsx ... /> in JSX,
      // in React this evaluates to React.createElement(ComponentName.tsx) which is undefined.
      // Auto-correct to <ComponentName ... />
      code = code.replace(/<(\/?)\s*([A-Za-z0-9_$]+)\.(?:tsx|jsx|ts|js)\b/gi, '<$1$2');

      try {
        const transformed = Babel.transform(code, {
          presets: ['env', 'react', 'typescript'],
          filename: jsFile.name
        });

        const compiledCode = transformed.code || '';
        const escapedPath = JSON.stringify(jsFile.path);
        const escapedName = JSON.stringify(jsFile.name);

        moduleDefs.push(`
// --- Module: ${jsFile.path} ---
(function() {
  var modFn = function(require, module, exports) {
    try {
${compiledCode}
    } catch(err) {
      console.error("Errore durante l'esecuzione di ${jsFile.path}:", err);
      throw err;
    }
  };
  window.__modules__[${escapedPath}] = modFn;
  if (!window.__modules__[${escapedName}]) {
    window.__modules__[${escapedName}] = modFn;
  }
})();
`);
      } catch (err: any) {
        transpileErrors.push(`[${jsFile.path}] Sintassi non valida: ${err?.message || err}`);
      }
    });

    // 10. Virtual Module Loader & Auto-Mount Runtime
    const runtimeScript = `
<script id="__playground_bundler_runtime__">
(function() {
  window.__modules__ = window.__modules__ || {};
  window.__moduleCache__ = window.__moduleCache__ || {};
  window.__rawFiles__ = ${JSON.stringify(rawFileMap)};
  window.__scriptEntries__ = ${JSON.stringify(localScriptEntries)};

  function norm(p) {
    if (!p) return '';
    var s = String(p).replace(/\\\\/g, '/');
    while (s.startsWith('./')) s = s.slice(2);
    while (s.startsWith('/')) s = s.slice(1);
    return s;
  }

  // Module path resolver
  window.__resolveModulePath = function(currentFile, specifier) {
    currentFile = norm(currentFile);
    specifier = String(specifier).replace(/\\\\/g, '/');

    var available = Object.keys(window.__modules__).concat(Object.keys(window.__rawFiles__));
    function findMatch(target) {
      var nTarget = norm(target);
      for (var i = 0; i < available.length; i++) {
        if (norm(available[i]) === nTarget) return available[i];
      }
      for (var i = 0; i < available.length; i++) {
        if (norm(available[i]).toLowerCase() === nTarget.toLowerCase()) return available[i];
      }
      return null;
    }

    var exts = ['', '.tsx', '.ts', '.jsx', '.js', '.json', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];

    // 1. Relative specifier (./ or ../)
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      var currentParts = currentFile ? currentFile.split('/').slice(0, -1) : [];
      var specParts = specifier.split('/');
      for (var i = 0; i < specParts.length; i++) {
        var part = specParts[i];
        if (part === '.' || part === '') continue;
        if (part === '..') {
          currentParts.pop();
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

    // 2. Absolute / project specifier
    for (var j = 0; j < exts.length; j++) {
      var m = findMatch(specifier + exts[j]);
      if (m) return m;
    }

    // 3. Search in current directory even without ./ prefix
    if (currentFile && !specifier.startsWith('.')) {
      var currentDir = currentFile.split('/').slice(0, -1).join('/');
      if (currentDir) {
        for (var j = 0; j < exts.length; j++) {
          var m = findMatch(currentDir + '/' + specifier + exts[j]);
          if (m) return m;
        }
      }
    }

    // 4. Fuzzy fallback: match by filename anywhere in project
    var baseName = specifier.split('/').pop() || '';
    if (baseName) {
      for (var j = 0; j < exts.length; j++) {
        var target = (baseName + exts[j]).toLowerCase();
        for (var i = 0; i < available.length; i++) {
          var fn = (available[i].split('/').pop() || '').toLowerCase();
          if (fn === target) return available[i];
        }
      }
    }

    return null;
  };

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
        return {};
      }
      if (specifier === 'lucide-react') {
        return new Proxy({}, {
          get: function(target, prop) {
            if (prop === '__esModule') return true;
            if (prop === 'default') return target;
            return function GenericIcon(props) {
              return window.React.createElement('span', {
                ...props,
                style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1em', minHeight: '1em', ...(props && props.style ? props.style : {}) },
                title: String(prop)
              }, '❖');
            };
          }
        });
      }

      var resolved = window.__resolveModulePath(currentFile, specifier);
      if (!resolved) {
        throw new Error("Impossibile importare '" + specifier + "' da '" + currentFile + "': modulo non trovato. Verifica il percorso del file.");
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

      // Auto-bridge default export if user exported a named component or default is missing
      if (moduleObj.exports && typeof moduleObj.exports === 'object') {
        if (!moduleObj.exports.default) {
          var keys = Object.keys(moduleObj.exports).filter(function(k) { return k !== '__esModule'; });
          if (keys.length === 1 && typeof moduleObj.exports[keys[0]] === 'function') {
            moduleObj.exports.default = moduleObj.exports[keys[0]];
          } else if (keys.length > 1) {
            var fnName = (resolved.split('/').pop() || '').split('.')[0];
            for (var k = 0; k < keys.length; k++) {
              if (keys[k].toLowerCase() === fnName.toLowerCase() && typeof moduleObj.exports[keys[k]] === 'function') {
                moduleObj.exports.default = moduleObj.exports[keys[k]];
                break;
              }
            }
          }
        }
      }

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
      'src/main.tsx', 'src/main.jsx', 'main.tsx', 'main.jsx',
      'src/index.tsx', 'src/index.jsx', 'index.tsx', 'index.jsx',
      'src/App.tsx', 'src/App.jsx', 'App.tsx', 'App.jsx',
      'src/app.tsx', 'src/app.jsx', 'app.tsx', 'app.jsx'
    ];

    var appComponent = null;
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
            }
          }
        } catch (e) {
          console.error("Errore durante l'inizializzazione di '" + match + "':", e);
        }
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
                    window.React.createElement('div', {
                      style: { fontSize: '13px', color: '#cbd5e1', marginBottom: '12px' }
                    }, 'Si è verificato un errore durante il rendering:'),
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
                    }, this.state.error ? (this.state.error.message || String(this.state.error)) : 'Errore sconosciuto'),
                    window.React.createElement('div', {
                      style: { fontSize: '12px', color: '#94a3b8', marginTop: '10px' }
                    }, 'Suggerimento: controlla che tutti i componenti siano esportati correttamente (es. export default function Card() { ... }) e richiamati come <Card /> senza l\\'estensione .tsx.')
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

    // 11. Combine all compiled modules
    const modulesBundle = `
<script id="__playground_modules__">
${moduleDefs.join('\n')}
</script>
`;

    // 12. Inject into HTML document
    if (rawHtml.includes('<head>')) {
      rawHtml = rawHtml.replace('<head>', () => `<head>\n${consoleScript}\n${cdnScripts}`);
    } else {
      rawHtml = `<!DOCTYPE html><html><head>${consoleScript}${cdnScripts}</head><body>${rawHtml}</body></html>`;
    }

    const scriptsBlock = `\n${modulesBundle}\n${runtimeScript}\n`;
    if (rawHtml.includes('</body>')) {
      rawHtml = rawHtml.replace('</body>', () => `${scriptsBlock}</body>`);
    } else {
      rawHtml += scriptsBlock;
    }

    // 13. If syntax/transpile errors occurred, show error banner
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
