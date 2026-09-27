import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

// ============================================
// ErrorState — estado de erro honesto com retry/link.
// ============================================
export function ErrorState({
  message = 'Ocorreu um erro inesperado.',
  onRetry,
  retryLabel = 'Tentar novamente',
  helpUrl,
  helpLabel = 'Ver documentação',
  icon: Icon = AlertTriangle,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <Icon className="h-6 w-6 text-red-500 dark:text-red-400" />
      </div>
      <p className="font-medium text-slate-700 dark:text-slate-200">{message}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium transition-colors hover:bg-primary-500"
          >
            <RefreshCw className="h-4 w-4" /> {retryLabel}
          </button>
        )}
        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <ExternalLink className="h-4 w-4" /> {helpLabel}
          </a>
        )}
      </div>
    </div>
  );
}