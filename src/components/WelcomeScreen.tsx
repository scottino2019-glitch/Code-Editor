import React from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  FolderUp, 
  FileUp, 
  Plus, 
  Keyboard, 
  Cpu, 
  Zap, 
  CheckCircle2,
  Settings,
  ClipboardPaste
} from 'lucide-react';

interface WelcomeScreenProps {
  onUploadFolder: () => void;
  onUploadFiles: () => void;
  onCreateNewFile: () => void;
  onPasteCode?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onUploadFolder,
  onUploadFiles,
  onCreateNewFile,
  onPasteCode,
}) => {
  return (
    <div className="flex-1 bg-[#0F172A] flex flex-col justify-center items-center p-8 text-center text-slate-300 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full flex flex-col items-center gap-6"
      >
        {/* Glow Logo Accent */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#38BDF8]/10 blur-xl rounded-full scale-150"></div>
          <div className="relative bg-gradient-to-tr from-[#38BDF8] to-indigo-600 p-4 rounded-2xl text-white shadow-xl shadow-sky-500/10">
            <Cpu className="w-10 h-10" />
          </div>
        </div>

        {/* Hero titles */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Benvenuto in <span className="bg-gradient-to-r from-[#38BDF8] to-indigo-400 bg-clip-text text-transparent">Codice Playground</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-lg mx-auto">
            Un editor di codice leggero e super veloce progettato interamente sul tuo browser. Scrivi e visualizza la sintassi evidenziata in tempo reale.
          </p>
        </div>

        {/* Core Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mt-4">
          <div 
            onClick={onCreateNewFile}
            className="group flex flex-col items-center p-5 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-slate-800 hover:border-[#38BDF8]/50 rounded-xl cursor-pointer transition-all duration-300"
          >
            <div className="p-3 bg-[#38BDF8]/10 text-[#38BDF8] group-hover:bg-[#38BDF8]/20 group-hover:text-sky-300 rounded-lg transition-colors mb-3">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Nuovo File</h3>
            <p className="text-xs text-slate-400">Crea un file HTML, CSS, TSX o JS</p>
          </div>

          <div 
            onClick={onPasteCode}
            className="group flex flex-col items-center p-5 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl cursor-pointer transition-all duration-300"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 rounded-lg transition-colors mb-3">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Incolla Codice</h3>
            <p className="text-xs text-slate-400">Incolla subito codice copiato</p>
          </div>

          <div 
            onClick={onUploadFolder}
            className="group flex flex-col items-center p-5 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all duration-300"
          >
            <div className="p-3 bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300 rounded-lg transition-colors mb-3">
              <FolderUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Apri Cartella</h3>
            <p className="text-xs text-slate-400">Carica una cartella dal PC</p>
          </div>

          <div 
            onClick={onUploadFiles}
            className="group flex flex-col items-center p-5 bg-[#1E293B] hover:bg-[#1E293B]/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all duration-300"
          >
            <div className="p-3 bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 rounded-lg transition-colors mb-3">
              <FileUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Apri File</h3>
            <p className="text-xs text-slate-400">Seleziona singoli file</p>
          </div>
        </div>

        {/* Feature List Cards */}
        <div className="w-full bg-[#0B1120]/60 border border-slate-800 rounded-xl p-5 text-left flex flex-col gap-4">
          <h4 className="text-xs font-semibold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#38BDF8]" />
            Cosa puoi fare qui
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Evidenziazione della sintassi ad alta definizione (Monaco Engine).</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Carica un'intera struttura di progetto senza caricare nulla sul server.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Modifica i file e scarica l'intero spazio di lavoro con un clic in formato ZIP.</span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Ricerca e navigazione immediata tra file e directory.</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcut Info */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
          <Keyboard className="w-4 h-4" />
          <span>Scorciatoie utili:</span>
          <span className="bg-[#0B1120] px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">Ctrl + S</span>
          <span>per salvare il file corrente sul PC</span>
        </div>
      </motion.div>
    </div>
  );
};
