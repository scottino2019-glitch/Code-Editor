import React, { useState, useEffect, useRef } from 'react';
import { ClipboardPaste, X, Check, FilePlus, RefreshCw, Sparkles } from 'lucide-react';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onPasteReplace: (code: string) => void;
  onPasteInsert: (code: string) => void;
  onCreateNewWithCode: (suggestedName: string, code: string) => void;
}

export const PasteModal: React.FC<PasteModalProps> = ({
  isOpen,
  onClose,
  fileName,
  onPasteReplace,
  onPasteInsert,
  onCreateNewWithCode,
}) => {
  const [text, setText] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setClipboardError(null);
      setNewFileName('');
      // Auto focus textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);

      // Attempt auto-read from clipboard if permitted
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
          .then((clipText) => {
            if (clipText && clipText.trim().length > 0) {
              setText(clipText);
            }
          })
          .catch(() => {
            // Ignored - user can paste manually into textarea with Ctrl+V
          });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const linesCount = text.split('\n').length;
  const charsCount = text.length;

  const handleManualClipboardRead = async () => {
    try {
      setClipboardError(null);
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText) {
          setText(clipText);
          return;
        }
      }
      setClipboardError('Il browser richiede di incollare premendo Ctrl+V (o Cmd+V) direttamente dentro la casella di testo sottostante.');
    } catch (err: any) {
      setClipboardError('Accesso agli appunti limitato dal browser in modalità iframe. Incolla semplicemente con Ctrl+V (o Cmd+V) dentro la casella sottostante.');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-[#0B1120] border border-slate-700 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0F172A]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Incolla Codice</span>
                <span className="text-[11px] font-mono text-slate-400 font-normal bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {fileName || 'Editor'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Incolla il testo nella casella sottostante (funziona sempre, anche dentro l'iframe)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 flex flex-col space-y-3 overflow-hidden">
          {clipboardError && (
            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
              {clipboardError}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Incolla qui (usa <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">Ctrl+V</kbd> o <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded border border-slate-700 font-mono text-[10px]">Cmd+V</kbd>):</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleManualClipboardRead}
                className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Leggi da appunti</span>
              </button>
              {text && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                >
                  Svuota
                </button>
              )}
            </div>
          </div>

          {/* Large Textarea */}
          <div className="flex-1 min-h-[220px] relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Incolla qui il codice sorgente (HTML, CSS, TSX, JS, JSON)..."
              className="w-full h-full min-h-[220px] p-3.5 bg-[#070D18] border border-slate-800 focus:border-sky-500 rounded-lg text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed selection:bg-sky-500/30"
              spellCheck={false}
            />
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded border border-slate-800">
            <div>
              <span>Righe: <strong className="text-slate-200">{linesCount}</strong></span>
              <span className="mx-2">•</span>
              <span>Caratteri: <strong className="text-slate-200">{charsCount}</strong></span>
            </div>
            {text.length > 0 && (
              <span className="text-emerald-400 font-medium">✓ Pronto per l'inserimento</span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0F172A] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition"
          >
            Annulla
          </button>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 justify-end">
            <button
              disabled={!text.trim()}
              onClick={() => {
                onPasteInsert(text);
                onClose();
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700"
              title="Inserisce il testo nel punto in cui si trova il cursore"
            >
              Inserisci al cursore
            </button>

            <button
              disabled={!text.trim()}
              onClick={() => {
                onPasteReplace(text);
                onClose();
              }}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-lg text-xs transition shadow-sm flex items-center gap-1.5"
              title="Sostituisce l'intero contenuto del file corrente"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Sostituisci intero file</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
