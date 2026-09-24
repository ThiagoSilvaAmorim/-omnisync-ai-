import { Component } from 'react';

// ============================================
// ErrorBoundary — captura erros de renderização
// e exibe uma tela de erro amigável em vez de
// deixar a página em branco.
// ============================================
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Erro capturado pelo ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center dark:bg-slate-950">
          <p className="text-5xl font-bold text-slate-300 dark:text-slate-700">Ops!</p>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Algo deu errado</h1>
          <p className="max-w-md text-sm text-slate-500">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          {this.state.error && (
            <pre className="max-w-full overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-red-600 dark:bg-slate-900 dark:text-red-400">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 active:scale-95"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
