import { useEffect, useState } from 'react';
import {
  executivoAlertas,
  executivoInsight,
  executivoKpis,
  executivoSerie,
  funilCrm,
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
// Dashboard Executivo — Financeiro & CRM.
// ============================================
export function DashboardExecutivo({ onOpenAlerts }) {
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
          : executivoKpis.map(kpi => (
              <MetricCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                format={kpi.format}
              />
            ))}
      </div>

      {/* Receita (2/3) + Alertas (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita recorrente (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] rounded-lg" />
            ) : (
              <AreaChart data={executivoSerie} theme={theme} label="Receita" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertList alerts={executivoAlertas} loading={loading} onOpen={onOpenAlerts} />
          </CardContent>
        </Card>
      </div>

      {/* Funil de CRM */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de CRM</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[260px] rounded-lg" />
          ) : (
            <BarChart data={funilCrm} theme={theme} label="Leads" />
          )}
        </CardContent>
      </Card>

      {/* Insight IA */}
      <InsightCard acontecendo={executivoInsight.acontecendo} recomendacao={executivoInsight.recomendacao} />
    </div>
  );
}
