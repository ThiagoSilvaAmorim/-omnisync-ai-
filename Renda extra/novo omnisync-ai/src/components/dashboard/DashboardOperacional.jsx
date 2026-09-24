import { useEffect, useState } from 'react';
import {
  operacionalAlertas,
  operacionalInsight,
  operacionalKpis,
  operacionalSerie,
  pedidosPorArmazem,
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
// Dashboard Operacional — Estoque & Logística.
// ============================================
export function DashboardOperacional({ onOpenAlerts }) {
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : operacionalKpis.map(kpi => (
              <MetricCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                format={kpi.format}
              />
            ))}
      </div>

      {/* Entregas (2/3) + Alertas (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entregas realizadas — últimos 8 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] rounded-lg" />
            ) : (
              <AreaChart data={operacionalSerie} theme={theme} label="Entregas" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={operacionalAlertas} loading={loading} onOpen={onOpenAlerts} />
          </CardContent>
        </Card>
      </div>

      {/* Pedidos por armazém */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos por armazém</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[260px] rounded-lg" />
          ) : (
            <BarChart data={pedidosPorArmazem} theme={theme} xKey="armazem" label="Pedidos" />
          )}
        </CardContent>
      </Card>

      {/* Insight IA */}
      <InsightCard acontecendo={operacionalInsight.acontecendo} recomendacao={operacionalInsight.recomendacao} />
    </div>
  );
}
