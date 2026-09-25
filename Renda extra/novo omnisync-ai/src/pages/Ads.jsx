import { Link } from 'react-router-dom';
import { Megaphone, Plug, RefreshCw } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

// ============================================
// ADS — investimento em anúncios pagos.
// Sem integração real de ADS no backend, a tela
// é um estado vazio honesto: sem métricas, sem
// gráficos fake e com caminho claro para conectar
// a integração. Período De/Até apenas define o
// filtro quando houver dados reais no futuro.
// ============================================

export function Ads() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">ADS</h1>
          <p className="text-sm text-slate-500">Investimento em anúncios pagos — sem integração ativa no momento</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="amber">Sem integração de ADS</Badge>
          <Button variant="secondary" disabled title="Disponível quando houver integração de ADS">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros de período — prontos para quando houver dados reais */}
      <Card>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-4 sm:items-end">
          <Input label="De" type="date" defaultValue={inicioMes} />
          <Input label="Até" type="date" defaultValue={hoje} />
          <div className="flex items-center gap-2 pb-0.5 text-xs text-slate-400">
            <RefreshCw className="h-3.5 w-3.5" />
            Última atualização: {formatDate(new Date())}
          </div>
          <Link
            to="/integrations"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <Plug className="h-4 w-4" /> Conectar integração
          </Link>
        </div>
      </Card>

      {/* Estado vazio honesto — nenhum KPI ou gráfico inventado */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho de anúncios</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Megaphone}
            title="Nenhuma integração de ADS ativa"
            description="Conecte uma conta de anúncios em Integrações para ver investimento, cliques e conversões reais. Sem integração, não há métricas para exibir."
          />
        </CardContent>
      </Card>
    </div>
  );
}
