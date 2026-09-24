import { useEffect, useState } from 'react';
import {
  alertas,
  dashboardInsight,
  getDashboardKpis,
  getFaturamentoSerie,
  getPeriodoLabel,
  getVendasPorCanal,
} from '../../data/mockData';
import { useTheme } from '../../hooks/useTheme';
import { MetricCard } from '../ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { AreaChart } from '../charts/AreaChart';
import { BarChart } from '../charts/BarChart';
import { AlertList } from './AlertList';
import { InsightCard } from './InsightCard';

// ============================================
// Dashboard Comercial — Vendas & Faturamento.
// Reage ao período selecionado no cabeçalho.
// ============================================
export function DashboardComercial({ period, customRange, onOpenAlerts }) {
  const { theme } = useTheme();

  // Simula o carregamento dos dados (skeleton ~600ms).
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const kpis = getDashboardKpis(period, customRange);
  const serie = getFaturamentoSerie(period, customRange);
  const canais = getVendasPorCanal(period, customRange);
  const periodoLabel = getPeriodoLabel(period, customRange);

  return (
    <div className="space-y-6">
      {/* KPIs (3 col desktop / 2 tablet / 1 mobile) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : kpis.map(kpi => (
              <MetricCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                format={kpi.format}
              />
            ))}
      </div>

      {/* Faturamento (2/3) + Alertas (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento — {periodoLabel}</CardTitle>
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
              {periodoLabel}
            </span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] rounded-lg" />
            ) : (
              <AreaChart data={serie} theme={theme} label="Faturamento" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={alertas} loading={loading} onOpen={onOpenAlerts} />
          </CardContent>
        </Card>
      </div>

      {/* Vendas por canal */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas por canal</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[260px] rounded-lg" />
          ) : (
            <BarChart data={canais} theme={theme} label="Vendas" />
          )}
        </CardContent>
      </Card>

      {/* Insight IA (OmniAdvisor) */}
      <InsightCard acontecendo={dashboardInsight.acontecendo} recomendacao={dashboardInsight.recomendacao} />
    </div>
  );
}
