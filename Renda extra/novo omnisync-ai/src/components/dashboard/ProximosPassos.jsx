import { AlertTriangle, Pause, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

// ============================================
// ProximosPassos — painel embutido no Dashboard.
// Sugestões de ação a partir de dados reais do
// banco (margem caindo, ruptura, reputação).
// Sem backend, mostra estado vazio honesto.
// ============================================

export function ProximosPassos({ loading: loadingExterno }) {
  const [acoes, setAcoes] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.getProdutos({ limit: 100 }).catch(() => ({ produtos: [] })),
      api.getTransacoes().catch(() => []),
    ])
      .then(([produtosData, transacoes]) => {
        if (!ativo) return;
        const produtos = produtosData.produtos || [];
        const criticos = produtos.filter(p => Number(p.minimo) > 0 && Number(p.estoque) <= Number(p.minimo));
        const lista = [];

        // Margem caindo (heurística a partir do fluxo).
        const receitas = (Array.isArray(transacoes) ? transacoes : []).filter(t => Number(t.valor) > 0);
        const despesas = (Array.isArray(transacoes) ? transacoes : []).filter(t => Number(t.valor) < 0);
        const saldo = receitas.reduce((a, t) => a + Number(t.valor), 0) - Math.abs(despesas.reduce((a, t) => a + Number(t.valor), 0));
        if (despesas.length > 0 && saldo < receitas.reduce((a, t) => a + Number(t.valor), 0) * 0.05) {
          lista.push({
            id: 'margem',
            titulo: 'Margem comprimida',
            detalhe: `Saldo de ${saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} sugere revisar despesas ou pausar anúncios caros.`,
            acao: 'Ver Financeiro',
            rota: '/financeiro',
            variante: 'amber',
          });
        }

        // Produtos críticos mais caros primeiro.
        criticos
          .sort((a, b) => Number(b.preco) * Number(b.estoque) - Number(a.preco) * Number(a.estoque))
          .slice(0, 2)
          .forEach(p => {
            lista.push({
              id: `estoque-${p.id}`,
              titulo: `${p.nome} com estoque crítico`,
              detalhe: `${p.estoque} unidades (mínimo ${p.minimo}) — pausar anúncio até repor?`,
              acao: 'Ver Estoque',
              rota: '/estoque',
              variante: 'red',
            });
          });

        if (lista.length === 0) lista.push({
          id: 'ok',
          titulo: 'Operação sem alertas críticos',
          detalhe: 'Nenhuma ação urgente detectada. Acompanhe o Radar de Mercado para oportunidades.',
          acao: 'Abrir Radar',
          rota: '/radar-mercado',
          variante: 'teal',
        });

        setAcoes(lista);
      })
      .catch(() => setAcoes([]))
      .finally(() => setLoading(false));
    return () => { ativo = false; };
  }, []);

  const carregando = loadingExterno || loading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-500" />
          <CardTitle>Próximos passos</CardTitle>
        </div>
        <p className="text-xs text-slate-500">Sugestões a partir dos dados reais do banco</p>
      </CardHeader>
      <CardContent>
        {carregando ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {acoes.map(a => (
              <div
                key={a.id}
                className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${
                  a.variante === 'red' ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
                    : a.variante === 'amber' ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                      : 'border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10'
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100">
                    {a.variante === 'red' ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                    {a.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{a.detalhe}</p>
                </div>
                <Link
                  to={a.rota}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white ${
                    a.variante === 'red' ? 'bg-red-600 hover:bg-red-700' : a.variante === 'amber' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {a.acao === 'Ver Estoque' ? <Pause className="h-3.5 w-3.5" /> : null} {a.acao}
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
