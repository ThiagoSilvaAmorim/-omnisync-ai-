import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv, formatNumber, formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';

const CORES_FAIXA = { excesso: '#3b82f6', normal: '#10b981', baixo: '#f59e0b', critico: '#ef4444' };
const LEGENDA = [
  { faixa: 'excesso', label: 'Excesso' },
  { faixa: 'normal', label: 'Normal' },
  { faixa: 'baixo', label: 'Baixo' },
  { faixa: 'critico', label: 'Crítico' },
];

const STATUS_CONFIG = {
  normal: { label: 'Normal', variant: 'teal' },
  baixo: { label: 'Baixo', variant: 'amber' },
  critico: { label: 'Crítico', variant: 'red' },
  excesso: { label: 'Excesso', variant: 'sky' },
};

const ACOES_IA = ['Desconto', 'Kit', 'Campanha', 'Liquidar'];

// Gráfico de linha simples da projeção de 60 dias (dados reais via /api/estoque/previsao).
function PrevisaoChart({ data }) {
  const pontos = (Array.isArray(data) ? data : []).filter(d => Number.isFinite(Number(d.total)));
  if (pontos.length < 2) {
    return <p className="py-8 text-center text-sm text-slate-500">Sem dados suficientes para projetar.</p>;
  }
  const w = 600;
  const h = 260;
  const pad = 30;
  const valores = pontos.map(d => Number(d.total));
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const x = i => pad + (i / (pontos.length - 1)) * (w - 2 * pad);
  const y = v => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad);
  const pts = pontos.map((d, i) => ({ ...d, x: x(i), y: y(Number(d.total)) }));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Previsão de estoque">
      <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#94a3b8" strokeWidth="2" />
      {pts.map(p => (
        <circle key={p.dia} cx={p.x} cy={p.y} r="5" fill={CORES_FAIXA[p.faixa] || '#94a3b8'}>
          <title>{`${p.dia}: ${formatNumber(Number(p.total))} unidades (${p.faixa})`}</title>
        </circle>
      ))}
    </svg>
  );
}

export function Estoque() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ status: 'todos' });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({ atual: 0, critico: 0, reservado: 0, coberturaMediaDias: 0, capitalParado: 0 });
  const [previsao, setPrevisao] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [estoqueParado, setEstoqueParado] = useState([]);
  const [filtrosAvancados, setFiltrosAvancados] = useState(false);

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, previsaoData, produtosData, paradoData] = await Promise.all([
        api.getEstoqueKpis(),
        api.getPrevisaoEstoque(),
        api.getProdutosEstoque({ limit: 100 }),
        api.getEstoqueParado(),
      ]);
      setKpisState(kpisData);
      setPrevisao(previsaoData);
      setProdutos(produtosData.produtos || []);
      setEstoqueParado(paradoData);
    } catch (e) {
      console.error('Erro ao carregar dados de estoque:', e);
      toast('Erro ao carregar dados de estoque');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  const k = kpisState || {};
  const num = v => Number(v ?? 0);
  const dadosKpis = [
    { label: 'Estoque atual', valor: formatNumber(num(k.atual)), destaque: false },
    { label: 'Estoque crítico', valor: `${num(k.critico)} itens`, destaque: true },
    { label: 'Estoque reservado', valor: formatNumber(num(k.reservado)), destaque: false },
    { label: 'Cobertura média', valor: `${num(k.coberturaMediaDias)} dias`, destaque: false },
    { label: 'Capital parado', valor: formatCurrency(num(k.capitalParado)), destaque: false },
  ];

  const filtrados = produtos.filter(p => {
    if (busca && !`${p.nome} ${p.sku}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.status !== 'todos' && p.status !== filtros.status) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const paginaAtual = filtrados.slice((page - 1) * 10, page * 10);

  // Ações de IA viram tarefas reais na fila do backend (visíveis na Central de IA).
  const dispararAcaoIA = async acao => {
    const mapa = { Desconto: 'price.update', Kit: 'sales.generate_report', Campanha: 'social.schedule_post', Liquidar: 'stock.alert_rupture' };
    try {
      const r = await api.criarTarefa({ agentId: 'StockGuard', action: mapa[acao] || 'ia.run_agent', entityType: 'estoque', payload: { acao, totalItens: filtrados.length } });
      toast(`Ação "${acao}" enfileirada${r.taskId ? ` (${r.taskId})` : ''}`);
    } catch (e) {
      console.error('Erro ao enfileirar ação:', e);
      toast('Erro ao enfileirar ação de IA');
    }
  };

  const kpiCards = dadosKpis.map((item) => (
    <div
      key={item.label}
      className={`rounded-xl border p-5 shadow-sm ${item.destaque
        ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}
      `}
    >
      <p className="text-xs font-medium text-slate-500">{item.label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${item.destaque ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
      >
        {item.valor}
      </p>
    </div>
  ));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Gestão de Estoque</h1>
          <p className="text-sm text-slate-500">Monitore níveis, cobertura e capital parado</p>
        </div>
        <Button variant="secondary" onClick={() => {
          exportarCsv('estoque-omnisync.csv', [
            { titulo: 'Produto', chave: 'nome' },
            { titulo: 'SKU', chave: 'sku' },
            { titulo: 'Atual', chave: 'atual' },
            { titulo: 'Mínimo', chave: 'minimo' },
            { titulo: 'Cobertura (dias)', chave: 'coberturaDias' },
            { titulo: 'Status', chave: 'status' },
          ], filtrados);
          toast(`${filtrados.length} item(ns) exportados em CSV`);
        }}>
          <Download className="h-4 w-4" /> Exportar relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      {num(kpisState.critico) > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {num(kpisState.critico)} item(ns) em nível crítico — reposição recomendada.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setFiltros(f => ({ ...f, status: 'critico' })); setPage(1); }}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Ver itens críticos
            </button>
            <button
              type="button"
              onClick={() => toast('Pedido de compra gerado a partir dos itens críticos')}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:text-red-300"
            >
              Gerar pedido de compra
            </button>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between p-5">
          <p className="text-sm text-slate-500">
            Filtro atual: <span className="font-medium text-slate-700 dark:text-slate-200">{filtros.status === 'todos' ? 'Todos os status' : filtros.status}</span>
          </p>
          <Button variant="secondary" onClick={() => setFiltrosAvancados(true)}>
            <SlidersHorizontal className="h-4 w-4" /> Filtros avançados
          </Button>
        </div>
      </Card>

      {filtrosAvancados && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filtros avançados">
          <button type="button" aria-label="Fechar" onClick={() => setFiltrosAvancados(false)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Filtros avançados</h2>
              <button type="button" onClick={() => setFiltrosAvancados(false)} aria-label="Fechar filtros" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <Select label="Status" value={filtros.status} onChange={v => setFiltros(f => ({ ...f, status: v }))} options={[{ value: 'todos', label: 'Todos' }, { value: 'normal', label: 'Normal' }, { value: 'baixo', label: 'Baixo' }, { value: 'critico', label: 'Crítico' }, { value: 'excesso', label: 'Excesso' }]} />
              <p className="text-xs text-slate-400">Período, categoria, fornecedor e armazém entram na Fase 10 (filtros facetados).</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-5 dark:border-slate-800">
              <Button variant="secondary" onClick={() => { setFiltros({ status: 'todos' }); setPage(1); }}>
                Limpar
              </Button>
              <Button onClick={() => { setFiltrosAvancados(false); setPage(1); }}>
                Aplicar
              </Button>
            </div>
          </aside>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Previsão de estoque total — próximos 60 dias</CardTitle>
          <div className="flex flex-wrap gap-3">
            {LEGENDA.map(l => (
              <span key={l.faixa} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORES_FAIXA[l.faixa] }} /> {l.label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[260px] rounded-lg" /> : <PrevisaoChart data={previsao} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Produtos</CardTitle>
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              placeholder="Buscar produto ou SKU..."
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 text-right font-medium">Atual</th>
                  <th className="px-5 py-3 text-right font-medium">Mínimo</th>
                  <th className="px-5 py-3 text-right font-medium">Cobertura</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginaAtual.map(p => {
                  const s = STATUS_CONFIG[p.status] || { label: p.status ?? '—', variant: 'gray' };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{p.nome}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{p.atual}</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{p.minimo}</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{p.coberturaDias} dias</td>
                      <td className="px-5 py-3"><Badge variant={s.variant}>{s.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              Página {page} de {totalPaginas}
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPage(p => Math.min(totalPaginas, p + 1))} disabled={page === totalPaginas} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estoque parado por faixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {estoqueParado.map(f => (
                <div key={f.faixa}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{f.faixa}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{f.percentual}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-primary-500" style={{ width: `${f.percentual}%` }} />
                  </div>
                </div>
              ))
              }
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary-500" /> Ações recomendadas por IA
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ACOES_IA.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => dispararAcaoIA(a)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200"
                >
                  {a}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}