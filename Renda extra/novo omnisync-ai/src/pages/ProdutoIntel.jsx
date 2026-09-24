import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, Sparkles, Star } from 'lucide-react';
import { produtoDestaque } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { useToast } from '../hooks/useToast';
import { MetricCard } from '../components/ui/MetricCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';
import { LineChart } from '../components/charts/LineChart';
import { ImagemProduto } from '../components/ui/ImagemProduto';

// ============================================
// Tela 02 — Inteligência do Produto.
// Visão analítica de um único produto: KPIs, tabs
// de contexto, cobertura de estoque e preços.
// ============================================

const TABS = ['Visão geral', 'Vendas', 'Estoque', 'Preço', 'Mercado', 'Avaliações', 'IA'];

// Semicírculo de cobertura de estoque (SVG customizado).
function CoverageGauge({ dias, situacao }) {
  const { primaryColor } = useApp();
  const max = 45;
  const pct = Math.min(dias / max, 1);
  const circumference = Math.PI * 80;
  const dash = pct * circumference;
  const cor = situacao === 'Saudável' ? primaryColor : '#f59e0b';

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[220px]">
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          strokeWidth="16"
          strokeLinecap="round"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke={cor}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{dias} dias</p>
        <p className="text-sm font-medium text-teal-600 dark:text-teal-400">{situacao}</p>
      </div>
    </div>
  );
}

// Barras horizontais de comparação de preços.
function PriceComparison({ itens }) {
  const { primaryColor } = useApp();
  const maxPreco = Math.max(...itens.map(i => i.preco));

  return (
    <div className="space-y-3">
      {itens.map(i => {
        const pct = (i.preco / maxPreco) * 100;
        return (
          <div key={i.concorrente}>
            <div className="flex items-center justify-between text-sm">
              <span
                className={
                  i.destaque
                    ? 'font-semibold text-slate-800 dark:text-slate-100'
                    : 'text-slate-500'
                }
              >
                {i.concorrente}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-100">
                R$ {i.preco.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-2 rounded-full"
                style={{ width: `${pct}%`, backgroundColor: i.destaque ? primaryColor : '#94a3b8' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProdutoIntel() {
  const { theme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('Visão geral');
  const [loading, setLoading] = useState(true);
  const [acoesOpen, setAcoesOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const p = produtoDestaque;

  const kpis = [
    { id: 'vendas', label: 'Vendas', value: p.vendas, format: 'number', delta: 12.4 },
    { id: 'receita', label: 'Receita', value: p.receita, format: 'currency', delta: 9.2 },
    { id: 'precoMedio', label: 'Preço médio', value: p.precoMedio, format: 'currency', delta: 2.1 },
    { id: 'margem', label: 'Margem', value: p.margem, format: 'number', delta: 3.5 },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho: voltar + breadcrumb + título + ações */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 rounded transition-colors hover:text-slate-700 dark:hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <span>/</span>
          <span>Produtos</span>
          <span>/</span>
          <span className="text-slate-400">Inteligência do Produto</span>
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <ImagemProduto src={p.imagem} alt={p.nome} className="h-14 w-14 rounded-xl" />
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {p.nome}
            </h1>
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {p.sku}
            </span>
            <Badge variant="teal">{p.badge}</Badge>
          </div>

          {/* Ações do produto (dropdown) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAcoesOpen(o => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Ações do produto
              <ChevronDown className="h-4 w-4" />
            </button>

            {acoesOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAcoesOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {['Editar produto', 'Duplicar', 'Arquivar'].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        toast(`${a} — ação iniciada`);
                        setAcoesOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : kpis.map(k => (
              <MetricCard key={k.id} label={k.label} value={k.value} delta={k.delta} format={k.format} />
            ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {tab === 'Visão geral' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de vendas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[260px] rounded-lg" />
              ) : (
                <LineChart data={p.historicoVendas} theme={theme} xKey="mes" dataKey="vendas" label="Vendas" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cobertura de estoque</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] rounded-lg" />
              ) : (
                <CoverageGauge dias={p.coberturaDias} situacao={p.situacaoEstoque} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparação de preços</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] rounded-lg" />
              ) : (
                <PriceComparison itens={p.comparacaoPrecos} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Vendas' && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de vendas detalhado</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] rounded-lg" />
            ) : (
              <LineChart data={p.historicoVendas} theme={theme} xKey="mes" dataKey="vendas" label="Vendas" height={300} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Estoque' && (
        <Card>
          <CardHeader>
            <CardTitle>Cobertura de estoque</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <CoverageGauge dias={p.coberturaDias} situacao={p.situacaoEstoque} />
            )}
            <p className="mt-4 max-w-md text-center text-sm text-slate-500">
              Recomenda-se reposição para manter {p.coberturaDias} dias de cobertura e evitar ruptura.
            </p>
          </CardContent>
        </Card>
      )}

      {tab === 'Preço' && (
        <Card>
          <CardHeader>
            <CardTitle>Comparação de preços</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] rounded-lg" />
            ) : (
              <PriceComparison itens={p.comparacaoPrecos} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'Mercado' && (
        <Card>
          <CardHeader>
            <CardTitle>Posicionamento de mercado</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              ['Demanda', 'Alta'],
              ['Concorrência', 'Média'],
              ['Margem estimada', `${p.margem}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500">{k}</p>
                <p className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{v}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 'Avaliações' && (
        <Card>
          <CardHeader>
            <CardTitle>Avaliações dos clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <p className="text-4xl font-bold text-slate-800 dark:text-slate-100">4,8</p>
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500">Baseado em 214 avaliações verificadas.</p>
          </CardContent>
        </Card>
      )}

      {tab === 'IA' && (
        <Card>
          <CardHeader>
            <CardTitle>Análise IA — OmniAdvisor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Oportunidade de crescimento +23%
            </p>
            <ul className="mt-3 space-y-2">
              {p.recomendacoesIA.map(r => (
                <li key={r} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" /> {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Rodapé IA */}
      <div className="rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:from-primary-500/10 dark:to-primary-500/10 dark:ring-1 dark:ring-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">
            Oportunidade de crescimento +23%
          </h2>
        </div>
        <ul className="mt-3 space-y-2">
          {p.recomendacoesIA.map(r => (
            <li key={r} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" /> {r}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Link
            to="/simulador"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-500 active:scale-95"
          >
            Ver plano de ação completo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
