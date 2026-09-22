import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bot, Boxes, PackageSearch, Wallet } from 'lucide-react';
import { api } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { AreaChart } from '../charts/AreaChart';
import { DonutChart } from '../charts/DonutChart';
import { RadialGauge } from '../charts/RadialGauge';
import { StackBarChart } from '../charts/StackBarChart';

const ATALHOS = [
  { nome: 'Radar', rota: '/radar-mercado', Icone: PackageSearch },
  { nome: 'Central IA', rota: '/central-ia', Icone: Bot },
  { nome: 'Financeiro', rota: '/financeiro', Icone: Wallet },
  { nome: 'Estoque', rota: '/estoque', Icone: Boxes },
];

export function BentoHome({ period, customRange }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, peds] = await Promise.all([
          api.getDashboardResumo().catch(() => null),
          api.getPedidos().catch(() => []),
        ]);
        setDashboardData(dash);
        setPedidos(Array.isArray(peds) ? peds : []);
      } catch (e) {
        console.error('Erro ao carregar BentoHome:', e);
        setError(e.message);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    };
    loadData();
  }, []);

  const kpis = dashboardData
    ? [
        { id: 'faturamento', label: 'Faturamento', value: dashboardData.faturamento, format: 'currency' },
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

  const periodoLabel = period || 'Mês atual';

  const canais = [
    { canal: 'E-commerce', valor: pedidos.filter(p => p.origem === 'ecommerce').length },
    { canal: 'Marketplace', valor: pedidos.filter(p => p.origem === 'marketplace').length },
    { canal: 'Manual', valor: pedidos.filter(p => !p.origem || p.origem === 'manual').length },
  ].filter(c => c.valor > 0);

  const empilhado = pedidos.slice(0, 6).map(p => ({
    data: p.data,
    Pagamento: Math.round((Number(p.total) || 0) * 0.6),
    Pix: Math.round((Number(p.total) || 0) * 0.4),
  }));

  const donut = canais.map(c => ({ name: c.canal, valor: c.valor }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:from-primary-500/10 dark:to-primary-500/10 lg:col-span-2 lg:row-span-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-300">
            Faturamento — {periodoLabel}
          </p>
          {loading ? (
            <Skeleton className="mt-3 h-12 w-56 rounded-lg" />
          ) : (
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {receita.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </p>
          )}
          {!loading && (
            <p className="mt-1 text-sm text-primary-700/80 dark:text-primary-300/80">
              {Number.isFinite(Number(receita.delta)) ? (
                <>{receita.delta >= 0 ? '▲' : '▼'} {Math.abs(receita.delta)}% vs anterior</>
              ) : (
                'Sem histórico'
              )}
            </p>
          )}
        </div>
        {loading ? (
          <Skeleton className="mt-6 h-[180px] rounded-xl" />
        ) : (
          <div className="mt-6">
            <AreaChart data={serie} theme={theme} label="Faturamento" height={180} />
          </div>
        )}
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Vendas por canal</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[180px] rounded-xl" />
          ) : canais.length > 0 ? (
            <DonutChart data={donut} theme={theme} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              Conecte pedidos para ver vendas por canal
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:col-span-2">
        {[
          { valor: 0, label: 'Meta mensal' },
          { valor: 0, label: 'Entregas no prazo' },
        ].map((g, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center p-2">
              {loading ? (
                <Skeleton className="h-[160px] w-full rounded-xl" />
              ) : (
                <RadialGauge value={g.valor} label={g.label} theme={theme} size={170} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Formas de recebimento</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[220px] rounded-xl" />
          ) : (
            <StackBarChart
              data={empilhado}
              theme={theme}
              xKey="data"
              series={[
                { key: 'Pix', name: 'Pix', color: 'var(--primary-500)' },
                { key: 'Pagamento', name: 'Pagamento', color: '#0ea5e9' },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Acessos rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {ATALHOS.map(a => (
              <Link
                key={a.rota}
                to={a.rota}
                className="group flex items-center gap-3 [border-radius:var(--tl-radius-sm)] border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/40"
              >
                <a.Icone className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{a.nome}</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-slate-300 transition-colors group-hover:text-primary-500" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-primary-500/30 bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:border-primary-500/30 dark:from-primary-500/10 dark:to-primary-500/10 lg:col-span-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Insight IA — OmniAdvisor</h2>
          <Link
            to="/central-ia"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            Abrir Central de IA <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Conecte sua conta do Mercado Livre e aguarde a sincronização para gerar insights personalizados baseados em dados reais.
        </p>
      </div>
    </div>
  );
}