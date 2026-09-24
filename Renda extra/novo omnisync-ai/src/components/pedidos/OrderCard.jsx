import { cn } from '../../lib/utils';

const STATUS_COLORS = {
  pendente: 'amber',
  processando: 'amber',
  enviado: 'sky',
  entregue: 'teal',
  cancelado: 'red',
};

export function OrderCard({ pedido, onOpenDetail }) {
  const status = pedido.status || 'pendente';
  const cor = STATUS_COLORS[status] ?? 'slate';

  return (
    <div
      className={cn(
        'border border-slate-200 rounded-lg bg-white shadow-sm transition-colors duration-200 hover:shadow-md',
      )}
      onClick={() => onOpenDetail(pedido)}
      role="button"
      aria-label="Abrir detalhes do pedido ${pedido.id}"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3v2h2l10 6v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2l10-6v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6L21 6V3zm-2 4c5 0 6 1 6 2H4c0 1-1 2-1 2s-1 1-1-2c0-1 1-2 1-2zM4 9c-1.5 0-2 1.5-2 3s1 3 2 3t2-3c1 0 2-1.5 2-3S5.5 9 4 9z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 line-clamp-1">
              {pedido.id}
            </p>
            <p className="text-xs text-slate-500 line-clamp-1">
              {pedido.cliente || '—'}
            </p>
          </div>
          <span
            className={cn(
              'ml-2 rounded-full px-2 py-0.5 text-xs font-medium',
              `bg-${cor}-100 text-${cor}-700`
            )}
          >
            {status}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-400">Qtde</span>
            <p className="font-medium">{pedido.itens ?? 0}</p>
          </div>
          <div>
            <span className="text-slate-400">Valor</span>
            <p className="font-medium font-mono">
              R$ {Number(pedido.total ?? 0).toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}