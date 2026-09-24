import { X } from 'lucide-react';

// ============================================
// SidePanel — painel lateral de detalhes (padrão SNV).
// Abre à direita sobre um overlay; fecha no X, no overlay
// ou com Escape. Não renderiza nada quando fechado.
// ============================================
export function SidePanel({ open, onClose, title, children, label = 'Detalhes' }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onKeyDown={e => { if (e.key === 'Escape') onClose?.(); }}
    >
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhe"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-sm">{children}</div>
      </aside>
    </div>
  );
}
