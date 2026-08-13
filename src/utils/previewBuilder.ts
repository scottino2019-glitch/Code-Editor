import * as Babel from '@babel/standalone';
import { VirtualFile } from '../types';

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'warn' | 'error' | 'info';
  args: string[];
  timestamp: string;
}

export function buildPreviewHtml(files: VirtualFile[]): string {
  // Find HTML file, default to index.html or first .html file
  let htmlFile = files.find(f => f.name.toLowerCase() === 'index.html');
  if (!htmlFile) {
    htmlFile = files.find(f => f.name.toLowerCase().endsWith('.html'));
  }

  // Get CSS files
  const cssFiles = files.filter(f => f.name.toLowerCase().endsWith('.css'));
  
  // Get JS / JSX / TS / TSX files
  const jsFiles = files.filter(f => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    return ext && ['js', 'jsx', 'ts', 'tsx'].includes(ext);
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

  // 1. Inject Console Interceptor & Error Catching Script into <head>
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
    sendLog('error', [event.message + ' (linea ' + event.lineno + ')']);
  });

  window.addEventListener('unhandledrejection', function(event) {
    sendLog('error', ['Promise rifiutata non gestita: ' + (event.reason ? (event.reason.message || event.reason) : 'Errore sconosciuto')]);
  });
})();
</script>
`;

  // Check if React is needed by JSX/TSX
  const hasReact = jsFiles.some(f => 
    f.content.includes('import React') || 
    f.content.includes('from "react"') || 
    f.content.includes("from 'react'") ||
    f.name.endsWith('.jsx') ||
    f.name.endsWith('.tsx')
  );

  const reactCdnScripts = hasReact ? `
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
<script src="https://cdn.tailwindcss.com"></script>
` : '';

  // 2. Prepare CSS styles injection
  let combinedStyles = '';
  cssFiles.forEach(file => {
    combinedStyles += `\n/* ${file.path} */\n${file.content}\n`;
  });
  const styleTag = `<style>\n${combinedStyles}\n</style>`;

  // Replace external stylesheet links or inject styleTag
  if (cssFiles.length > 0) {
    cssFiles.forEach(cssFile => {
      // Replace <link rel="stylesheet" href="filename.css">
      const regex = new RegExp(`<link[^>]*href=["'](?:\.\/)?${cssFile.name.replace('.', '\\.')}["'][^>]*>`, 'gi');
      rawHtml = rawHtml.replace(regex, `<style>/* ${cssFile.name} */\n${cssFile.content}</style>`);
    });
    // Inject remaining styles if not replaced
    if (!rawHtml.includes(combinedStyles.trim().substring(0, 30))) {
      if (rawHtml.includes('</head>')) {
        rawHtml = rawHtml.replace('</head>', `${styleTag}\n</head>`);
      } else {
        rawHtml = styleTag + '\n' + rawHtml;
      }
    }
  }

  // 3. Prepare JS / JSX / TSX script transpilation
  let combinedScriptContent = '';
  let transpileErrors: string[] = [];

  jsFiles.forEach(jsFile => {
    const isJsxOrTsx = jsFile.name.endsWith('.jsx') || jsFile.name.endsWith('.tsx') || jsFile.name.endsWith('.ts');
    
    // Replace script src tags in HTML if they match this filename
    const scriptSrcRegex = new RegExp(`<script[^>]*src=["'](?:\.\/)?${jsFile.name.replace('.', '\\.')}["'][^>]*>\\s*<\/script>`, 'gi');

    let codeToRun = jsFile.content;

    if (isJsxOrTsx) {
      try {
        // Strip out import statement lines for React when running UMD React in browser
        const sanitizedContent = codeToRun
          .replace(/import\s+React\s*,\s*\{([^}]+)\}\s+from\s+['"]react['"];?/g, 'const {$1} = React;')
          .replace(/import\s+React\s+from\s+['"]react['"];?/g, '')
          .replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g, 'const {$1} = React;')
          .replace(/import\s+ReactDOM\s+from\s+['"]react-dom['"];?/g, '')
          .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '// import removed for browser preview');

        const transformed = Babel.transform(sanitizedContent, {
          presets: ['env', 'react', 'typescript'],
          filename: jsFile.name
        });

        codeToRun = transformed.code || '';
      } catch (err: any) {
        transpileErrors.push(`[${jsFile.name}] Errore di Sintassi: ${err.message}`);
        return;
      }
    }

    const wrappedScript = `\n// --- File: ${jsFile.path} ---\ntry {\n${codeToRun}\n} catch(err) { console.error("Errore di esecuzione in ${jsFile.name}:", err.message); }\n`;

    if (rawHtml.match(scriptSrcRegex)) {
      rawHtml = rawHtml.replace(scriptSrcRegex, `<script>${wrappedScript}</script>`);
    } else {
      combinedScriptContent += wrappedScript;
    }
  });

  // Inject remaining transpiled script content before </body> or at end
  if (combinedScriptContent.trim()) {
    const scriptBlock = `<script>\n${combinedScriptContent}\n</script>`;
    if (rawHtml.includes('</body>')) {
      rawHtml = rawHtml.replace('</body>', `${scriptBlock}\n</body>`);
    } else {
      rawHtml = rawHtml + '\n' + scriptBlock;
    }
  }

  // Inject Console Script & React CDN dependencies into <head>
  if (rawHtml.includes('<head>')) {
    rawHtml = rawHtml.replace('<head>', `<head>\n${consoleScript}\n${reactCdnScripts}`);
  } else {
    rawHtml = `<!DOCTYPE html><html><head>${consoleScript}${reactCdnScripts}</head><body>${rawHtml}</body></html>`;
  }

  // If there were transpilation errors, inject error banner at top of body
  if (transpileErrors.length > 0) {
    const errorHtml = `
      <div style="background:#450a0a; color:#fca5a5; padding:12px; border-bottom:2px solid #ef4444; font-family:monospace; font-size:12px; z-index:9999; position:relative;">
        <strong>⚠️ Errore di Compilazione / Sintassi nel Codice:</strong>
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
}
