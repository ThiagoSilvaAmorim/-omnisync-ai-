import { AlertCircle, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// ============================================
// Toast — fila de notificações no canto superior
// direito. Alimentado pelo AppContext (useToast).
// Cada item é removido automaticamente após ~3s.
// Variantes: sucesso (verde ✓), erro (vermelho ✗)
// e aviso (âmbar !) — ícone e cor sempre coerentes.
// ============================================
const VARIANTES = {
  sucesso: { Icone: CheckCircle2, cor: 'text-teal-500' },
  erro: { Icone: AlertCircle, cor: 'text-red-500' },
  aviso: { Icone: AlertTriangle, cor: 'text-amber-500' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2 print:hidden">
      {toasts.map(toast => {
        const { Icone, cor } = VARIANTES[toast.tipo] || VARIANTES.sucesso;
        return (
          <div
            key={toast.id}
            role={toast.tipo === 'erro' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg animate-slide-in dark:border-slate-700 dark:bg-slate-800"
          >
            <Icone className={`mt-0.5 h-5 w-5 shrink-0 ${cor}`} />
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Fechar notificação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
