import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1120] text-slate-200 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Si è verificato un errore imprevisto</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            L'applicazione ha riscontrato un problema temporaneo durante l'elaborazione del codice. Puoi ripristinare la sessione senza perdere i tuoi dati salvati.
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-rose-300 max-w-lg overflow-x-auto text-left mb-6 w-full">
            {this.state.error?.toString()}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-[#38BDF8] text-[#0F172A] font-bold rounded-lg hover:bg-sky-400 transition"
          >
            <RotateCw className="w-4 h-4" />
            <span>Ripristina Applicazione</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}



