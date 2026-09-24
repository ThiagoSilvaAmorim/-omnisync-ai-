import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

// ============================================
// AlertList — lista de alertas clicáveis.
// Cada bloco dispara o drawer de detalhes via
// `onOpen(alerts)` (passa a lista completa).
// ============================================
export function AlertList({ alerts, loading, onOpen }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map(alerta => (
        <button
          key={alerta.id}
          type="button"
          onClick={() => onOpen(alerts)}
          className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              alerta.tipo === 'critico'
                ? 'bg-red-100 text-red-500 dark:bg-red-500/15'
                : 'bg-amber-100 text-amber-500 dark:bg-amber-500/15'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{alerta.titulo}</p>
            <p className="truncate text-xs text-slate-500">{alerta.descricao}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </div>
  );
}
