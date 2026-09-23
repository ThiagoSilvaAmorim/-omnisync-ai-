import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, Rocket } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';

// ============================================
// Onboarding — checklist de configuração com
// verificações reais no backend. Cada item só
// marca como concluído com dado real; sem
// backend, tudo fica pendente (nada inventado).
// ============================================

export function Onboarding() {
  const [checks, setChecks] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const resultado = { ml: false, produtos: false, fornecedores: false, pedidos: false };
      try {
        const [ml, produtos, fornecedores, pedidos] = await Promise.all([
          api.mlGetStatus().catch(() => null),
          api.getProdutos({ limit: 1 }).catch(() => null),
          api.getFornecedoresSalvos().catch(() => null),
          api.getPedidos().catch(() => null),
        ]);
        resultado.ml = ml?.status === 'conectado';
        resultado.produtos = (produtos?.total ?? produtos?.produtos?.length ?? 0) > 0;
        resultado.fornecedores = (Array.isArray(fornecedores) ? fornecedores.length : 0) > 0;
        resultado.pedidos = (Array.isArray(pedidos) ? pedidos.length : 0) > 0;
      } catch {
        /* mantém tudo pendente */
      }
      if (ativo) setChecks(resultado);
    })();
    return () => { ativo = false; };
  }, []);

  const itens = checks ? [
    { chave: 'ml', titulo: 'Conectar o Mercado Livre', descricao: 'Autorize a conta para importar anúncios e ler envios.', rota: '/integracoes', feito: checks.ml },
    { chave: 'produtos', titulo: 'Cadastrar produtos', descricao: 'Importe do Radar ou cadastre manualmente.', rota: '/produtos', feito: checks.produtos },
    { chave: 'fornecedores', titulo: 'Cadastrar fornecedores', descricao: 'Salve fornecedores para gerar ordens de compra.', rota: '/fornecedores', feito: checks.fornecedores },
    { chave: 'pedidos', titulo: 'Receber o primeiro pedido', descricao: 'Pedidos sincronizados aparecem aqui.', rota: '/pedidos', feito: checks.pedidos },
  ] : [];
  const concluidos = itens.filter(i => i.feito).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Comece por aqui</h1>
        <p className="text-sm text-slate-500">Configure o essencial para operar</p>
      </div>
      <Card>
        {checks == null ? (
          <EmptyState title="Verificando sua conta…" description="Consultando o backend." />
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {concluidos} de {itens.length} etapas concluídas
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${Math.round((concluidos / itens.length) * 100)}%` }}
              />
            </div>
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map(item => (
                <Link key={item.chave} to={item.rota} className="flex items-center gap-3 py-3">
                  {item.feito
                    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-500" />
                    : <Circle className="h-5 w-5 shrink-0 text-slate-300" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.titulo}</p>
                    <p className="truncate text-xs text-slate-500">{item.descricao}</p>
                  </div>
                  <span className="text-xs font-medium text-primary-600">
                    {item.feito ? 'Concluído' : 'Configurar'}
                  </span>
                </Link>
              ))}
            </div>
            {concluidos === itens.length && (
              <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                Tudo pronto. Bom trabalho!
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
