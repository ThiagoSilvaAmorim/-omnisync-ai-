import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
// radarProdutos removido — usar dados reais do Mercado Livre
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { CATEGORIAS_INTERNET, buscarMercadoLivre, buscarProdutosInternet, formatPrecoRadar } from '../services/marketplace';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { ImagemProduto } from '../components/ui/ImagemProduto';

// ============================================
// Tela 03 — Radar de Mercado.
// Filtros + 3 seções de produtos (em alta,
// emergentes, alta margem) com Opportunity Score.
// ============================================

const SECOES = [
  { id: 'emAlta', titulo: 'Produtos em alta' },
  { id: 'emergentes', titulo: 'Produtos emergentes' },
  { id: 'altaMargem', titulo: 'Alta margem' },
];

// radarProdutos removido — usar dados reais do Mercado Livre
// const SECOES = [...]

// Anel de Opportunity Score (0-100).
function ScoreRing({ score, color }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;

  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-slate-100">
        {score}
      </span>
    </div>
  );
}

function varianteDemanda(d) {
  return { Alta: 'teal', Média: 'amber', Baixa: 'slate' }[d] ?? 'slate';
}
function varianteConcorrencia(c) {
  return { Alta: 'red', Média: 'amber', Baixa: 'teal' }[c] ?? 'slate';
}
function varianteOportunidade(o) {
  return o === 'Excelente' ? 'teal' : 'indigo';
}

export function RadarMercado() {
  const { primaryColor } = useApp();

  const [draft, setDraft] = useState({ demanda: 'Todas', concorrencia: 'Todas', margem: 'Todas', preco: 'Todos' });
  const [filtros, setFiltros] = useState(draft);

  // Radar ao vivo — produtos reais da internet (API gratuita, sob demanda).
  const [categoriaInternet, setCategoriaInternet] = useState('beauty');
  const [produtosInternet, setProdutosInternet] = useState([]);
  const [carregandoInternet, setCarregandoInternet] = useState(true);
  const [erroInternet, setErroInternet] = useState('');
  const [ocultarSemPreco, setOcultarSemPreco] = useState(false);
  const [logsRadar, setLogsRadar] = useState([]);
  const [importandoId, setImportandoId] = useState(null);
  // Ids de produtos ocultos (X) e a lista original para restaurar.
  const [ocultos, setOcultos] = useState([]);
  const [todosProdutos, setTodosProdutos] = useState([]);
  const [termoML, setTermoML] = useState('');
  const toast = useToast();

  const registrarLog = texto => {
    setLogsRadar(prev => [{ hora: new Date().toLocaleTimeString('pt-BR'), texto }, ...prev].slice(0, 20));
  };

  // Varredura manual: só executa no clique (nunca em loop de fundo).
  const rodarAgora = useCallback(async (categoria = categoriaInternet) => {
    setCarregandoInternet(true);
    setErroInternet('');
    setOcultos([]);
    try {
      const r = await buscarProdutosInternet(categoria);
      setProdutosInternet(r);
      setTodosProdutos(r);
      registrarLog(`Varreu ${r.length} produtos na categoria ${categoria}`);
    } catch (e) {
      setErroInternet(e.message);
      setProdutosInternet([]);
      setTodosProdutos([]);
      registrarLog(`Falha na varredura: ${e.message}`);
    } finally {
      setCarregandoInternet(false);
    }
  }, [categoriaInternet]);

  const mudarCategoria = c => {
    setCategoriaInternet(c);
    rodarAgora(c);
  };

  useEffect(() => {
    let ativo = true;
    setCarregandoInternet(true);
    buscarProdutosInternet(categoriaInternet)
      .then(r => {
        if (ativo) {
          setProdutosInternet(r);
          setTodosProdutos(r);
        }
      })
      .catch(e => {
        if (ativo) {
          setErroInternet(e.message);
          setProdutosInternet([]);
          setTodosProdutos([]);
        }
      })
      .finally(() => {
        if (ativo) setCarregandoInternet(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const importarProduto = async p => {
    setImportandoId(p.id);
    try {
      await api.criarProduto({
        nome: p.nome?.slice(0, 120) || 'Produto importado do Radar',
        sku: `RAD-${String(p.id).slice(0, 12)}`.toUpperCase(),
        categoria: p.categoria || categoriaInternet,
        preco: 0,
        estoque: 0,
        minimo: 0,
        status: 'ativo',
        fornecedor: p.marca || p.origem || '',
      });
      toast(`"${p.nome}" importado para a base`);
      registrarLog(`Importado "${p.nome}" para a base`);
    } catch (e) {
      toast(`Erro ao importar: ${e.message}`);
    } finally {
      setImportandoId(null);
    }
  };

  const produtosVisiveis = produtosInternet
    .filter(p => !ocultos.includes(p.id))
    .filter(p => (ocultarSemPreco ? p.preco != null : true));

  // Radar ao vivo — produtos reais da internet (API gratuita, sob demanda).
  // As seções abaixo usam mock data — substituído por dados reais do Mercado Livre.
  // Para ver produtos reais, use a busca "Mercado Livre ao vivo" acima.
  const [resultadosML, setResultadosML] = useState([]);
  const [carregandoML, setCarregandoML] = useState(false);
  const [erroML, setErroML] = useState('');
  const [analiseML, setAnaliseML] = useState(null);
  const [analisandoML, setAnalisandoML] = useState(false);
  const [ordenarML, setOrdenarML] = useState('vendidos');
  // Acompanhamento de preços (watchlist local do navegador).
  const [watchlist, setWatchlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexora-watchlist') || '[]');
    } catch {
      return [];
    }
  });

  const alternarWatchlist = p => {
    setWatchlist(prev => {
      const existe = prev.some(w => w.id === p.id);
      const next = existe ? prev.filter(w => w.id !== p.id) : [...prev, { id: p.id, nome: p.nome, preco: p.preco, link: p.link, imagem: p.imagem, desde: new Date().toLocaleDateString('pt-BR') }];
      try {
        localStorage.setItem('nexora-watchlist', JSON.stringify(next));
      } catch { /* sem persistência */ }
      return next;
    });
  };

  const buscarML = async () => {
    setCarregandoML(true);
    setErroML('');
    try {
      const r = await buscarMercadoLivre(termoML);
      setResultadosML(r);
      registrarLog(`Buscou ${r.length} produtos no Mercado Livre ("${termoML}")`);
    } catch (e) {
      setErroML(e.message);
      setResultadosML([]);
      registrarLog(`Falha no Mercado Livre: ${e.message}`);
    } finally {
      setCarregandoML(false);
    }
  };

  const resultadosMLOrdenados = [...resultadosML].sort((a, b) => (
    ordenarML === 'vendidos' ? b.vendidos - a.vendidos : a.preco - b.preco
  ));

  // Análise Gemini somente sobre os cards reais visíveis (nunca DummyJSON).
  // Margem indisponível: custo de aquisição não existe nesses cards.
  const analisarML = async () => {
    setAnalisandoML(true);
    setAnaliseML(null);
    try {
      const produtos = resultadosMLOrdenados.slice(0, 12).map(p => ({
        nome: p.nome,
        preco: p.preco,
        moeda: p.moeda,
        fonte: 'Mercado Livre (busca autenticada)',
        vendidos: p.vendidos,
      }));
      const r = await api.analisarDominio('market', { produtos });
      setAnaliseML(r);
    } catch (e) {
      setAnaliseML({ ok: false, code: 'ANALYZE_FAILED', message: e.message || 'Falha na análise.' });
    } finally {
      setAnalisandoML(false);
    }
  };

  // Moeda explícita via helper compartilhado: USD original sem conversão inventada.
  const formatarPreco = p => formatPrecoRadar(p);

  const importarML = async p => {
    setImportandoId(p.id);
    try {
      await api.criarProduto({
        nome: p.nome?.slice(0, 120) || 'Produto importado do ML',
        sku: `ML-${String(p.id).replace('ml-', '').slice(0, 12)}`.toUpperCase(),
        categoria: 'Marketplace',
        preco: p.moeda === 'BRL' ? Number(p.preco) || 0 : 0,
        estoque: 0,
        minimo: 0,
        status: 'ativo',
        fornecedor: 'Mercado Livre',
      });
      toast(`"${p.nome}" importado para a base`);
      registrarLog(`Importou "${p.nome}" do Mercado Livre`);
    } catch (e) {
      toast(`Erro ao importar: ${e.message}`);
    } finally {
      setImportandoId(null);
    }
  };

  const ocultar = id => setOcultos(prev => [...prev, id]);
  const restaurar = () => {
    setOcultos([]);
    setProdutosInternet(todosProdutos);
  };

  const aplicar = p => {
    if (filtros.demanda !== 'Todas' && p.demanda !== filtros.demanda) return false;
    if (filtros.concorrencia !== 'Todas' && p.concorrencia !== filtros.concorrencia) return false;
    if (filtros.margem !== 'Todas' && p.margemEstimada < Number(filtros.margem)) return false;
    if (filtros.preco !== 'Todos' && p.preco > Number(filtros.preco)) return false;
    return true;
  };

  // radarProdutos removido — secoes mock não são mais usadas
  const secoes = [];
  const total = 0;

  const scoreColor = score => (score >= 80 ? '#10b981' : score >= 70 ? primaryColor : '#f59e0b');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Radar de Mercado</h1>
        <p className="text-sm text-slate-500">Descubra produtos com potencial de crescimento</p>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <Select
            label="Demanda"
            value={draft.demanda}
            onChange={v => setDraft(d => ({ ...d, demanda: v }))}
            options={[
              { value: 'Todas', label: 'Todas' },
              { value: 'Alta', label: 'Alta demanda' },
              { value: 'Média', label: 'Média demanda' },
              { value: 'Baixa', label: 'Baixa demanda' },
            ]}
          />
          <Select
            label="Faixa de preço"
            value={draft.preco}
            onChange={v => setDraft(d => ({ ...d, preco: v }))}
            options={[
              { value: 'Todos', label: 'Todos' },
              { value: '100', label: 'Até R$ 100' },
              { value: '200', label: 'Até R$ 200' },
              { value: '400', label: 'Até R$ 400' },
            ]}
          />
          <Select
            label="Concorrência"
            value={draft.concorrencia}
            onChange={v => setDraft(d => ({ ...d, concorrencia: v }))}
            options={[
              { value: 'Todas', label: 'Todas' },
              { value: 'Alta', label: 'Alta' },
              { value: 'Média', label: 'Média' },
              { value: 'Baixa', label: 'Baixa' },
            ]}
          />
          <Button className="lg:mb-0" onClick={() => setFiltros(draft)}>
            <SlidersHorizontal className="h-4 w-4" /> Aplicar filtros
          </Button>
        </div>
      </Card>

      {/* Radar ao vivo — produtos reais da internet */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Radar ao vivo — produtos da internet</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">Varredura sob demanda com cache de 10 min e timeout de 8s</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Fonte: API pública (DummyJSON/OpenFoodFacts) — não são produtos da sua loja</p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${erroInternet ? 'bg-red-100 text-red-700' : carregandoInternet ? 'bg-amber-100 text-amber-700' : 'bg-teal-100 text-teal-700'}`}>
              <span className={`h-2 w-2 rounded-full ${erroInternet ? 'bg-red-500' : carregandoInternet ? 'bg-amber-500 animate-pulse' : 'bg-teal-500'}`} />
              {erroInternet ? 'Erro' : carregandoInternet ? 'Processando' : 'Ativo'}
            </span>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Select
              value={categoriaInternet}
              onChange={mudarCategoria}
              options={[{ value: 'todas', label: 'Todas as categorias' }, ...CATEGORIAS_INTERNET]}
              className="w-52"
            />
            <Button variant="secondary" onClick={() => rodarAgora()}>
              <RefreshCw className="h-4 w-4" /> Rodar agora
            </Button>
          </div>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-4 px-5 pb-3 text-xs text-slate-500">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={ocultarSemPreco}
              onChange={e => setOcultarSemPreco(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Ocultar itens sem preço válido
          </label>
          {logsRadar.length > 0 && (
            <span title={logsRadar.map(l => `${l.hora} — ${l.texto}`).join('\n')}>
              Última ação: {logsRadar[0].hora} — {logsRadar[0].texto}
            </span>
          )}
        </div>
        <CardContent>
          {erroInternet ? (
            <EmptyState
              title="Sem conexão com a internet"
              description="Não foi possível buscar produtos agora. Verifique sua conexão e recarregue."
            />
          ) : carregandoInternet ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : produtosVisiveis.length === 0 ? (
            <EmptyState title="Todos os produtos ocultados" description="Clique em 'Restaurar' para trazê-los de volta." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {produtosVisiveis.map(p => (
                <div
                  key={p.id}
                  className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <button
                    type="button"
                    onClick={() => ocultar(p.id)}
                    className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white transition-colors hover:bg-red-500"
                    aria-label={`Ocultar ${p.nome}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <ImagemProduto src={p.imagem} alt={p.nome} className="mb-2 h-24 w-full rounded-lg" />
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100" title={p.nome}>
                    {p.nome}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {formatarPreco(p)}
                  </p>
                  {p.origem === 'OpenFoodFacts' && (
                    <p className="mt-1 text-[10px] font-medium text-teal-600 dark:text-teal-400" title={p.marca}>
                      {p.marca}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] leading-tight text-slate-400">
                    Moeda original: {p.moeda || 'USD'} • Fonte: catálogo público externo
                  </p>
                  <p className="text-[10px] leading-tight text-slate-400">
                    Produto da loja: não{p.consultadoEm ? ` • ${new Date(p.consultadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => importarProduto(p)}
                    disabled={importandoId === p.id}
                    title="Importar para a base de produtos"
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    <Download className="h-3.5 w-3.5" /> {importandoId === p.id ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              ))}
            </div>
          )}
          {ocultos.length > 0 && (
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-xs text-slate-500">{ocultos.length} produto(s) ocultado(s)</span>
              <Button size="sm" variant="secondary" onClick={restaurar}>
                <RefreshCw className="h-3.5 w-3.5" /> Restaurar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mercado Livre real — API pública, preço em R$ e mais vendidos */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mercado Livre ao vivo</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">Produtos reais via API pública (sem chave), com vendidos. Para dados da sua loja, conecte sua conta em Integrações.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="text"
              value={termoML}
              onChange={e => setTermoML(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') buscarML(); }}
              placeholder="Buscar produto..."
              className="h-10 w-52 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <select
              value={ordenarML}
              onChange={e => setOrdenarML(e.target.value)}
              aria-label="Ordenar por"
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="vendidos">Mais vendidos</option>
              <option value="preco">Menor preço</option>
            </select>
            <Button onClick={buscarML} disabled={carregandoML}>
              <Search className="h-4 w-4" /> {carregandoML ? 'Buscando...' : 'Buscar no ML'}
            </Button>
            <Button
              variant="secondary"
              onClick={analisarML}
              disabled={carregandoML || analisandoML || resultadosMLOrdenados.length === 0}
              title="Analisa somente os cards reais visíveis"
            >
              {analisandoML ? 'Analisando...' : 'Analisar com Gemini'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {erroML ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <p className="font-semibold mb-1">Erro ao buscar no Mercado Livre</p>
              <p>{erroML}</p>
              <p className="mt-2 text-xs opacity-80">
                <strong>Sugestão:</strong> conecte sua conta do Mercado Livre na aba de{" "}
                <a href="/integracoes" className="underline font-medium hover:text-red-900 dark:hover:text-red-300">
                  Integrações
                </a>
                .
              </p>
            </div>
          ) : carregandoML ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : resultadosMLOrdenados.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
              Digite um termo e clique em "Buscar no ML" para ver cards reais.
            </p>
          ) : (
            <>
            {watchlist.length > 0 && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Acompanhando preços ({watchlist.length})
                </p>
                <div className="space-y-1.5">
                  {watchlist.map(w => (
                    <div key={w.id} className="flex items-center justify-between gap-2 text-xs">
                      <a href={w.link} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-slate-700 hover:underline dark:text-slate-200">
                        {w.nome}
                      </a>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {formatarPreco(w)}
                        </span>
                        <button type="button" onClick={() => alternarWatchlist(w)} aria-label="Remover do acompanhamento" className="text-slate-400 hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {resultadosMLOrdenados.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <a href={p.link} target="_blank" rel="noopener noreferrer" title="Abrir anúncio real">
                    <ImagemProduto src={p.imagem} alt={p.nome} className="mb-2 h-24 w-full rounded-lg" />
                  </a>
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-100" title={p.nome}>
                    {p.nome}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    {formatarPreco(p)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-teal-600 dark:text-teal-400">
                    {p.vendidos > 0 ? `${p.vendidos.toLocaleString('pt-BR')} vendidos` : p.marca}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-400">
                    Fonte: Mercado Livre (busca) • Produto da loja: não{p.consultadoEm ? ` • ${new Date(p.consultadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => importarML(p)}
                      disabled={importandoId === p.id}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      <Download className="h-3.5 w-3.5" /> {importandoId === p.id ? 'Importando...' : 'Importar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarWatchlist(p)}
                      title={watchlist.some(w => w.id === p.id) ? 'Parar de acompanhar' : 'Acompanhar preço'}
                      aria-label={watchlist.some(w => w.id === p.id) ? 'Parar de acompanhar' : 'Acompanhar preço'}
                      className={`flex items-center justify-center rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${watchlist.some(w => w.id === p.id) ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500 dark:border-slate-700'}`}
                    >
                      ★
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {analiseML && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                {analiseML.ok ? (
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Análise Gemini — cards reais</p>
                    <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{analiseML.analysis}</p>
                    {analiseML.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recomendações</p>
                        <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300">
                          {analiseML.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {analiseML.risks?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Riscos</p>
                        <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300">
                          {analiseML.risks.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">
                      Margem indisponível sem custo real • Confiança {Math.round((analiseML.confidence ?? 0) * 100)}% •
                      Qualidade {analiseML.dataQuality} • {analiseML.generatedAt ? new Date(analiseML.generatedAt).toLocaleString('pt-BR') : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{analiseML.message || 'Sem análise no momento.'}</p>
                )}
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Seções mock removidas — use a busca "Mercado Livre ao vivo" acima para dados reais */}
    </div>
  );
}
