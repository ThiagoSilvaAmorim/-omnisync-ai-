import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, Target, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ehDiretor } from '../lib/permissoes';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { AcessoRestrito } from '../components/ui/AcessoRestrito';

// ============================================
// Metas — metas do negócio com progresso
// (exclusivo do diretor). Dados reais do
// backend (/api/metas); sem backend, lista
// vazia: nada é inventado.
// ============================================

const BRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarMeta(m) {
  if (m.tipo === 'currency') return BRL(m.atual);
  if (m.tipo === 'percent') return `${m.atual.toFixed(1)}%`;
  return m.atual.toLocaleString('pt-BR');
}

export function Metas() {
  const { user } = useAuth();
  const toast = useToast();

  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: '', valor: '' });
  const [setor, setSetor] = useState('Todos');
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await api.getMetas();
        if (ativo) setLista(Array.isArray(dados) ? dados : []);
      } catch {
        if (ativo) setLista([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  // Dias úteis restantes no mês (para projeção run-rate).
  const uteisRestantes = useMemo(() => {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    let uteis = 0;
    for (let d = agora.getDate(); d <= diasNoMes; d++) {
      const dia = new Date(ano, mes, d).getDay();
      if (dia !== 0 && dia !== 6) uteis += 1;
    }
    return uteis;
  }, []);

  const setores = useMemo(() => ['Todos', ...new Set(lista.map(m => m.setor || 'Geral'))], [lista]);
  const visiveis = lista.filter(m => setor === 'Todos' || (m.setor || 'Geral') === setor);

  // Projeção de fechamento: ritmo diário atual × dias úteis restantes.
  const projecao = m => {
    const diasDecorridos = Math.max(1, 22 - uteisRestantes);
    const ritmo = m.atual / diasDecorridos;
    return Math.round(ritmo * 22 * 10) / 10;
  };

  if (!ehDiretor(user)) return <AcessoRestrito />;

  const adicionar = async () => {
    if (!form.nome.trim() || !Number(form.valor) || Number(form.valor) <= 0) {
      toast('Preencha o nome e um valor válido');
      return;
    }
    try {
      const r = await api.criarMeta({ nome: form.nome.trim(), meta: Number(form.valor), tipo: 'number' });
      const nova = r?.meta || r;
      setLista(prev => [...prev, nova]);
      toast(`Meta "${form.nome}" criada`);
      setForm({ nome: '', valor: '' });
      setModal(false);
    } catch (e) {
      toast(`Erro ao criar meta: ${e.message}`);
    }
  };

  const statusMeta = pct => (pct >= 100 ? { label: 'Atingida', variant: 'teal' } : pct >= 70 ? { label: 'No caminho', variant: 'indigo' } : pct >= 40 ? { label: 'Em andamento', variant: 'amber' } : { label: 'Atrasada', variant: 'red' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Metas</h1>
          <p className="text-sm text-slate-500">Defina metas e acompanhe o progresso do negócio</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Nova meta
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {setores.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSetor(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${setor === s ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-sm text-slate-500">Carregando metas reais…</p>
      ) : visiveis.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma meta cadastrada. Crie a primeira com “Nova meta”.</p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visiveis.map(m => {
          const pct = Math.min(Math.round((m.atual / m.meta) * 100), 100);
          const status = statusMeta(pct);
          const fechamento = projecao(m);
          const abaixo = fechamento < m.meta;
          // Sparkline de projeção linear (atual → projeção de fechamento), não histórico.
          const pontos = [m.atual * 0.4, m.atual * 0.7, m.atual, fechamento].map(v => Math.max(0, v));
          const max = Math.max(m.meta, ...pontos, 1);
          const linha = pontos.map((v, i) => `${(i / (pontos.length - 1)) * 100},${28 - (v / max) * 24}`).join(' ');
          return (
            <Card key={m.id}>
              <CardHeader>
                <button type="button" onClick={() => setDetalhe(m)} className="flex items-center gap-2 text-left" title="Abrir análise detalhada">
                  <Target className="h-4 w-4 text-primary-500" />
                  <CardTitle>{m.nome}</CardTitle>
                </button>
                <Badge variant={status.variant}>{status.label}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                    {m.tipo === 'currency' ? BRL(m.atual) : m.tipo === 'percent' ? `${m.atual.toFixed(1)}%` : m.atual.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-slate-500">
                    meta: {m.tipo === 'currency' ? BRL(m.meta) : m.tipo === 'percent' ? `${m.meta}%` : m.meta.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      pct >= 100 ? 'bg-teal-500' : pct >= 70 ? 'bg-primary-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    Run-rate: fechará em <span className="font-semibold">{m.tipo === 'currency' ? BRL(fechamento) : fechamento.toLocaleString('pt-BR')}</span>
                    {abaixo ? ' — abaixo da meta' : ' — acima da meta'}
                  </p>
                  <p className="text-right text-xs text-slate-500">{pct}% concluído</p>
                </div>
                <svg viewBox="0 0 100 30" className="mt-2 h-8 w-full" role="img" aria-label="Projeção linear de fechamento">
                  <polyline points={linha} fill="none" stroke={abaixo ? '#f59e0b' : '#10b981'} strokeWidth="2" />
                </svg>
                {pct < 70 && (
                  <Link
                    to="/publicacoes"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Playbook IA: impulsionar na Publicações
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {detalhe && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Análise ${detalhe.nome}`}>
          <button type="button" aria-label="Fechar" onClick={() => setDetalhe(null)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{detalhe.nome}</h2>
              <button type="button" onClick={() => setDetalhe(null)} aria-label="Fechar análise" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Atual / Meta</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{formatarMeta(detalhe)} / {detalhe.tipo === 'currency' ? BRL(detalhe.meta) : detalhe.meta}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Projeção de fechamento</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{detalhe.tipo === 'currency' ? BRL(projecao(detalhe)) : Number(projecao(detalhe)).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Quebra por canal</span>
                <span className="text-right font-medium text-slate-800 dark:text-slate-100">Consolidado (canais em breve)</span>
              </div>
              <p className="text-xs text-slate-400">Detalhamento por canal (Mercado Livre, Tiny, direto) entra com a integração de vendas por canal.</p>
            </div>
          </aside>
        </div>
      )}

      {/* Modal nova meta */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nova meta">
        <div className="space-y-3">
          <Input label="Nome da meta" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Faturamento do trimestre" />
          <Input label="Valor da meta" type="number" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="Ex: 50000" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModal(false)}>
            Cancelar
          </Button>
          <Button onClick={adicionar}>Criar meta</Button>
        </div>
      </Modal>
    </div>
  );
}
