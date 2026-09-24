import { SearchX } from 'lucide-react';

// ============================================
// EmptyState — exibido quando uma lista filtrada
// não retorna resultados.
// ============================================
export function EmptyState({ icon: Icon = SearchX, title = 'Nada por aqui', description = 'Ajuste os filtros e tente novamente.' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      <p className="max-w-xs text-sm text-slate-500">{description}</p>
    </div>
  );
}
