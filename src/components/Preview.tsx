import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  RotateCw, 
  ExternalLink, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Terminal, 
  Trash2, 
  X, 
  AlertCircle,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { VirtualFile } from '../types';
import { buildPreviewHtml, ConsoleMessage } from '../utils/previewBuilder';

interface PreviewProps {
  files: VirtualFile[];
  onClose?: () => void;
  isStandalone?: boolean;
}

export const Preview: React.FC<PreviewProps> = ({ files, onClose, isStandalone = false }) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [filterText, setFilterText] = useState<string>('');
  const [srcDoc, setSrcDoc] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounced build of live preview HTML doc to avoid crashes/lag on pasting large text
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const html = buildPreviewHtml(files);
        setSrcDoc(html);
      } catch (err: any) {
        setSrcDoc(`<!DOCTYPE html><html><body style="background:#0F172A;color:#f87171;padding:20px;font-family:sans-serif;"><h3>Errore Anteprima</h3><pre>${err?.message || err}</pre></body></html>`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [files, refreshKey]);

  // Handle messages from the iframe (captured console logs)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PREVIEW_CONSOLE_LOG') {
        const newLog: ConsoleMessage = {
          id: Math.random().toString(36).substr(2, 9),
          type: event.data.logType || 'log',
          args: event.data.args || [],
          timestamp: event.data.timestamp || new Date().toLocaleTimeString()
        };
        setConsoleLogs(prev => [...prev.slice(-150), newLog]); // Keep last 150 logs
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Clear logs when iframe manually reloaded
  const handleManualRefresh = () => {
    setConsoleLogs([]);
    setRefreshKey(prev => prev + 1);
  };

  // Open in new tab
  const handleOpenInNewTab = () => {
    const blob = new Blob([srcDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const errorCount = consoleLogs.filter(l => l.type === 'error').length;

  const filteredLogs = consoleLogs.filter(l => {
    if (!filterText) return true;
    return l.args.some(a => a.toLowerCase().includes(filterText.toLowerCase()));
  });

  return (
    <div className={`flex flex-col h-full bg-[#0F172A] border-l border-slate-800 text-slate-200 overflow-hidden ${
      isStandalone ? 'w-full' : 'w-full'
    }`}>
      
      {/* 1. Preview Top Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0B1120] border-b border-slate-800 text-xs select-none">
        
        {/* Left Status & Title */}
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            Anteprima Live
          </span>
        </div>

        {/* Center Device Responsive Switcher */}
        <div className="hidden sm:flex items-center space-x-1 bg-[#1E293B] p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`p-1 rounded transition-colors ${
              deviceMode === 'desktop' ? 'bg-[#38BDF8] text-[#0F172A] font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Vista Desktop (100%)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-1 rounded transition-colors ${
              deviceMode === 'tablet' ? 'bg-[#38BDF8] text-[#0F172A] font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Vista Tablet (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-1 rounded transition-colors ${
              deviceMode === 'mobile' ? 'bg-[#38BDF8] text-[#0F172A] font-semibold' : 'text-slate-400 hover:text-white'
            }`}
            title="Vista Smartphone (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          
          {/* Console Drawer Toggle */}
          <button
            onClick={() => setShowConsole(!showConsole)}
            className={`relative flex items-center space-x-1 px-2 py-1 rounded border transition ${
              showConsole 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' 
                : 'bg-[#1E293B] border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Mostra / Nascondi Console di Debug"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium hidden md:inline">Console</span>
            {errorCount > 0 && (
              <span className="ml-1 px-1 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-bold animate-pulse">
                {errorCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded transition"
            title="Aggiorna Anteprima"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Open in external window */}
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded transition"
            title="Apri in una nuova scheda del browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Close preview button if provided */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded transition"
              title="Chiudi Anteprima"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

        </div>

      </div>

      {/* 2. Main Iframe Display Container */}
      <div className="flex-1 bg-[#090D16] relative flex items-center justify-center p-2 overflow-hidden">
        
        <div 
          className={`h-full transition-all duration-300 flex flex-col ${
            deviceMode === 'desktop' 
              ? 'w-full' 
              : deviceMode === 'tablet' 
                ? 'w-[768px] max-w-full border-x-8 border-y-8 border-slate-800 rounded-2xl shadow-2xl bg-white' 
                : 'w-[375px] max-w-full border-x-8 border-y-8 border-slate-800 rounded-3xl shadow-2xl bg-white'
          }`}
        >
          <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            title="Live Preview Sandbox"
            className="w-full h-full bg-white border-0 rounded-sm"
            sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-popups"
          />
        </div>

      </div>

      {/* 3. Debug Console Drawer at Bottom */}
      {showConsole && (
        <div className="h-44 bg-[#0B1120] border-t border-slate-800 flex flex-col font-mono text-xs z-20">
          
          {/* Console Header Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F172A] border-b border-slate-800 text-slate-400">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-white text-[11px]">Output Console</span>
              <span className="text-[10px] text-slate-500">({filteredLogs.length} messaggi)</span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Filtra log..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-[#0B1120] border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-sky-500 w-28 md:w-40"
              />
              <button
                onClick={() => setConsoleLogs([])}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                title="Svuota Console"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowConsole(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Console Logs Stream */}
          <div className="flex-1 p-2 overflow-y-auto space-y-1 font-mono text-[11px]">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 italic py-3 text-center">
                Nessun output console registrato. I log prodotti con <code>console.log()</code> compariranno qui.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div 
                  key={log.id} 
                  className={`flex items-start space-x-2 px-2 py-1 rounded ${
                    log.type === 'error' 
                      ? 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500' 
                      : log.type === 'warn'
                        ? 'bg-amber-950/40 text-amber-300 border-l-2 border-amber-500'
                        : 'bg-slate-900/60 text-slate-300 border-l-2 border-slate-700'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 flex-shrink-0 pt-0.5">{log.timestamp}</span>
                  <div className="flex-1 whitespace-pre-wrap break-words">
                    {log.args.join(' ')}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
};
