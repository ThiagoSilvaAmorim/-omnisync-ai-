import { cn } from '../../lib/utils';

// ============================================
// DashboardSwitcher — seletor de painéis (abas).
// Alterna entre os sub-dashboards via `onChange`.
// ============================================
export function DashboardSwitcher({ paineis, ativo, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900 print:hidden">
      {paineis.map(painel => {
        const isAtivo = painel.id === ativo;
        return (
          <button
            key={painel.id}
            type="button"
            onClick={() => onChange(painel.id)}
            className={cn(
              'flex flex-col items-start rounded-lg px-4 py-2 text-left transition-all duration-200',
              isAtivo
                ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-800 dark:text-primary-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <span className="text-sm font-semibold">{painel.nome}</span>
            <span
              className={cn(
                'text-xs',
                isAtivo
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {painel.descricao}
            </span>
          </button>
        );
      })}
    </div>
  );
}
