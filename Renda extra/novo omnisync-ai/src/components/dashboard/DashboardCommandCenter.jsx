import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Boxes,
  PackageSearch,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { MetricCard } from '../ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { AreaChart } from '../charts/AreaChart';
import { BarChart } from '../charts/BarChart';
import { AlertList } from './AlertList';
import { ProximosPassos } from './ProximosPassos';

const ATALHOS = [
  { nome: 'Radar de Mercado', rota: '/radar-mercado', Icone: PackageSearch, desc: 'Oportunidades de produtos' },
  { nome: 'Central de IA', rota: '/central-ia', Icone: Bot, desc: 'Agentes + Diretor IA' },
  { nome: 'Financeiro', rota: '/financeiro', Icone: Wallet, desc: 'Fluxo de caixa & margem' },
  { nome: 'Estoque', rota: '/estoque', Icone: Boxes, desc: 'Reposição e ruptura' },
];

const ICONE_KPI = {
  pedidos: ShoppingCart,
  ticketMedio: Ticket,
  lucroEstimado: TrendingUp,
  itensEstoque: Boxes,
  capitalParado: Wallet,
};

function Atalhos({ loading }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {loading
        ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        : ATALHOS.map(a => (
            <Link
              key={a.rota}
              to={a.rota}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/40"
            >
              <a.Icone className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <span className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{a.nome}</span>
              <span className="text-xs text-slate-400">{a.desc}</span>
            </Link>
          ))}
    </div>
  );
}

export function DashboardCommandCenter({ period, customRange }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, peds, prods] = await Promise.all([
          api.getDashboardResumo().catch(() => null),
          api.getPedidos().catch(() => []),
          api.getProdutos({ limit: 100 }).catch(() => ({ produtos: [] })),
        ]);
        setDashboardData(dash);
        setPedidos(Array.isArray(peds) ? peds : []);
        setProdutos(Array.isArray(prods) ? prods : (prods?.produtos || []));
      } catch (e) {
        console.error('Erro ao carregar dashboard:', e);
        setError(e.message);
      } finally {
        setTimeout(() => setLoading(false), 600);
      }
    };
    loadData();
  }, []);

  const kpis = dashboardData
    ? [
        { id: 'faturamento', label: 'Faturamento', value: dashboardData.faturamento, format: 'currency', delta: 0 },
        { id: 'pedidos', label: 'Pedidos', value: dashboardData.pedidos, format: 'number' },
        { id: 'produtos', label: 'Produtos', value: dashboardData.produtos, format: 'number' },
        { id: 'clientes', label: 'Clientes', value: dashboardData.clientes, format: 'number' },
      ]
    : [
        { id: 'faturamento', label: 'Faturamento', value: 0, format: 'currency' },
        { id: 'pedidos', label: 'Pedidos', value: 0, format: 'number' },
        { id: 'produtos', label: 'Produtos', value: 0, format: 'number' },
        { id: 'clientes', label: 'Clientes', value: 0, format: 'number' },
      ];

  const receita = kpis[0];

  const serie = pedidos.slice(0, 30).map(p => ({
    data: p.data,
    valor: Number(p.total) || 0,
  }));

  const canais = [
    { canal: 'E-commerce', valor: pedidos.filter(p => p.origem === 'ecommerce').length },
    { canal: 'Marketplace', valor: pedidos.filter(p => p.origem === 'marketplace').length },
    { canal: 'Manual', valor: pedidos.filter(p => !p.origem || p.origem === 'manual').length },
  ].filter(c => c.valor > 0);

  const alertasPri = [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:border-slate-800 dark:from-primary-500/10 dark:to-primary-500/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              Faturamento — {period || 'Mês atual'}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-12 w-64 rounded-lg" />
            ) : (
              <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {receita.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </p>
            )}
            <p className="mt-1 text-sm text-primary-700/80 dark:text-primary-300/80">
              {receita.delta >= 0 ? '▲' : '▼'} {Math.abs(receita.delta)}% vs mês anterior
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white">
              <TrendingUp className="h-6 w-6" />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : kpis.slice(1).map(kpi => (
              <MetricCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                format={kpi.format}
                Icone={ICONE_KPI[kpi.id]}
              />
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento — {period || 'Mês atual'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] rounded-lg" />
            ) : (
              <AreaChart data={serie} theme={theme} label="Faturamento" />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertList alerts={alertasPri} loading={loading} onOpen={() => {}} />
            </CardContent>
          </Card>

          <ProximosPassos loading={loading} />

          <Card>
            <CardHeader>
              <CardTitle>Atalhos</CardTitle>
            </CardHeader>
            <CardContent>
              <Atalhos loading={loading} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por canal</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] rounded-lg" />
            ) : canais.length > 0 ? (
              <BarChart data={canais} theme={theme} label="Vendas" />
            ) : (
              <div className="text-center py-8 text-slate-500">
                Conecte pedidos para ver vendas por canal
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por armazém</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] rounded-lg" />
            ) : (
              <div className="text-center py-8 text-slate-500">
                Dados de armazém não disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-primary-500/30 bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:border-primary-500/30 dark:from-primary-500/10 dark:to-primary-500/10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Bot className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Insight IA — OmniAdvisor</h2>
          <Link
            to="/central-ia"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Abrir Central de IA <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Conecte sua conta do Mercado Livre e aguarde a sincronização para gerar insights personalizados baseados em dados reais.
        </p>
      </div>
    </div>
  );
}