import { useState } from 'react';
import { Plug, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { podeAcessar } from '../lib/permissoes';
import { AcessoRestrito } from '../components/ui/AcessoRestrito';
import { Integrations } from './Integrations';
import { Seguranca } from './Seguranca';

// ============================================
// Configurações — hub com abas Integrações e
// Segurança/Usuários, com RBAC por aba.
// ============================================

const ABAS = [
  { id: 'integracoes', label: 'Integrações', Icone: Plug, modulo: 'integracoes' },
  { id: 'seguranca', label: 'Segurança / Usuários', Icone: ShieldCheck, modulo: 'seguranca' },
];

export function ConfiguracoesHub() {
  const { user } = useAuth();
  const [aba, setAba] = useState('integracoes');

  const visiveis = ABAS.filter(a => podeAcessar(user?.perfil, a.modulo));
  const ativa = visiveis.some(a => a.id === aba) ? aba : visiveis[0]?.id || 'integracoes';

  if (visiveis.length === 0) return <AcessoRestrito />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Configurações</h1>
        <p className="text-sm text-slate-500">Integrações, segurança e gestão de usuários</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Seções de configurações">
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

      {ativa === 'integracoes' && <Integrations />}
      {ativa === 'seguranca' && <Seguranca />}
    </div>
  );
}
