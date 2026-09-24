import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bot, Boxes, PackageSearch, Ticket, TrendingUp, Wallet } from 'lucide-react';
import { api } from '../../services/api';
import { isValidDelta } from '../../lib/utils';
import { useTheme } from '../../hooks/useTheme';
import { MetricCard } from '../ui/MetricCard';
import { AiActionButton } from '../ui/AiActionButton';
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

const ICONE_KPI = {
  pedidos: null,
  ticketMedio: Ticket,
  lucro: TrendingUp,
};

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

export function BentoHome({ period, customRange }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [error, setError] = useState(null);
  const [analise, setAnalise] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ana, peds] = await Promise.all([
          api.getDashboardAnalytics().catch(() => null),
          api.getPedidos().catch(() => []),
        ]);
        setAnalytics(ana);
        setPedidos(Array.isArray(peds) ? peds : []);
      } catch (e) {
        console.error('Erro ao carregar BentoHome:', e);
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

  const analisarPeriodo = async () => {
    setAnalise(null);
    return api.analisarDominio('dashboard', {
      period: period || 'mes-atual',
      customRange: customRange || null,
    });
  };

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
              {Number(receita.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </p>
          )}
          {!loading && (
            <p className="mt-1 text-sm text-primary-700/80 dark:text-primary-300/80">
              {isValidDelta(receita.delta) ? (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-4">
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
        <div className="flex flex-wrap items-center gap-2">
          <Bot className="h-5 w-5 text-primary-600 dark:text-primary-400" />
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
              Abrir Central de IA <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        {analise ? (
          <div className="mt-3 rounded-xl bg-white/70 p-4 text-sm text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
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
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Peça uma leitura do período selecionado com base nos pedidos e produtos reais da base.
          </p>
        )}
      </div>
    </div>
  );
}
