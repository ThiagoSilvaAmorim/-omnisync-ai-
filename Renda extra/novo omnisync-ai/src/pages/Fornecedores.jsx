import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Mail, Phone, Plus, Radar, Star, Trash2, TrendingUp, Truck } from 'lucide-react';
import { fornecedores, produtos } from '../data/mockData';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { exportarCsv } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// Fornecedores — base de fornecedores com
// ranking ("em alta") e exclusão.
// ============================================

export function Fornecedores() {
  const toast = useToast();
  const navigate = useNavigate();
  const { ordens } = useApp();
  const [excluidos, setExcluidos] = useState([]);
  const [aba, setAba] = useState('carteira');
  const [excluindo, setExcluindo] = useState(null);
  const [candidatos, setCandidatos] = useState([]);
  const [varrendo, setVarrendo] = useState(false);
  const [importados, setImportados] = useState([]);
  const [modalNovo, setModalNovo] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [novos, setNovos] = useState([]);
  const [formFornecedor, setFormFornecedor] = useState({ nome: '', cnpj: '', categoria: '', contato: '', telefone: '', prazoEntrega: '', site: '', tipo: 'observacao', sincronizacao: 'pendente' });

  const lista = [...novos, ...fornecedores.filter(f => !excluidos.includes(f.id))];

  const setCampoFornecedor = campo => e => setFormFornecedor(f => ({ ...f, [campo]: e.target.value }));

  // Busca automática por CNPJ (BrasilAPI, pública e sem chave): ao digitar
  // os 14 dígitos, preenche razão social, e-mail, telefone e cidade.
  const buscarCnpjFornecedor = async () => {
    const numeros = formFornecedor.cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
      toast('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeros}`);
      if (!res.ok) throw new Error(`Receita retornou ${res.status}`);
      const d = await res.json();
      setFormFornecedor(f => ({
        ...f,
        nome: d.razao_social || d.nome_fantasia || f.nome,
        contato: d.email || f.contato,
        telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` : f.telefone,
      }));
      toast(`Dados puxados da Receita: ${d.razao_social || 'empresa encontrada'}`);
    } catch (e) {
      console.error('Erro na consulta CNPJ:', e);
      toast('Não foi possível consultar o CNPJ agora');
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const salvarFornecedor = () => {
    if (!formFornecedor.nome.trim()) {
      toast('Preencha ao menos o nome do fornecedor');
      return;
    }
    const novo = {
      id: `novo-${Date.now().toString(36)}`,
      nome: formFornecedor.nome.trim(),
      categoria: formFornecedor.categoria.trim() || 'Geral',
      contato: formFornecedor.contato.trim(),
      telefone: formFornecedor.telefone.trim(),
      prazoEntrega: Number(formFornecedor.prazoEntrega) || 7,
      avaliacao: 5.0,
      cnpj: formFornecedor.cnpj.replace(/\D/g, ''),
      site: (formFornecedor.site || '').trim(),
      tipo: formFornecedor.tipo,
      sincronizacao: formFornecedor.tipo === 'dropship' ? 'sincronizado' : 'pendente',
      produtosVinculados: [],
    };
    setNovos(prev => [novo, ...prev]);
    setFormFornecedor({ nome: '', cnpj: '', categoria: '', contato: '', telefone: '', prazoEntrega: '', site: '', tipo: 'observacao', sincronizacao: 'pendente' });
    setModalNovo(false);
    toast(`Fornecedor "${novo.nome}" cadastrado`);
  };

  // Ranking por total comprado (pedidos recebidos).
  const ranking = [...lista]
    .map(f => ({
      ...f,
      totalComprado: ordens.filter(o => o.fornecedor === f.nome && o.status === 'recebido').reduce((a, o) => a + o.total, 0),
    }))
    .sort((a, b) => b.totalComprado - a.totalComprado);

  const topFornecedorId = ranking.length > 0 ? ranking[0].id : null;

  const excluirFornecedor = () => {
    if (!excluindo) return;
    setExcluidos(prev => [...prev, excluindo.id]);
    toast(`Fornecedor "${excluindo.nome}" excluído`);
    setExcluindo(null);
  };

  // Radar IA: deriva fornecedores candidatos do catálogo real (sem inventar dados).
  const varrerMercado = async () => {
    setVarrendo(true);
    try {
      const data = await api.getProdutos({ limit: 100 });
      const mapa = new Map();
      (data.produtos || []).forEach(p => {
        if (!p.fornecedor) return;
        if (!mapa.has(p.fornecedor)) mapa.set(p.fornecedor, { nome: p.fornecedor, produtos: 0, categorias: new Set() });
        const item = mapa.get(p.fornecedor);
        item.produtos += 1;
        if (p.categoria) item.categorias.add(p.categoria);
      });
      const listaBase = [...mapa.values()].map(c => ({ ...c, categorias: [...c.categorias] }));
      setCandidatos(listaBase);
      toast(listaBase.length ? `${listaBase.length} fornecedor(es) mapeado(s) da base real` : 'Nenhum fornecedor na base');
    } catch (e) {
      console.error('Erro na varredura:', e);
      toast('Erro na varredura de fornecedores');
    } finally {
      setVarrendo(false);
    }
  };

  const exportarFornecedores = () => {
    exportarCsv('fornecedores-omnisync.csv', [
      { titulo: 'Nome', chave: 'nome' },
      { titulo: 'Categoria', chave: 'categoria' },
      { titulo: 'Contato', chave: 'contato' },
      { titulo: 'Telefone', chave: 'telefone' },
      { titulo: 'Prazo (dias)', chave: 'prazoEntrega' },
      { titulo: 'Avaliação', chave: 'avaliacao' },
      { titulo: 'Total comprado', chave: 'totalComprado' },
    ], ranking);
    toast('Fornecedores exportados em CSV');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Fornecedores</h1>
          <p className="text-sm text-slate-500">Base de fornecedores, ranking e reposição</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Dados locais de demonstração — integração automática com fornecedores ainda não configurada</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportarFornecedores}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="h-4 w-4" /> Novo fornecedor
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Abas de fornecedores">
        {['carteira', 'radar'].map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={aba === t}
            onClick={() => setAba(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${aba === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'carteira' ? 'Meus Fornecedores' : 'Radar de IA & Oportunidades'}
          </button>
        ))}
      </div>

      {aba === 'carteira' ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ranking.map((f, i) => {
          const fornecidos = produtos.filter(p => p.fornecedor === f.nome);
          return (
            <Card
              key={f.id}
              onClick={() => navigate(`/fornecedores/${f.id}`)}
              className="cursor-pointer transition-shadow hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 font-semibold text-white">
                    {f.nome.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle>{f.nome}</CardTitle>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant="slate">{f.categoria}</Badge>
                      {f.id === topFornecedorId && (
                        <Badge variant="purple">
                          <TrendingUp className="h-3 w-3" /> Em alta
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">#{i + 1}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" /> {f.contato}
                </p>
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {f.telefone}
                </p>
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Truck className="h-4 w-4 shrink-0 text-slate-400" /> Prazo: {f.prazoEntrega} dias
                </p>
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Star className="h-4 w-4 shrink-0 text-amber-400" /> {f.avaliacao.toFixed(1)}
                </p>
                {f.site && (
                  <a href={f.site.startsWith('http') ? f.site : `https://${f.site}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:underline">
                    {f.site.replace(/^https?:\/\//, '')} ↗
                  </a>
                )}
                <p className="flex flex-wrap gap-1.5">
                  <Badge variant={f.tipo === 'dropship' ? 'teal' : 'slate'}>{f.tipo === 'dropship' ? 'Dropship automático' : 'Observação'}</Badge>
                  <Badge variant={f.sincronizacao === 'sincronizado' ? 'teal' : 'amber'}>{f.sincronizacao === 'sincronizado' ? 'Sincronizado' : 'Pendente'}</Badge>
                </p>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  Total comprado: R$ {f.totalComprado.toLocaleString('pt-BR')}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">{fornecidos.length} produtos fornecidos</p>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setExcluindo(f);
                    }}
                    title="Excluir"
                    aria-label={`Excluir ${f.nome}`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      ) : (
      <div className="space-y-4">
        <Card>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Radar className={`h-4 w-4 ${varrendo ? 'animate-spin text-primary-600' : ''}`} />
              {varrendo ? 'IA escaneando o catálogo por fornecedores...' : 'A varredura mapeia fornecedores reais do seu catálogo.'}
            </div>
            <Button variant="secondary" onClick={varrerMercado} disabled={varrendo}>
              {varrendo ? 'Varrendo...' : 'Varrer mercado'}
            </Button>
          </div>
        </Card>
        {candidatos.length === 0 ? (
          <Card>
            <p className="p-8 text-center text-sm text-slate-500">
              {varrendo ? <Skeleton className="mx-auto h-12 max-w-md rounded-lg" /> : 'Clique em "Varrer mercado" para mapear fornecedores.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidatos.map(c => {
              const naBase = lista.some(f => f.nome === c.nome) || importados.includes(c.nome);
              return (
                <Card key={c.nome}>
                  <div className="space-y-2 p-5">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{c.nome}</p>
                    <p className="text-xs text-slate-500">{c.produtos} produto(s) • {c.categorias.join(', ') || '—'}</p>
                    <Button
                      variant="secondary"
                      disabled={naBase}
                      onClick={() => {
                        setImportados(prev => [...prev, c.nome]);
                        toast(`"${c.nome}" adicionado à base`);
                      }}
                      className="w-full"
                    >
                      {naBase ? 'Na base' : 'Adicionar à minha base'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      )}

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo fornecedor">
        <div className="space-y-3">
          <div>
            <Input label="CNPJ" value={formFornecedor.cnpj} onChange={setCampoFornecedor('cnpj')} placeholder="00.000.000/0000-00" />
            <button
              type="button"
              onClick={buscarCnpjFornecedor}
              disabled={buscandoCnpj}
              className="mt-1 text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
            >
              {buscandoCnpj ? 'Consultando Receita...' : 'Buscar dados automaticamente pelo CNPJ'}
            </button>
          </div>
          <Input label="Razão social / Nome" value={formFornecedor.nome} onChange={setCampoFornecedor('nome')} placeholder="Preenchido pelo CNPJ" />
          <Input label="Link do site" value={formFornecedor.site} onChange={setCampoFornecedor('site')} placeholder="https://..." />
          <Input label="Categoria" value={formFornecedor.categoria} onChange={setCampoFornecedor('categoria')} placeholder="Ex: Marcenaria" />
          <Input label="E-mail de contato" value={formFornecedor.contato} onChange={setCampoFornecedor('contato')} />
          <Input label="Telefone" value={formFornecedor.telefone} onChange={setCampoFornecedor('telefone')} />
          <Input label="Prazo de entrega (dias)" type="number" min="0" value={formFornecedor.prazoEntrega} onChange={setCampoFornecedor('prazoEntrega')} />
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-500">Tipo</span>
            <div className="flex gap-2">
              {['dropship', 'observacao'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormFornecedor(f => ({ ...f, tipo: t }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${formFornecedor.tipo === t ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500'}`}
                >
                  {t === 'dropship' ? 'Dropship automático' : 'Observação (só preço)'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNovo(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarFornecedor}>
            Cadastrar
          </Button>
        </div>
      </Modal>

      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir fornecedor">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir <span className="font-semibold">{excluindo?.nome}</span>? O histórico financeiro vinculado é preservado nos relatórios.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={excluirFornecedor}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
