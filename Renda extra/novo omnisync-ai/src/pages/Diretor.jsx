import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Crown, Plus, Sparkles, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ehDiretor } from '../lib/permissoes';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AcessoRestrito } from '../components/ui/AcessoRestrito';
import { ImagemProduto } from '../components/ui/ImagemProduto';

// ============================================
// Painel do Diretor — visão exclusiva do dono:
// briefing IA, runway, DRE por drawer, giro de
// capital e seções densas colapsáveis.
// ============================================

const BRL = v => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarMeta(m) {
  if (m.tipo === 'currency') return BRL(m.atual);
  if (m.tipo === 'percent') return `${Number(m.atual).toFixed(1)}%`;
  return Number(m.atual).toLocaleString('pt-BR');
}

// Seção colapsável: densa por padrão fechada, abre por clique ou botão +.
function SecaoColapsavel({ titulo, children, padraoAberta = false }) {
  const [aberta, setAberta] = useState(padraoAberta);
  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberta(a => !a)}
        title={aberta ? 'Recolher seção' : 'Expandir seção'}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-sm font-bold text-slate-500 dark:border-slate-700">
            {aberta ? '−' : <Plus className="h-3.5 w-3.5" />}
          </span>
          <CardTitle>{titulo}</CardTitle>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>
      {aberta && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// Gaveta lateral (drawer) do DRE ao clicar nos cards financeiros.
function DrawerDre({ aberto, titulo, linhas, onFechar }) {
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`DRE — ${titulo}`}>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-slate-900/40" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">DRE — {titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar drawer" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {linhas.map(l => (
            <div key={l.label} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm dark:border-slate-800">
              <span className="text-slate-500">{l.label}</span>
              <span className={`font-semibold ${l.cor || 'text-slate-800 dark:text-slate-100'}`}>{l.valor}</span>
            </div>
          ))}
          <p className="text-xs text-slate-400">Demonstração gerencial simplificada a partir do fluxo atual.</p>
        </div>
      </aside>
    </div>
  );
}

export function Diretor() {
  const { user } = useAuth();
  const [drawer, setDrawer] = useState(null);
  const diretor = ehDiretor(user);
  // DRE, top produtos e metas vêm do backend; sem dados, tudo zera.
  const [transacoes, setTransacoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [metas, setMetas] = useState([]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [t, p, m] = await Promise.all([
          api.getTransacoes().catch(() => []),
          api.getProdutos({ limit: 100 }).catch(() => null),
          api.getMetas().catch(() => []),
        ]);
        if (!ativo) return;
        setTransacoes(Array.isArray(t) ? t : []);
        setProdutos(p?.produtos || []);
        setMetas(Array.isArray(m) ? m : []);
      } catch {
        if (ativo) { setTransacoes([]); setProdutos([]); setMetas([]); }
      }
    })();
    return () => { ativo = false; };
  }, []);

  const receita = transacoes.filter(t => Number(t.valor) > 0).reduce((a, t) => a + Number(t.valor), 0);
  const despesa = Math.abs(transacoes.filter(t => Number(t.valor) < 0).reduce((a, t) => a + Number(t.valor), 0));
  const lucro = receita - despesa;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  // Fôlego financeiro: dias de operação sustentados pela receita atual.
  const queimaDiaria = despesa / 30;
  const folegoDias = queimaDiaria > 0 ? Math.floor(receita / queimaDiaria) : 999;

  // Briefing executivo gerado das métricas (regras determinísticas auditáveis).
  // Hook sempre executado na mesma ordem; a trava de perfil vem depois.
  const briefing = useMemo(() => {
    const alertas = [];
    if (margem < 5) alertas.push(`Margem líquida de ${margem.toFixed(1)}% criticamente baixa: o lucro de ${BRL(lucro)} está comprimido frente a ${BRL(despesa)} em despesas.`);
    else if (margem < 15) alertas.push(`Margem de ${margem.toFixed(1)}% em atenção: monitore despesas operacionais.`);
    else alertas.push(`Margem saudável de ${margem.toFixed(1)}% sobre ${BRL(receita)} de receita.`);
    if (folegoDias < 30) alertas.push(`Fôlego de apenas ${folegoDias} dias de operação: reforce caixa ou antecipe recebíveis.`);
    return alertas;
  }, [margem, lucro, despesa, receita, folegoDias]);

  if (!diretor) return <AcessoRestrito />;

  const dreLinhas = {
    Receita: [
      { label: 'Receita bruta', valor: BRL(receita) },
      { label: '(−) Despesas operacionais', valor: BRL(despesa), cor: 'text-red-500' },
      { label: '(=) Lucro líquido', valor: BRL(lucro) },
      { label: 'Margem líquida', valor: `${margem.toFixed(1)}%` },
    ],
    Despesas: [
      { label: 'Total de despesas', valor: BRL(despesa), cor: 'text-red-500' },
      { label: 'Peso sobre a receita', valor: receita > 0 ? `${((despesa / receita) * 100).toFixed(1)}%` : '—' },
      { label: 'Receita do período', valor: BRL(receita) },
    ],
    Lucro: [
      { label: 'Lucro líquido', valor: BRL(lucro) },
      { label: 'Margem líquida', valor: `${margem.toFixed(1)}%` },
      { label: 'Fôlego estimado', valor: folegoDias >= 999 ? '12+ meses' : `${folegoDias} dias` },
    ],
    Margem: [
      { label: 'Margem líquida', valor: `${margem.toFixed(1)}%` },
      { label: 'Piso de segurança', valor: '5,0%' },
      { label: 'Status', valor: margem < 5 ? 'CRÍTICO' : margem < 15 ? 'ATENÇÃO' : 'SAUDÁVEL', cor: margem < 5 ? 'text-red-500' : 'text-teal-600' },
    ],
  };

  const kpis = [
    { label: 'Receita', valor: BRL(receita), cor: 'text-teal-600 dark:text-teal-400' },
    { label: 'Despesas', valor: BRL(despesa), cor: 'text-red-500 dark:text-red-400' },
    { label: 'Lucro líquido', valor: BRL(lucro), cor: 'text-slate-800 dark:text-slate-100' },
    { label: 'Margem líquida', valor: `${margem.toFixed(1)}%`, cor: 'text-primary-600 dark:text-primary-400' },
  ];

  // Ranking com giro de capital: cobertura em meses + trava de capital.
  const topProdutos = [...produtos]
    .map(p => {
      const preco = Number(p.preco) || 0;
      const estoque = Number(p.estoque ?? p.atual) || 0;
      const minimo = Number(p.minimo) || 0;
      const valorEstoque = preco * estoque;
      const coberturaMeses = minimo > 0 ? estoque / minimo : 0;
      const travaCapital = coberturaMeses > 3 && valorEstoque > 5000;
      return { ...p, estoque, valorEstoque, coberturaMeses, travaCapital };
    })
    .sort((a, b) => b.valorEstoque - a.valorEstoque)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Painel do Diretor</h1>
          <p className="text-sm text-slate-500">Visão exclusiva do dono do negócio</p>
        </div>
        <Badge variant="purple">
          <Crown className="h-3 w-3" /> Exclusivo do diretor
        </Badge>
      </div>

      {/* Briefing executivo por IA */}
      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-500" /> Briefing executivo
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {briefing.map((texto, i) => (
            <p key={i} className={`rounded-lg border p-3 text-sm ${margem < 5 ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300' : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'}`}>
              {texto}
            </p>
          ))}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
            <span className="text-slate-500">Fôlego financeiro (runway)</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {folegoDias >= 999 ? '12+ meses de operação' : `${folegoDias} dias de operação`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lucro real — clique abre o DRE */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(k => (
          <button
            key={k.label}
            type="button"
            onClick={() => setDrawer(k.label)}
            title={`Abrir DRE — ${k.label}`}
            className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-primary-500 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${k.cor}`}>{k.valor}</p>
            <p className="mt-1 text-[11px] text-slate-400">Clique para ver o DRE</p>
          </button>
        ))}
      </div>

      {/* Metas (colapsada por padrão) */}
      <SecaoColapsavel titulo="Metas do mês">
        <div className="space-y-4">
          {metas.map(m => {
            const pct = Number(m.meta) > 0 ? Math.min(Math.round((Number(m.atual) / Number(m.meta)) * 100), 100) : 0;
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{m.nome}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {formatarMeta(m)} / {m.tipo === 'currency' ? BRL(m.meta) : m.tipo === 'percent' ? `${m.meta}%` : m.meta.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${pct >= 100 ? 'bg-teal-500' : pct >= 70 ? 'bg-primary-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SecaoColapsavel>

      {/* Top produtos com giro de capital (colapsado por padrão) */}
      <SecaoColapsavel titulo="Top 5 produtos por valor em estoque">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {topProdutos.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 p-4">
              <span className="w-6 text-sm font-bold text-slate-400">#{i + 1}</span>
              <ImagemProduto src={p.imagem} alt={p.nome} className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">{p.nome}</p>
                <p className="text-xs text-slate-500">
                  {p.estoque} unidades • cobertura {p.coberturaMeses.toFixed(1)} meses
                </p>
              </div>
              {p.travaCapital && (
                <Badge variant="red">Trava capital</Badge>
              )}
              <p className="font-semibold text-slate-800 dark:text-slate-100">{BRL(p.valorEstoque)}</p>
            </div>
          ))}
        </div>
      </SecaoColapsavel>

      <DrawerDre
        aberto={!!drawer}
        titulo={drawer || ''}
        linhas={drawer ? (dreLinhas[drawer] || []) : []}
        onFechar={() => setDrawer(null)}
      />
    </div>
  );
}
