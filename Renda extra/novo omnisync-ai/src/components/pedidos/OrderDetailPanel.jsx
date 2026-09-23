import { useState } from 'react';
import { cn } from '../../lib/utils';
import { X, CheckCircle, Edit } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

export function OrderDetailPanel({ pedido, onClose, onStatusChange }) {
  const [ocEstado, setOcEstado] = useState('idle');
  const [ocInfo, setOcInfo] = useState(null);
  const [ocFornecedor, setOcFornecedor] = useState('');

  // Cria rascunho de ordem de compra (aguardando_aprovacao).
  // Nada é enviado ao fornecedor e nenhum pagamento ocorre aqui.
  const criarOrdemCompra = async () => {
    if (!pedido || ocEstado === 'loading' || !ocFornecedor.trim()) return;
    setOcEstado('loading');
    setOcInfo(null);
    try {
      const r = await api.criarOrdemCompra({
        fornecedor: ocFornecedor.trim(),
        total: Number(pedido.total) || 0,
        pedidoId: String(pedido.id),
        idExterno: `pedido-${pedido.id}`,
      });
      setOcInfo(r?.ordem || null);
      setOcEstado('success');
    } catch (e) {
      setOcInfo({ erro: e.message });
      setOcEstado('error');
    }
  };
  const status = pedido.status || 'pendente';
  const statusCores = {
    pendente: 'amber',
    processando: 'amber',
    enviado: 'sky',
    entregue: 'teal',
    cancelado: 'red',
  };
  const corStatus = statusCores[status] ?? 'slate';

  const formatarMoeda = valor =>
    valor != null ? `R$ ${Number(valor).toFixed(2).replace('.', ',')}` : '—';

  const resumoFinanceiro = () => {
    const total = Number(pedido.total ?? 0);
    const custos = Number(pedido.custos ?? 0);
    const lucro = total - custos;
    const percentual = total > 0 ? ((lucro / total) * 100).toFixed(1) : '0.0';
    return {
      total: formatarMoeda(total),
      custos: formatarMoeda(custos),
      lucro: formatarMoeda(lucro),
      percentual: `${percentual}%`,
    };
  };

  if (!pedido) {
    return (
      <div className="p-8 text-center text-slate-500">
        <svg
          className="mx-auto mb-4 h-12 w-12 text-slate-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
        <p>Dados do pedido não disponíveis</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">
          Pedido #{pedido.id}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" /> Fechar
        </Button>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-sm">Número do Pedido</p>
            <p className="font-medium font-mono text-slate-800">{pedido.id}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Data</p>
            <p className="font-medium text-slate-800">
              {pedido.data ? new Date(pedido.data).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-sm">Cliente</p>
            <p className="font-medium text-slate-800">{pedido.cliente || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Marketplace</p>
            <p className="font-medium text-slate-800">
              {pedido.marketplace || '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-sm">Status</p>
            <p>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  `bg-${corStatus}-100 text-${corStatus}-700`
                )}
              >
                {status}
              </span>
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-sm">Quantidade de Itens</p>
            <p className="font-medium text-slate-800">
              {pedido.itens ?? 0}
            </p>
          </div>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Total</p>
          <p className="font-medium font-mono text-slate-800">
            {formatarMoeda(pedido.total)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Custos</p>
          <p className="text-slate-600">
            {formatarMoeda(pedido.custos)}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Lucro Percentual</p>
          <p>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                'bg-emerald-100 text-emerald-700'
              )}
            >
              {resumoFinanceiro().percentual}
            </span>
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Lucro em Reais</p>
          <p className="font-medium font-mono text-slate-800">
            {resumoFinanceiro().lucro}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Itens do Pedido</p>
          <p className="text-slate-600 h-40 overflow-auto">
            {(
              pedido.produtos ||
              pedido.itens ||
              []
            ).map((item, i) => (
              <div key={i} className="flex items-start gap-3 pb-2 border-b border-slate-200 last:mb-0 last:border-0">
                <div className="w-10 h-10 rounded bg-slate-100 flex-shrink-0">
                  <img
                    src={item.foto || '/placeholder-product.svg'}
                    alt={item.nome}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 line-clamp-1">
                    {item.nome || '—'}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">
                    SKU: {item.sku || '—'} | EAN: {item.ean || '—'} | NCM: {item.ncm || '—'}
                  </p>
                </div>
                <div className="w-16 text-right">
                  <p className="font-medium text-slate-700">
                    R$ {Number(item.vendaUnitaria || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-slate-500">
                    Custo: R$ {Number(item.custoUnitario || 0).toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div className="w-12">
                  <p className="font-medium text-slate-700">
                    {item.quantidade}
                  </p>
                  <p className="text-xs text-slate-500">
                    Estoque: {item.estoque || 0}
                  </p>
                </div>
              </div>
            ))}
            {!(pedido.produtos || []).length && (
              <p className="text-slate-500 text-center py-4">
                Nenhum item encontrado
              </p>
            )}
          </p>
        </div>

        <div>
          <p className="text-slate-500 text-sm">Localização</p>
          <p className="text-slate-600">
            {pedido.localizacao || '—'}
          </p>
        </div>

        {/* Ordem de compra (rascunho + aprovação manual) */}
        <div>
          <p className="text-slate-500 text-sm">Ordem de compra</p>
          {ocEstado === 'success' && ocInfo && !ocInfo.erro ? (
            <p className="mt-1 text-sm text-slate-700">
              Rascunho {ocInfo.id} — aguardando aprovação. Nada foi enviado ao fornecedor.
            </p>
          ) : (
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={ocFornecedor}
                onChange={e => setOcFornecedor(e.target.value)}
                placeholder="Fornecedor"
                aria-label="Fornecedor para a ordem de compra"
                className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary-500"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={criarOrdemCompra}
                disabled={ocEstado === 'loading' || !ocFornecedor.trim()}
              >
                {ocEstado === 'loading' ? 'Criando...' : 'Criar rascunho'}
              </Button>
            </div>
          )}
          {ocEstado === 'error' && (
            <p role="alert" className="mt-1 text-xs text-red-600">{ocInfo?.erro || 'Erro ao criar rascunho.'}</p>
          )}
        </div>

        {/* Botão Empacotar */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={() => onStatusChange(pedido.id, 'enviado')}
            className={cn(
              'w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed',
              pedido.status === 'enviado' ? 'opacity-50 cursor-not-allowed' : ''
            )}
            disabled={pedido.status === 'enviado'}
          >
            {pedido.status === 'enviado' ? 'Pedido já enviado' : 'Empacotar'}
          </button>
        </div>
      </div>
    </div>
  );
}