import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';

// Barra de progresso local reutilizada na distribuição por categoria.
function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Relatorios() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ tipo: 'gerencial', periodo: '30d' });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({
    faturamentoTotal: 0,
    custoOperacional: 0,
    margemLucro: 0,
    ticketsMedio: 0
  });
  const [metricas, setMetricas] = useState([]);
  const [graficoDados, setGraficoDados] = useState([]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, metricasData, graficoData] = await Promise.all([
        api.getKpisRelatorios(),
        api.getMetricasRelatorio(),
        api.getDadosGraficoRelatorio(),
      ]);
      setKpisState(kpisData);
      const listaMetricas = Array.isArray(metricasData) ? metricasData : (metricasData.metricas || []);
      setMetricas(listaMetricas);
      const listaGrafico = Array.isArray(graficoData) ? graficoData : (graficoData.dados || []);
      // Normaliza o formato do gráfico para { id, titulo, valor, porcentual }.
      setGraficoDados(listaGrafico.map((g, i) => ({
        id: g.id ?? i,
        titulo: g.titulo ?? g.descricao ?? `Item ${i + 1}`,
        valor: g.valor ? `R$ ${Number(g.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : (g.categoria ?? ''),
        porcentual: g.porcentual ?? 50,
      })));
    } catch (e) {
      console.error('Erro ao carregar dados de relatórios:', e);
      toast('Erro ao carregar dados de relatórios');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const k = kpisState;
  const dadosKpis = [
    { label: 'Faturamento Total', valor: `R$ ${k.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, destaque: true },
    { label: 'Custo Operacional', valor: `R$ ${k.custoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, destaque: true },
    { label: 'Margem de Lucro', valor: `${k.margemLucro}%`, destaque: false },
    { label: 'Ticket Médio', valor: `R$ ${k.ticketsMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, destaque: false },
  ];

  // Gráfico filtrado pela busca e paginado (10 itens por página).
  const graficoFiltrado = graficoDados.filter(g => {
    if (!busca) return true;
    return `${g.titulo ?? ''}`.toLowerCase().includes(busca.toLowerCase());
  });
  const totalPaginas = Math.max(1, Math.ceil(graficoFiltrado.length / 10));
  const paginaAtual = graficoFiltrado.slice((page - 1) * 10, page * 10);
  void metricas;

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Relatórios e Análises</h1>
          <p className="text-sm text-slate-500">Geração de relatórios financeiros e operacionais</p>
        </div>
        <Button variant="secondary" onClick={() => {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text('Relatório Gerencial — OmniSync AI', 14, 20);
          doc.setFontSize(10);
          doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} • Período: ${filtros.periodo}`, 14, 27);
          let y = 38;
          doc.setFontSize(12);
          dadosKpis.forEach(k => {
            doc.text(`${k.label}: ${k.valor}`, 14, y);
            y += 8;
          });
          y += 4;
          doc.setFontSize(12);
          doc.text('Métricas', 14, y);
          y += 8;
          doc.setFontSize(10);
          paginaAtual.slice(0, 20).forEach(g => {
            doc.text(`- ${g.titulo}: ${g.valor} (${g.porcentual}%)`, 14, y);
            y += 7;
            if (y > 280) { doc.addPage(); y = 20; }
          });
          doc.save('relatorio-omnisync.pdf');
          toast('Relatório exportado em PDF');
        }}>
          <Download className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Select label="Tipo" value={filtros.tipo} onChange={v => setFiltros(f => ({ ...f, tipo: v }))} options={[{ value: 'gerencial', label: 'Gerencial' }, { value: 'financeiro', label: 'Financeiro' }, { value: 'operacional', label: 'Operacional' }, { value: 'comercial', label: 'Comercial' }]} />
          <Select label="Período" value={filtros.periodo} onChange={v => setFiltros(f => ({ ...f, periodo: v }))} options={[{ value: '7d', label: '7 dias' }, { value: '30d', label: '30 dias' }, { value: '90d', label: '90 dias' }, { value: '12m', label: '12 meses' }]} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métricas Principais</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Buscar métrica ou categoria..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              type="text"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução das Métricas</CardTitle>
          </CardHeader>
          <div className="h-96 overflow-y-auto">
            {loading ? (
              <Skeleton className="h-64 rounded-lg" />
            ) : paginaAtual.map(g => (
              <div key={g.id} className="p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-between justify-between mb-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{g.titulo}</span>
                  <span className="text-xs text-slate-500">{g.valor}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${g.porcentual}%` }} aria-valuemin={0} aria-valuemax={100} />
                </div>
                <span className="text-sm text-slate-500">{g.porcentual}%</span>
              </div>
            ))}
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
              <CardTitle>Distribuição por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="h-64 space-y-4">
              {[
                { cat: 'financeiro', pct: 42 },
                { cat: 'operacional', pct: 35 },
                { cat: 'comercial', pct: 48 },
                { cat: 'tributario', pct: 27 },
              ].map(({ cat, pct }) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{cat}</span>
                  <div>
                    <ProgressBar value={pct} />
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ultimos Relatórios Gerados</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <div className="h-full space-y-3">
                {['relatorio-faturamento', 'relatorio-custos', 'relatorio-margem', 'relatorio-tickets'].map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{r}</span>
                    <span className="text-xs text-slate-500">{i < 2 ? 'Hoje' : 'Há 2 dias'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}