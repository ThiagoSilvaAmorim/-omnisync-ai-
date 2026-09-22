import { useState, useEffect } from 'react';
import { X, Eye, Edit, Trash, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { podeAcessar } from '../lib/permissoes';
import { useToast } from '../hooks/useToast';
import { OrderCard } from '../components/pedidos/OrderCard';
import { OrderDetailPanel } from '../components/pedidos/OrderDetailPanel';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatNumber } from '../lib/utils';

const STATUS_LABELS = {
  pendente: 'Pendente',
  processando: 'Processando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  pendente: 'slate',
  processando: 'amber',
  enviado: 'sky',
  entregue: 'teal',
  cancelado: 'red',
};

export function Pedidos() {
  const { user } = useAuth();
  const toast = useToast();
  const [aba, setAba] = useState('ativos');
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  useEffect(() => {
    carregarPedidos();
  }, []);

  const carregarPedidos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getPedidos(
        statusFilter !== 'Todos' ? `status=${statusFilter}` : undefined
      );
      const data = response || [];
      setPedidos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar pedidos:', e);
      setError('Erro ao carregar pedidos. Tente novamente.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (pedidoId, novoStatus) => {
    try {
      await api.atualizarStatusPedido(pedidoId, novoStatus);
      toast('Status atualizado com sucesso');
      carregarPedidos();
      if (pedidoSelecionado?.id === pedidoId) {
        setPedidoSelecionado(null);
      }
    } catch (e) {
      console.error('Erro ao atualizar status:', e);
      toast('Erro ao atualizar status do pedido');
    }
  };

  const filteredPedidos = pedidos.filter(p => {
    if (statusFilter !== 'Todos' && p.status !== statusFilter) return false;
    if (search && !`${p.id} ${p.cliente}`.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const totalItems = filteredPedidos.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pagedPedidos = filteredPedidos.slice(start, end);

  const resumo = () => {
    const total = pedidos.length;
    const pendentes = pedidos.filter(p => p.status === 'pendente').length;
    const percentualAtendido =
      total > 0
        ? Math.round(
            ((pedidos.filter(p => ['entregue', 'enviado'].includes(p.status)).length /
              total) *
              100)
          )
        : 0;
    return {
      totalPedidos: total,
      percentualAtendido,
      pedidosPendentes: pendentes,
      baseCalculo: total,
    };
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="space-y-4">
          <Loader2 className="h-8 w-8 text-slate-400" />
          <p className="text-slate-500">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[600px] p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <svg
          className="mx-auto mb-4 h-12 w-12 text-red-400 dark:text-red-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="15" y2="15" />
          <line x1="9" y1="15" x2="15" y2="9" />
        </svg>
        <h3 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Erro</h3>
        <p className="text-slate-500 dark:text-slate-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            Pedidos
          </h1>
          <p className="text-sm text-slate-500">Gerencie e acompanhe todos os pedidos</p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPage(1)} disabled={page === 1}>
            Anterior
          </Button>
          <Button variant="primary" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
            Próximo
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        {/* Resumo Superior */}
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Total de Pedidos</p>
                <p className="font-medium font-mono text-slate-800 dark:text-slate-100">
                  {resumo().totalPedidos}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Percentual Atendido</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {resumo().percentualAtendido}%
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Pedidos Pendentes</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {resumo().pedidosPendentes}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500">Base de Cálculo</p>
                <p className="font-medium text-slate-600 dark:text-slate-300">
                  {resumo().baseCalculo}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Lista de Pedidos com OrderCards */}
        <div>{pagedPedidos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {pagedPedidos.map(p => (
              <OrderCard
                key={p.id}
                pedido={p}
                onOpenDetail={() => setPedidoSelecionado(p)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhum pedido encontrado"
            description="Conecte um marketplace ou aguarde novos pedidos sincronizados."
          />
        )}</div>

        {/* Tabela alternativa */}
        {pagedPedidos.length > 0 && (
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-3 py-3 font-medium">Marketplace</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 text-right font-medium">Valor</th>
                  <th className="px-3 py-3 text-right font-medium">Itens</th>
                  <th className="px-3 py-3 font-medium">Data</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pagedPedidos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3">
                      {p.marketplace || '—'}
                    </td>
                    <td className="px-3">
                      <div className="line-clamp-1">{p.cliente || '—'}</div>
                    </td>
                    <td className="px-3 text-right">
                      <span>
                        {formatCurrency(p.total ?? 0)}
                      </span>
                    </td>
                    <td className="px-3 text-right">
                      <span>{p.itens ?? 0}</span>
                    </td>
                    <td className="px-3">
                      <span className="text-xs text-slate-500">
                        {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                    <td className="px-3">
                      <Badge variant={STATUS_COLORS[p.status] ?? 'slate'}>
                        {STATUS_LABELS[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPedidoSelecionado(p)}
                        className="text-sm px-2 py-1"
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Paginação simples */}
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPage(1)} disabled={page === 1}>
              Anterior
            </Button>
            <Button variant="primary" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
              Próximo
            </Button>
          </div>
        )}
      </section>

      {/* Painel de Detalhes */}
      {pedidoSelecionado && (
        <OrderDetailPanel
          pedido={pedidoSelecionado}
          onClose={() => setPedidoSelecionado(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}