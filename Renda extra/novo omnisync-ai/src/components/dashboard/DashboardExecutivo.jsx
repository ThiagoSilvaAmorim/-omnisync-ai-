import { useEffect, useState } from 'react';
import { BarChart3, BellRing, Filter, Wallet } from 'lucide-react';
import { api } from '../../services/api';
import { MetricCard } from '../ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

// ============================================
// Dashboard Executivo — Financeiro & CRM.
// G1: NENHUM dado fabricado. Os KPIs vêm do
// endpoint real GET /api/dashboard/analytics
// (mesmo que a home); blocos sem fonte real
// (MRR, alertas, funil) mostram estado vazio
// honesto em vez de valores fixos do mock.
// ============================================

// KPIs reais do analytics; sem base → null → MetricCard exibe "—".
function kpisDoAnalytics(analytics) {
  const porId = new Map((analytics?.kpis || []).map(k => [k.id, k]));
  const fat = porId.get('faturamento');
  const ped = porId.get('pedidos');
  const tik = porId.get('ticketMedio');
  const luc = porId.get('lucroEstimado') || porId.get('lucro');
  return [
    { id: 'faturamento', label: 'Faturamento', value: fat?.value ?? null, format: 'currency', delta: fat?.delta ?? null },
    { id: 'pedidos', label: 'Pedidos', value: ped?.value ?? null, format: 'number', delta: ped?.delta ?? null },
    { id: 'ticketMedio', label: 'Ticket médio', value: tik?.value ?? null, format: 'currency', delta: tik?.delta ?? null },
    { id: 'lucro', label: 'Lucro real', value: luc ? luc.value : null, format: 'currency', delta: luc?.delta ?? null, emptyHint: 'Sem base de custo' },
  ];
}

export function DashboardExecutivo() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let ativo = true;
    api.getDashboardAnalytics()
      .then(ana => { if (ativo) setAnalytics(ana); })
      .catch(() => { /* sem backend: KPIs ficam com "—" honesto */ })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, []);

  const kpis = kpisDoAnalytics(analytics);

  return (
    <div className="space-y-6">
      {/* KPIs reais (analytics) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : kpis.map(kpi => (
              <MetricCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                delta={kpi.delta}
                format={kpi.format}
                emptyHint={kpi.emptyHint}
              />
            ))}
      </div>

      {/* MRR + Alertas — sem fonte real: estado vazio honesto (nada de mock) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita recorrente (MRR)</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Wallet}
              title="Sem fonte de MRR conectada"
              description="Este painel não exibe valores fabricados — a série de receita recorrente entra aqui quando houver dados reais."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={BellRing}
              title="Sem alertas reais"
              description="Alertas de margem/churn/NPS aparecem aqui quando a fonte deles for conectada."
            />
          </CardContent>
        </Card>
      </div>

      {/* Funil de CRM — sem fonte real */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Filter}
            title="Sem dados de funil"
            description="Leads, qualificados, propostas e fechamentos entram aqui quando o CRM estiver conectado — nunca valores fixos."
          />
        </CardContent>
      </Card>

      {/* Nota de honestidade */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <BarChart3 className="mr-1.5 inline h-3.5 w-3.5" />
        KPIs acima calculados por <code>GET /api/dashboard/analytics</code> sobre dados reais da base.
      </div>
    </div>
  );
}
