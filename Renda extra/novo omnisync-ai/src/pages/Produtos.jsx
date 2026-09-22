import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus, Search } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv, formatCurrency, formatNumber } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { AcessoRestrito } from '../components/ui/AcessoRestrito';
import { useAuth } from '../context/AuthContext';
import { podeAcessar } from '../lib/permissoes';
import { ProdutoIntel } from './ProdutoIntel';
import { RadarMercado } from './RadarMercado';
import { Estoque } from './Estoque';
import { Publicacoes } from './Publicacoes';

const STATUS_CONFIG = {
  normal: { label: 'Normal', variant: 'teal' },
  baixo: { label: 'Baixo', variant: 'amber' },
  critico: { label: 'Crítico', variant: 'red' },
  excesso: { label: 'Excesso', variant: 'sky' },
};

const ACOES_IA = ['Desconto', 'Kit', 'Campanha', 'Liquidar'];

function CatalogoProdutos() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ status: 'todos', categoria: 'todas' });
  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState([]);
  const [kpisState, setKpisState] = useState({
    totalItens: 0,
    valorTotal: 0,
    itensBaixoEstoque: 0,
    produtosCriticos: 0
  });

  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    try {
      // Busca a lista completa uma vez; busca/filtros são aplicados localmente em `filtrados`.
      const [produtosData, kpisData] = await Promise.all([
        api.getProdutos({ limit: 100 }),
        api.getKpisProdutos(),
      ]);
      setProdutos(produtosData.produtos || []);
      setKpisState(kpisData);
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
      toast('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  const k = kpisState;
  const dadosKpis = [
    { label: 'Total de Itens', valor: k.totalItens, destaque: true },
    { label: 'Valor Total em Estoque', valor: `R$ ${formatNumber(k.valorTotal)}`, destaque: true },
    { label: 'Itens com Estoque Baixo', valor: k.itensBaixoEstoque, destaque: true },
    { label: 'Produtos Críticos', valor: k.produtosCriticos, destaque: false },
  ];

  const [selecionados, setSelecionados] = useState([]);
  const [pill, setPill] = useState('Todos');
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: '', sku: '', categoria: '', preco: '', estoque: '', minimo: '', fornecedor: '' });

  const PILLS = ['Todos', 'ativo', 'baixo', 'critico', 'esgotado'];

  const filtrados = produtos.filter(p => {
    if (busca && !`${p.nome} ${p.sku}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (pill === 'esgotado') {
      if (Number(p.estoque ?? p.atual ?? 0) > 0) return false;
    } else if (pill !== 'Todos' && (p.status || 'normal') !== pill) return false;
    if (filtros.status !== 'todos' && p.status !== filtros.status) return false;
    if (filtros.categoria !== 'todas' && p.categoria !== filtros.categoria) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const paginaAtual = filtrados.slice((page - 1) * 10, page * 10);

  const alternarSelecao = id => {
    setSelecionados(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));
  };

  const selecionarPagina = () => {
    const ids = paginaAtual.map(p => p.id);
    setSelecionados(prev => [...new Set([...prev, ...ids])]);
  };

  const limparSelecao = () => setSelecionados([]);

  const acaoEmMassa = async tipo => {
    if (selecionados.length === 0) {
      toast('Selecione ao menos um produto');
      return;
    }
    try {
      if (tipo === 'excluir') {
        await Promise.all(selecionados.map(id => api.removerProduto(id)));
        setProdutos(prev => prev.filter(p => !selecionados.includes(p.id)));
        toast(`${selecionados.length} produto(s) excluído(s)`);
      } else {
        const novoStatus = tipo === 'ativar' ? 'ativo' : 'inativo';
        await Promise.all(selecionados.map(id => api.atualizarProduto(id, { status: novoStatus })));
        setProdutos(prev => prev.map(p => (selecionados.includes(p.id) ? { ...p, status: novoStatus } : p)));
        toast(`${selecionados.length} produto(s) atualizado(s) para ${novoStatus}`);
      }
      limparSelecao();
    } catch (e) {
      console.error('Erro na ação em massa:', e);
      toast('Erro ao aplicar ação em massa');
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setFiltros({ status: 'todos', categoria: 'todas' });
    setPill('Todos');
    setPage(1);
  };

  // Ações de IA viram tarefas reais na fila do backend (visíveis na Central de IA).
  const dispararAcaoIA = async acao => {
    const mapa = { Desconto: 'price.update', Kit: 'sales.generate_report', Campanha: 'social.schedule_post', Liquidar: 'stock.alert_rupture' };
    try {
      const r = await api.criarTarefa({ agentId: 'PriceWatch', action: mapa[acao] || 'ia.run_agent', entityType: 'produto', payload: { acao, selecionados } });
      toast(`Ação "${acao}" enfileirada${r.taskId ? ` (${r.taskId})` : ''}`);
    } catch (e) {
      console.error('Erro ao enfileirar ação:', e);
      toast('Erro ao enfileirar ação de IA');
    }
  };

  const setCampo = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }));

  // Cadastro real via POST /api/produtos (validação + refresh da lista e KPIs).
  const salvarNovoProduto = async () => {
    const nome = form.nome.trim();
    const sku = form.sku.trim().toUpperCase();
    const categoria = form.categoria.trim();
    if (!nome || !sku || !categoria) {
      toast('Preencha nome, SKU e categoria');
      return;
    }
    setSalvando(true);
    try {
      await api.criarProduto({
        nome,
        sku,
        categoria,
        preco: Number(form.preco) || 0,
        estoque: Number(form.estoque) || 0,
        minimo: Number(form.minimo) || 0,
        status: 'ativo',
        fornecedor: form.fornecedor.trim(),
      });
      toast(`Produto "${nome}" cadastrado`);
      setModalNovo(false);
      setForm({ nome: '', sku: '', categoria: '', preco: '', estoque: '', minimo: '', fornecedor: '' });
      await carregarProdutos();
    } catch (e) {
      console.error('Erro ao cadastrar produto:', e);
      toast(e.message || 'Erro ao cadastrar produto');
    } finally {
      setSalvando(false);
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
        <p className="text-sm text-slate-500">Controle de catálogo, SKU e categorias</p>
        <div className="flex gap-2">
        <Button variant="secondary" onClick={() => {
          exportarCsv('produtos-omnisync.csv', [
            { titulo: 'SKU', chave: 'sku' },
            { titulo: 'Nome', chave: 'nome' },
            { titulo: 'Categoria', chave: 'categoria' },
            { titulo: 'Preço', chave: 'preco' },
            { titulo: 'Estoque', chave: 'estoque' },
            { titulo: 'Status', chave: 'status' },
          ], filtrados);
          toast(`${filtrados.length} produto(s) exportados em CSV`);
        }}>
          <Download className="h-4 w-4" /> Exportar relatório
        </Button>
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="h-4 w-4" /> Novo produto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Select label="Status" value={filtros.status} onChange={v => setFiltros(f => ({ ...f, status: v }))} options={[{ value: 'todos', label: 'Todos' }, { value: 'normal', label: 'Normal' }, { value: 'baixo', label: 'Baixo' }, { value: 'critico', label: 'Crítico' }, { value: 'excesso', label: 'Excesso' }]} />
          <Select label="Categoria" value={filtros.categoria} onChange={v => setFiltros(f => ({ ...f, categoria: v }))} options={[{ value: 'todas', label: 'Todas' }, { value: 'eletronicos', label: 'Eletrônicos' }, { value: 'moveis', label: 'Móveis' }, { value: 'alimentos', label: 'Alimentos' }]} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Produtos</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Buscar por nome ou SKU..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              type="text"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {PILLS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => { setPill(s); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${pill === s ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {s === 'Todos' ? 'Todos' : s === 'esgotado' ? 'Esgotado' : STATUS_CONFIG[s]?.label ?? s}
          </button>
        ))}
      </div>

      {selecionados.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm dark:border-primary-500/30 dark:bg-primary-500/10">
          <span className="font-medium text-slate-700 dark:text-slate-200">{selecionados.length} selecionado(s)</span>
          <button type="button" onClick={() => acaoEmMassa('ativar')} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">
            Ativar
          </button>
          <button type="button" onClick={() => acaoEmMassa('inativar')} className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
            Inativar
          </button>
          <button type="button" onClick={() => acaoEmMassa('excluir')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
            Excluir
          </button>
          <button type="button" onClick={limparSelecao} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">
            Limpar seleção
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <button type="button" onClick={selecionarPagina} className="text-xs font-medium text-primary-600 hover:underline">
              Selecionar página
            </button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">
                    <span className="sr-only">Selecionar</span>
                  </th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 text-right font-medium">Preço</th>
                  <th className="px-5 py-3 text-right font-medium">Estoque</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-3">
                      <Skeleton className="h-12 rounded-lg" />
                    </td>
                  </tr>
                ) : paginaAtual.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Nenhum produto encontrado</p>
                      <p className="mt-1 text-xs text-slate-500">Ajuste os filtros ou cadastre o primeiro item do catálogo.</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <button type="button" onClick={limparFiltros} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300">
                          Limpar filtros
                        </button>
                        <button type="button" onClick={() => setModalNovo(true)} className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                          Cadastrar novo produto
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : paginaAtual.map(p => {
                  const s = STATUS_CONFIG[p.status] || { label: p.status ?? '—', variant: 'gray' };
                  const estoqueAtual = Number(p.estoque ?? p.atual ?? 0);
                  const marcado = selecionados.includes(p.id);
                  return (
                    <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${marcado ? 'bg-primary-50/60 dark:bg-primary-500/5' : ''}`}>
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarSelecao(p.id)}
                          aria-label={`Selecionar ${p.nome}`}
                          className="h-4 w-4 accent-primary-600"
                        />
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{p.nome}</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{formatCurrency(p.preco ?? 0)}</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{estoqueAtual}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{p.categoria}</td>
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
              <CardTitle>Produtos por Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['normal', 'baixo', 'critico', 'excesso'].map(status => {
                const s = STATUS_CONFIG[status] || { label: status, variant: 'gray' };
                const qtd = filtrados.filter(p => (p.status || 'normal') === status).length;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{qtd} itens</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações IA Recomendadas</CardTitle>
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

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo produto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nome *" value={form.nome} onChange={setCampo('nome')} placeholder="Ex: MDF BP Carvalho 15mm" />
          <Input label="SKU *" value={form.sku} onChange={setCampo('sku')} placeholder="Ex: MDF-CAR-15" />
          <Input label="Categoria *" value={form.categoria} onChange={setCampo('categoria')} placeholder="Ex: Marcenaria" />
          <Input label="Fornecedor" value={form.fornecedor} onChange={setCampo('fornecedor')} placeholder="Ex: Leo Madeiras" />
          <Input label="Preço (R$)" type="number" min="0" value={form.preco} onChange={setCampo('preco')} />
          <Input label="Estoque inicial" type="number" min="0" value={form.estoque} onChange={setCampo('estoque')} />
          <Input label="Estoque mínimo" type="number" min="0" value={form.minimo} onChange={setCampo('minimo')} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNovo(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarNovoProduto} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ============================================
// Produtos (piloto da navegação por abas) —
// Catálogo, Inteligência, Radar, Estoque e
// Publicações como abas com RBAC por aba.
// ============================================

const ABAS_PRODUTOS = [
  { id: 'catalogo', label: 'Catálogo', modulo: 'produtos' },
  { id: 'inteligencia', label: 'Inteligência', modulo: 'produto-intel' },
  { id: 'radar', label: 'Radar', modulo: 'radar-mercado' },
  { id: 'estoque', label: 'Estoque', modulo: 'estoque' },
  { id: 'publicacoes', label: 'Publicações', modulo: 'publicacoes' },
];

export function Produtos() {
  const { user } = useAuth();
  const [aba, setAba] = useState('catalogo');

  const abasVisiveis = ABAS_PRODUTOS.filter(a => podeAcessar(user?.perfil, a.modulo));
  const abaAtiva = abasVisiveis.some(a => a.id === aba) ? aba : abasVisiveis[0]?.id || 'catalogo';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Produtos</h1>
        <p className="text-sm text-slate-500">Catálogo, inteligência, radar, estoque e publicações</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Seções de produtos">
        {abasVisiveis.map(a => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={abaAtiva === a.id}
            onClick={() => setAba(a.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              abaAtiva === a.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {abaAtiva === 'catalogo' && <CatalogoProdutos />}
      {abaAtiva === 'inteligencia' && <ProdutoIntel />}
      {abaAtiva === 'radar' && <RadarMercado />}
      {abaAtiva === 'estoque' && <Estoque />}
      {abaAtiva === 'publicacoes' && <Publicacoes />}
      {abasVisiveis.length === 0 && <AcessoRestrito />}
    </div>
  );
}