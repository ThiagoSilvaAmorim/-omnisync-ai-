import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Sparkles } from 'lucide-react';

// ============================================
// Laboratório de Oportunidades — sugestões de
// produtos com alto potencial (geradas por IA).
// ============================================

function ScoreRing({ score, color }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke={color} strokeDasharray={`${dash} ${circ}`} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-800 dark:text-slate-100">{score}</span>
    </div>
  );
}

export function LaboratorioOportunidades() {
  const { primaryColor } = useApp();
  const toast = useToast();
  const [importando, setImportando] = useState(null);
  const [categoria, setCategoria] = useState('Todas');
  const [ordem, setOrdem] = useState('score');
  const [ultimaVarredura, setUltimaVarredura] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  // Oportunidades reais: ruptura de estoque no catálogo (estoque < mínimo).
  // Score = profundidade da ruptura; potencial = valor em risco (preço × falta).
  const [oportunidades, setOportunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const varrer = async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const data = await api.getProdutos({ limit: 100 });
      const lista = (data?.produtos || [])
        .map(p => {
          const estoque = Number(p.estoque ?? p.atual) || 0;
          const minimo = Number(p.minimo) || 0;
          const preco = Number(p.preco) || 0;
          return { p, estoque, minimo, preco };
        })
        .filter(x => x.minimo > 0 && x.estoque < x.minimo)
        .map(x => {
          const falta = x.minimo - x.estoque;
          const score = x.estoque <= 0 ? 100 : Math.round((falta / x.minimo) * 100);
          return {
            id: `LAB-${x.p.id}`,
            produtoId: x.p.id,
            nome: `Repor: ${x.p.nome}`,
            produtoNome: x.p.nome,
            fornecedor: x.p.fornecedor || '',
            categoria: x.p.categoria || 'Geral',
            score,
            potencial: Math.round(x.preco * falta * 100) / 100,
            motivo: `Estoque ${x.estoque} < mínimo ${x.minimo}. Ruptura iminente.`,
          };
        });
      setOportunidades(lista);
      setUltimaVarredura(new Date().toLocaleString('pt-BR'));
      return lista;
    } catch {
      setOportunidades([]);
      return [];
    } finally {
      if (!silencioso) setCarregando(false);
    }
  };

  useEffect(() => { varrer(); }, []);

  const categorias = ['Todas', ...new Set(oportunidades.map(o => o.categoria))];

  const visiveis = oportunidades
    .filter(o => (categoria === 'Todas' ? true : o.categoria === categoria))
    .sort((a, b) => (ordem === 'potencial' ? b.potencial - a.potencial : b.score - a.score));

  const varrerAgora = async () => {
    const lista = await varrer();
    toast(lista.length === 0
      ? 'Varredura concluída: nenhum item em ruptura'
      : `Varredura concluída: ${lista.length} oportunidade(s) de reposição`);
  };
  // Contador removido: ordens usam id do backend (sem SKU local).

  const cor = score => (score >= 80 ? '#10b981' : score >= 75 ? primaryColor : '#f59e0b');

  // Importação real: gera ordem de compra em rascunho (exige aprovação
  // manual em Compras; nada é enviado ao fornecedor automaticamente).
  const importarParaBase = async o => {
    if (!o.fornecedor) {
      toast('Produto sem fornecedor: cadastre o fornecedor antes de gerar a ordem');
      return;
    }
    if (!(Number(o.potencial) > 0)) {
      toast('Sem valor em risco para gerar ordem de compra');
      return;
    }
    setImportando(o.id);
    try {
      const r = await api.criarOrdemCompra({ fornecedor: o.fornecedor, total: Number(o.potencial) });
      toast(`Ordem ${r?.ordem?.id || ''} criada em rascunho para "${o.produtoNome || o.nome}"`);
      api.emitirEvento('opportunity.detected', { oportunidade: o.nome, origem: 'laboratorio' }, 'MarketRadar').catch(() => {});
    } catch (e) {
      console.error('Erro ao gerar ordem de compra:', e);
      toast(`Erro ao gerar ordem: ${e.message}`);
    } finally {
      setImportando(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Laboratório de Oportunidades</h1>
          <p className="text-sm text-slate-500">Sugestões de produtos com alto potencial de crescimento</p>
        </div>
        <Button onClick={varrerAgora}>
          <Sparkles className="h-4 w-4" /> Analisar mercado
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {categorias.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoria(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${categoria === c ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {c}
          </button>
        ))}
        <select
          value={ordem}
          onChange={e => setOrdem(e.target.value)}
          aria-label="Ordenar por"
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="score">Maior score</option>
          <option value="potencial">Maior valor em risco (R$)</option>
        </select>
        <span className="ml-auto rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500 dark:bg-slate-800">
          Última varredura: {ultimaVarredura ?? 'sob demanda'}
        </span>
      </div>

      {carregando ? (
        <p className="text-sm text-slate-500">Varrendo o catálogo real…</p>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum item em ruptura. Oportunidades aparecem quando o estoque fica abaixo do mínimo.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map(o => (
          <Card key={o.id}>
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100">{o.nome}</p>
                <Badge variant="slate" className="mt-1">{o.categoria}</Badge>
              </div>
              <ScoreRing score={o.score} color={cor(o.score)} />
            </div>
            <button
              type="button"
              onClick={() => setDetalhe(o)}
              className="block w-full p-5 pt-3 text-left"
              title="Abrir detalhamento"
            >
              <p className="text-sm text-slate-500">{o.motivo}</p>
              <p className="mt-3 text-sm">
                <span className="text-slate-400">Potencial estimado: </span>
                <span className="font-semibold text-primary-600 dark:text-primary-400">
                  R$ {o.potencial.toLocaleString('pt-BR')} em risco
                </span>
              </p>
              <span className="mt-1 block text-xs text-primary-600 hover:underline">Ver detalhamento</span>
            </button>
            <div className="px-5 pb-5">
              <Button
                variant="secondary"
                onClick={() => importarParaBase(o)}
                disabled={importando === o.id}
                className="w-full"
              >
                {importando === o.id ? 'Gerando...' : 'Gerar ordem de compra'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {detalhe && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Detalhe da oportunidade">
          <button type="button" aria-label="Fechar" onClick={() => setDetalhe(null)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{detalhe.nome}</h2>
              <button type="button" onClick={() => setDetalhe(null)} aria-label="Fechar detalhe" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
              {[
                { label: 'Categoria', valor: detalhe.categoria },
                { label: 'Score', valor: `${detalhe.score}/100` },
                { label: 'Potencial', valor: `R$ ${Number(detalhe.potencial).toLocaleString('pt-BR')} em risco` },
                { label: 'Motivo', valor: detalhe.motivo },
                { label: 'Fornecedores', valor: 'Sugestões via Radar de Mercado e Fornecedores' },
                { label: 'Concorrência', valor: 'Avaliar na aba Mercado da Inteligência do Produto' },
              ].map(l => (
                <div key={l.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-slate-500">{l.label}</span>
                  <span className="text-right font-medium text-slate-800 dark:text-slate-100">{l.valor}</span>
                </div>
              ))}
              <Button onClick={() => { importarParaBase(detalhe); }} disabled={importando === detalhe.id} className="w-full">
                {importando === detalhe.id ? 'Gerando...' : 'Gerar ordem de compra'}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
