import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Plus, Search, Palette, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';

// Barra de progresso local reutilizada nos cartões de engajamento.
function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Marketing() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ campanha: 'todas', canal: 'todas' });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({
    campanhasAtivas: 0,
    reachTotal: 0,
    engajamentoMedio: 0,
    conversoes: 0
  });
  const [publicacoes, setPublicacoes] = useState([]);
  const [produtosOferta, setProdutosOferta] = useState([]);
  const [cupons, setCupons] = useState([]);
  const [modalCupom, setModalCupom] = useState(false);
  const [formCupom, setFormCupom] = useState({ codigo: '', tipo: 'percentual', valor: '' });

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, publicacoesData, produtosData, cuponsData] = await Promise.all([
        api.getKpisMarketing(),
        api.getPublicacoes(),
        api.getProdutos({ limit: 100 }),
        api.getCupons(),
      ]);
      setKpisState(kpisData);
      setPublicacoes(Array.isArray(publicacoesData) ? publicacoesData : (publicacoesData.publicacoes || []));
      setProdutosOferta(produtosData.produtos || []);
      setCupons(Array.isArray(cuponsData) ? cuponsData : []);
    } catch (e) {
      console.error('Erro ao carregar dados de marketing:', e);
      toast('Erro ao carregar dados de marketing');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Ofertas da semana: cada cupom ativo aplicado aos produtos = preço promocional real.
  const cuponsAtivos = cupons.filter(c => c.ativo);
  const ofertas = cuponsAtivos.flatMap(cupom => produtosOferta.slice(0, 6).map(p => {
    const preco = Number(p.preco) || 0;
    const desconto = cupom.tipo === 'percentual' ? preco * (Number(cupom.valor) / 100) : Math.min(Number(cupom.valor) || 0, preco);
    return {
      id: `${p.id}-${cupom.id}`,
      produto: p.nome,
      sku: p.sku,
      cupom: cupom.codigo,
      de: preco,
      por: Math.max(0, Math.round((preco - desconto) * 100) / 100),
      desconto,
    };
  })).sort((a, b) => b.desconto - a.desconto).slice(0, 4);

  const salvarCupom = async () => {
    const codigo = formCupom.codigo.trim().toUpperCase();
    if (!codigo || !(Number(formCupom.valor) > 0)) {
      toast('Preencha código e um valor válido');
      return;
    }
    try {
      const novo = await api.criarCupom({ codigo, tipo: formCupom.tipo, valor: Number(formCupom.valor) });
      setCupons(prev => [...prev, novo]);
      setFormCupom({ codigo: '', tipo: 'percentual', valor: '' });
      setModalCupom(false);
      toast(`Cupom "${codigo}" criado`);
    } catch (e) {
      console.error('Erro ao criar cupom:', e);
      toast(e.message || 'Erro ao criar cupom');
    }
  };

  const alternarCupom = async c => {
    try {
      const atualizado = await api.atualizarCupom(c.id, { ativo: !c.ativo });
      setCupons(prev => prev.map(x => (x.id === c.id ? { ...x, ativo: atualizado.ativo ?? !c.ativo } : x)));
      toast(`Cupom "${c.codigo}" ${!c.ativo ? 'ativado' : 'pausado'}`);
    } catch (e) {
      console.error('Erro ao atualizar cupom:', e);
      toast('Erro ao atualizar cupom');
    }
  };

  const excluirCupom = async c => {
    try {
      await api.removerCupom(c.id);
      setCupons(prev => prev.filter(x => x.id !== c.id));
      toast(`Cupom "${c.codigo}" excluído`);
    } catch (e) {
      console.error('Erro ao excluir cupom:', e);
      toast('Erro ao excluir cupom');
    }
  };

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const k = kpisState;
  const dadosKpis = [
    { label: 'Campanhas ativas', valor: k.campanhasAtivas, destaque: true },
    { label: 'Alcance total', valor: `R$ ${k.reachTotal.toLocaleString('pt-BR')}`, destaque: true },
    { label: 'Engajamento médio', valor: `${k.engajamentoMedio}%`, destaque: false },
    { label: 'Conversões', valor: k.conversoes, destaque: true },
  ];

  const filtrados = publicacoes.filter(p => {
    if (busca && !`${p.titulo} ${p.marca}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.campanha !== 'todas' && p.campanha !== filtros.campanha) return false;
    if (filtros.canal !== 'todas' && p.canal !== filtros.canal) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const paginaAtual = filtrados.slice((page - 1) * 10, page * 10);

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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Módulo de Marketing</h1>
          <p className="text-sm text-slate-500">Gerenciamento de campanhas, conteúdo e análises</p>
        </div>
        <Button variant="secondary" onClick={() => {
          exportarCsv('marketing-omnisync.csv', [
            { titulo: 'Título', chave: 'titulo' },
            { titulo: 'Canal', chave: 'canal' },
            { titulo: 'Status', chave: 'status' },
            { titulo: 'Publicado em', chave: 'dataPublicacao' },
          ], filtrados);
          toast(`${filtrados.length} item(ns) exportados em CSV`);
        }}>
          <Download className="h-4 w-4" /> Exportar relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ofertas da semana</CardTitle>
          <p className="text-xs text-slate-500">Preço promocional real: produto do catálogo × cupom ativo</p>
        </CardHeader>
        {loading ? (
          <div className="p-5"><Skeleton className="h-24 rounded-lg" /></div>
        ) : ofertas.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Ative um cupom abaixo para gerar ofertas automaticamente.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 pt-0 sm:grid-cols-2 lg:grid-cols-4">
            {ofertas.map(o => (
              <div key={o.id} className="rounded-xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={o.produto}>{o.produto}</p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{o.sku} • {o.cupom}</p>
                <p className="mt-2 text-xs text-slate-400 line-through">R$ {o.de.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xl font-bold text-teal-600 dark:text-teal-400">R$ {o.por.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="mt-1 text-xs font-medium text-red-500">−R$ {o.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cupons de desconto</CardTitle>
          <Button size="sm" onClick={() => setModalCupom(true)}>
            <Plus className="h-4 w-4" /> Novo cupom
          </Button>
        </CardHeader>
        <div className="divide-y divide-slate-100 px-5 pb-4 dark:divide-slate-800">
          {cupons.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Nenhum cupom cadastrado.</p>
          ) : (
            cupons.map(c => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="rounded-md bg-primary-50 px-2.5 py-1 font-mono text-xs font-bold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                  {c.codigo}
                </span>
                <span className="text-xs text-slate-500">
                  {c.tipo === 'percentual' ? `${c.valor}% off` : `R$ ${Number(c.valor).toLocaleString('pt-BR')} off`}
                  {c.validade ? ` • até ${c.validade}` : ''}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <Badge variant={c.ativo ? 'teal' : 'slate'}>{c.ativo ? 'Ativo' : 'Pausado'}</Badge>
                  <button type="button" onClick={() => alternarCupom(c)} className="text-xs font-medium text-primary-600 hover:underline">
                    {c.ativo ? 'Pausar' : 'Ativar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => excluirCupom(c)}
                    aria-label={`Excluir ${c.codigo}`}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal open={modalCupom} onClose={() => setModalCupom(false)} title="Novo cupom">
        <div className="space-y-3">
          <Input label="Código *" value={formCupom.codigo} onChange={e => setFormCupom(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: BEMVINDO10" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={formCupom.tipo} onChange={v => setFormCupom(f => ({ ...f, tipo: v }))} options={[{ value: 'percentual', label: '% Percentual' }, { value: 'valor', label: 'R$ Valor fixo' }]} />
            <Input label="Desconto *" type="number" min="0" value={formCupom.valor} onChange={e => setFormCupom(f => ({ ...f, valor: e.target.value }))} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalCupom(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarCupom}>
            Criar cupom
          </Button>
        </div>
      </Modal>

      <Card>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Select label="Campanha" value={filtros.campanha} onChange={v => setFiltros(f => ({ ...f, campanha: v }))} options={[{ value: 'todas', label: 'Todas' }, { value: 'lancamento', label: 'Lançamento' }, { value: 'promocional', label: 'Promocional' }, { value: 'sazonal', label: 'Sazonal' }]} />
          <Select label="Canal" value={filtros.canal} onChange={v => setFiltros(f => ({ ...f, canal: v }))} options={[{ value: 'todas', label: 'Todas' }, { value: 'instagram', label: 'Instagram' }, { value: 'facebook', label: 'Facebook' }, { value: 'twitter', label: 'Twitter' }]} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Melhor horário para postar (heurística por canal)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { canal: 'Instagram', horario: '19h–21h (pico de audiência)' },
              { canal: 'TikTok', horario: '12h e 20h (pico de engajamento)' },
              { canal: 'Facebook', horario: '13h–15h (intervalo comercial)' },
              { canal: 'WhatsApp', horario: '10h e 16h (leitura direta)' },
            ].map(h => (
              <div key={h.canal} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                <span className="font-medium text-slate-700 dark:text-slate-200">{h.canal}</span>
                <span className="text-slate-500">{h.horario}</span>
              </div>
            ))}
            <p className="text-[11px] text-slate-400">Heurística editorial padrão; calibragem com dados reais entra com a API de analytics.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hashtags por concorrência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { nivel: 'Alta', tags: '#ofertas #promocao #achadinhos' },
              { nivel: 'Média', tags: '#moveisplanejados #climatizacao #marcenaria' },
              { nivel: 'Cauda longa', tags: '#mdfcarvalho15mm #ar12kinverter #feitoparamim' },
            ].map(g => (
              <div key={g.nivel} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">{g.nivel}</p>
                  <p className="text-slate-500">{g.tags}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const feito = t => toast(t);
                    if (navigator.clipboard?.writeText) {
                      navigator.clipboard.writeText(g.tags).then(() => feito('Hashtags copiadas')).catch(() => feito(g.tags));
                    } else {
                      feito(g.tags);
                    }
                  }}
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Copiar
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>Campanhas Recentes</CardTitle>
            <Link to="/calendario" className="text-xs font-medium text-primary-600 hover:underline">
              Ver no calendário editorial →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Buscar campanha ou conteúdo..."
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
            <CardTitle>Publicações por Canal</CardTitle>
          </CardHeader>
          <div className="h-96 overflow-y-auto">
            {loading ? (
              <Skeleton className="h-48 rounded-lg" />
            ) : paginaAtual.map(p => (
              <div key={p.id} className="p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Palette className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{p.titulo}</span>
                    <span className="text-xs text-slate-500">• {p.canal}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  <p>Status: {p.status}</p>
                  <p>Publicado: {p.dataPublicacao}</p>
                </div>
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
              <CardTitle>Engajamento por Campanha</CardTitle>
            </CardHeader>
            <CardContent className="h-64 space-y-4">
              {[
                { campanha: 'lancamento', pct: 62 },
                { campanha: 'promocional', pct: 48 },
                { campanha: 'sazonal', pct: 55 },
              ].map(({ campanha, pct }) => (
                <div key={campanha} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{campanha}</span>
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
              <CardTitle>Taxa de Conversão</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <div className="h-full relative">
                <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 rounded-full" style={{ width: '50%', opacity: 0.5 }} />
                <div className="absolute right-0 top-0 bottom-0 w-3 bg-emerald-500 rounded-full" style={{ width: '20%' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}