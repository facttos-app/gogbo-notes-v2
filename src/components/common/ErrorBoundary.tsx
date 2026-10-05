import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erreur non interceptée dans GOGBO NOTES V2:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('gogbo_v2_current_user_id');
      localStorage.removeItem('gogbo_v2_selected_annee_id');
    } catch {
      // Ignored
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Une anomalie d'affichage est survenue
            </h2>
            <p className="text-sm text-slate-300 mb-4">
              Une erreur est survenue lors du chargement des données. Vos données scolaires et comptes restent entièrement sécurisés.
            </p>
            {this.state.error?.message && (
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-lg p-3 mb-6 font-mono text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-900/40 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réessayer / Recharger l'application</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetSession}
                className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                <span>Déconnecter la session et réinitialiser l'interface</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
