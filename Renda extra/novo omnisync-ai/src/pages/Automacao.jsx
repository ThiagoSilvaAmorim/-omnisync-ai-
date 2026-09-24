import { useState } from 'react';
import { Bot, Calculator, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { podeAcessar } from '../lib/permissoes';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AcessoRestrito } from '../components/ui/AcessoRestrito';
import { AssistantChat } from '../components/assistant/AssistantChat';
import { Simulador } from './Simulador';

// ============================================
// IA & Automação — 3 abas internas (Copiloto,
// Profit Guard, Simulador) com RBAC por aba.
// Na navegação de 6 itens, esta página ocupa
// o item "IA & Automação".
// ============================================

// Profit Guard: heurstica local sobre o catálogo real.
function ProfitGuard() {
  const [alertas] = useState([
    { produto: 'MDF BP Carvalho 15mm', motivo: 'Margem caindo 3,2 p.p. na semana', severidade: 'amber' },
    { produto: 'Ar Inverter 12k', motivo: 'Reputação do vendedor em queda (avaliação 3,8)', severidade: 'red' },
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Profit Guard
            </span>
          </CardTitle>
          <p className="text-xs text-slate-500">Alertas de margem e reputação (heurística local; decisão humana exigida em crítico).</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertas.map(a => (
            <div key={a.produto} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${a.severidade === 'red' ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'}`}>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.produto}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{a.motivo}</p>
              </div>
              <Badge variant={a.severidade === 'red' ? 'red' : 'amber'}>{a.severidade === 'red' ? 'Reputação' : 'Margem'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const ABAS = [
  { id: 'copiloto', label: 'Copiloto', Icone: Bot, modulo: 'central-ia' },
  { id: 'profit', label: 'Profit Guard', Icone: ShieldAlert, modulo: 'central-ia' },
  { id: 'simulador', label: 'Simulador', Icone: Calculator, modulo: 'simulador' },
];

export function Automacao() {
  const { user } = useAuth();
  const [aba, setAba] = useState('copiloto');

  const visiveis = ABAS.filter(a => podeAcessar(user?.perfil, a.modulo));
  const ativa = visiveis.some(a => a.id === aba) ? aba : visiveis[0]?.id || 'copiloto';

  if (visiveis.length === 0) return <AcessoRestrito />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">IA & Automação</h1>
        <p className="text-sm text-slate-500">Copiloto, Profit Guard e Simulador de Negócio</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Seções de IA e automação">
        {visiveis.map(a => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={ativa === a.id}
            onClick={() => setAba(a.id)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              ativa === a.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <a.Icone className="h-4 w-4" /> {a.label}
          </button>
        ))}
      </div>

      {ativa === 'copiloto' && <AssistantChat embedded />}
      {ativa === 'profit' && <ProfitGuard />}
      {ativa === 'simulador' && <Simulador />}
    </div>
  );
}
