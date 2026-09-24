import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../services/api';
import { MetricCard } from '../components/ui/MetricCard';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, cn } from '../lib/utils';

const STATUS = { entregue: 'teal', enviado: 'sky', processando: 'amber', pendente: 'slate', cancelado: 'red' };

export function Vendas() {
  const [kpis, setKpis] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [detalhe, setDetalhe] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setError(null);
    let falhou = false;
    // KPIs do dashboard — falha da API vira erro explícito, sem fallback silencioso.
    try {
      const dashboard = await api.getDashboardAnalytics();
      const kpis = dashboard.kpis || [];
      setKpis(kpis);
    } catch (e) {
      console.error('Erro ao carregar vendas:', e);
      falhou = true;
      setKpis([]);
    }
    // Pedidos reais — falha da API vira erro explícito, sem fallback silencioso.
    try {
      const pedidosData = await api.getPedidos();
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
    } catch (e) {
      console.error('Erro ao carregar vendas:', e);
      falhou = true;
      setPedidos([]);
    }
    if (falhou) setError('Erro ao carregar vendas. Tente novamente.');
  };

  const faturamento = kpis.reduce((a, k) => a + (Number(k.valor) || 0), 0);

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
            Vendas
          </h1>
          <p className="text-sm text-slate-500">Acompanhe faturamento e desempenho por canal</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {kpis.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {kpis.map(k => (
                <MetricCard
                  key={k.id}
                  label={k.label}
                  value={k.value}
                  delta={k.delta}
                  format={k.format}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem vendas no período"
              description="Conecte um marketplace ou aguarde novos pedidos sincronizados."
            />
          )}
        </div>

        <div>{kpis.length > 0 ? (
          <p className="text-sm text-slate-500">
            <strong>Faturamento:</strong> {formatCurrency(faturamento)}
          </p>
        ) : (
          <EmptyState
            title="Sem vendas no período"
            description="Conecte um marketplace ou aguarde novos pedidos sincronizados."
          />
        )}</div>
      </section>

      <Card>
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase">Últimos Pedidos</h3>
          {pedidos.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Pedido</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{p.cliente}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      {formatCurrency(p.total ?? 0)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={STATUS[p.status] ?? 'slate'}>
                        {STATUS[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="px-5">
                      <span className="text-xs text-slate-500">
                        {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-slate-500">
              Nenhum pedido sincronizado
              {''}
              <br />
              Conecte um marketplace ou aguarde novos pedidos sincronizados.
            </p>
          )}
        </div>
      </Card>

      {/* Painel de Detalhe */}
      {detalhe && (
        <div className="fixed inset-0 z-50 rounded-lg bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Detalhe do pedido">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setDetalhe(null)}
            className="absolute top-4 right-4 rounded-lg bg-slate-800/80 p-2 hover:bg-slate-700"
          >
            <X className="h-5 w-5 text-slate-300" />
          </button>
          <div className="fixed inset-8 flex max-w-2xl mx-auto flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-800 dark:text-slate-100">{detalhe?.id}</h2>
              <button
                type="button"
                aria-label="Fechar detalhe"
                onClick={() => setDetalhe(null)}
                className="rounded-lg bg-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-500 text-sm">Cliente</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">{detalhe?.cliente || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-sm">Marketplace</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {detalhe?.marketplace || '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-slate-500 text-sm">Data</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {detalhe?.data ? new Date(detalhe.data).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>

            <div>
              <p className="text-slate-500 text-sm">Status</p>
              <p>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    `bg-${STATUS[detalhe?.status]?.toString() || 'slate'}-100 text-${STATUS[detalhe?.status]?.toString() || 'slate'}-700 dark:bg-${STATUS[detalhe?.status]?.toString() || 'slate'}-500/15 dark:text-${STATUS[detalhe?.status]?.toString() || 'slate'}-300`
                  )}
                >
                  {detalhe?.status || '—'}
                </span>
              </p>
            </div>

            <div>
              <p className="text-slate-500 text-sm">Total</p>
              <p className="font-medium font-mono text-slate-800 dark:text-slate-100">
                {formatCurrency(detalhe?.total)}
              </p>
            </div>

            <div>
              <p className="text-slate-500 text-sm">Itens</p>
              <p className="text-slate-600 dark:text-slate-400">
                {detalhe?.itens || 0} itens
              </p>
            </div>

            <div>
              <p className="text-slate-500 text-sm">Canais</p>
              <p className="text-slate-600 dark:text-slate-400">
                {detalhe?.canais ? detalhe.canais.join(', ') : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}