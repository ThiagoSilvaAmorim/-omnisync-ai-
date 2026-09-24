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
import { isValidDelta } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { MetricCard } from '../ui/MetricCard';
import { AiActionButton } from '../ui/AiActionButton';
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
  lucro: TrendingUp,
  itensEstoque: Boxes,
  capitalParado: Wallet,
};

// Monta os 4 KPIs SNV a partir do analytics real.
// Sem lucro (sem base de custo em pedidos), o card de lucro
// fica com value null → MetricCard exibe "—" honesto.
function kpisDoAnalytics(analytics) {
  const porId = new Map((analytics?.kpis || []).map(k => [k.id, k]));
  const fat = porId.get('faturamento');
  const ped = porId.get('pedidos');
  const tik = porId.get('ticketMedio');
  const luc = porId.get('lucroEstimado') || porId.get('lucro');
  return [
    { id: 'faturamento', label: 'Faturamento', value: fat?.value ?? 0, format: 'currency', delta: fat?.delta ?? null },
    { id: 'pedidos', label: 'Pedidos', value: ped?.value ?? 0, format: 'number', delta: ped?.delta ?? null },
    { id: 'ticketMedio', label: 'Ticket médio', value: tik?.value ?? 0, format: 'currency', delta: tik?.delta ?? null },
    {
      id: 'lucro',
      label: 'Lucro real',
      value: luc ? luc.value : null,
      format: 'currency',
      delta: luc?.delta ?? null,
      emptyHint: 'Sem base de custo',
    },
  ];
}

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
  const [analytics, setAnalytics] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(null);
  const [analise, setAnalise] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ana, dash, peds] = await Promise.all([
          api.getDashboardAnalytics().catch(() => null),
          api.getDashboardResumo().catch(() => null),
          api.getPedidos().catch(() => []),
        ]);
        setAnalytics(ana);
        setDashboardData(dash);
        setPedidos(Array.isArray(peds) ? peds : []);
      } catch (e) {
        console.error('Erro ao carregar dashboard:', e);
        setError(e.message);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };
    loadData();
  }, []);

  const kpis = kpisDoAnalytics(analytics);
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

  const analisarPeriodo = async () => {
    setAnalise(null);
    return api.analisarDominio('dashboard', {
      period: period || 'mes-atual',
      customRange: customRange || null,
    });
  };

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
                {Number(receita.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </p>
            )}
            <p className="mt-1 text-sm text-primary-700/80 dark:text-primary-300/80">
              {isValidDelta(receita.delta) ? (
                <>{receita.delta >= 0 ? '▲' : '▼'} {Math.abs(receita.delta)}% vs mês anterior</>
              ) : (
                'Sem histórico'
              )}
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
                emptyHint={kpi.emptyHint}
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Bot className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Insight IA — OmniAdvisor</h2>
          <div className="ml-auto flex items-center gap-3">
            <AiActionButton
              label="Analisar este período com Gemini"
              variant="primary"
              onRun={analisarPeriodo}
              onResult={setAnalise}
            />
            <Link
              to="/central-ia"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              Abrir Central de IA <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {analise ? (
          <div className="mt-4 rounded-xl bg-white/70 p-4 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            {analise.ok === false ? (
              <p>{analise.message || 'Dados insuficientes para análise confiável deste período.'}</p>
            ) : (
              <div className="space-y-2">
                <p className="whitespace-pre-wrap">{analise.analysis}</p>
                {analise.recommendations?.length > 0 && (
                  <p className="text-xs"><span className="font-semibold">Recomendações:</span> {analise.recommendations.join(' • ')}</p>
                )}
                {analise.risks?.length > 0 && (
                  <p className="text-xs text-amber-700 dark:text-amber-300"><span className="font-semibold">Riscos:</span> {analise.risks.join(' • ')}</p>
                )}
                <p className="text-xs text-slate-400">
                  Confiança {Math.round((analise.confidence ?? 0) * 100)}% • Qualidade {analise.dataQuality}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Peça uma leitura do período selecionado com base nos pedidos e produtos reais da base.
          </p>
        )}
      </div>
    </div>
  );
}
