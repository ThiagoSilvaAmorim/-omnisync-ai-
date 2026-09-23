import { useEffect, useState } from 'react';
import { Plus, Sparkles, Truck, X } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// Compras — ordens de compra reais do backend.
// Criação gera rascunho (aguardando_aprovacao);
// aprovação manual; nada é enviado ou pago aqui.
// ============================================

const STATUS_VARIANT = {
  aguardando_aprovacao: 'amber',
  compra_aprovada: 'teal',
  enviado_ao_fornecedor: 'sky',
  cancelado: 'red',
  erro: 'red',
};
const STATUS_LABEL = {
  aguardando_aprovacao: 'Aguardando aprovação',
  compra_aprovada: 'Aprovada',
  enviado_ao_fornecedor: 'Enviada ao fornecedor',
  cancelado: 'Cancelada',
  erro: 'Erro',
};
const FILTROS_STATUS = ['todas', 'aguardando_aprovacao', 'compra_aprovada', 'enviado_ao_fornecedor', 'cancelado'];

export function Compras() {
  const toast = useToast();

  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todas');
  const [rastreio, setRastreio] = useState(null);
  const [modalNova, setModalNova] = useState(false);
  const [formCompra, setFormCompra] = useState({ fornecedor: '', total: '' });
  const [reposicao, setReposicao] = useState([]);

  const carregar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const [ocs, prods] = await Promise.all([
        api.listarOrdensCompra(),
        api.getProdutos({ limit: 1000 }).catch(() => ({ produtos: [] })),
      ]);
      setOrdens(Array.isArray(ocs) ? ocs : []);
      const lista = prods?.produtos || prods || [];
      setReposicao(
        (Array.isArray(lista) ? lista : []).filter(p => Number(p.minimo) > 0 && Number(p.estoque ?? 0) <= Number(p.minimo))
      );
    } catch (e) {
      console.error('Erro ao carregar compras:', e);
      setErro('Erro ao carregar compras. Tente novamente.');
      setOrdens([]);
      setReposicao([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvarCompra = async () => {
    if (!formCompra.fornecedor.trim() || !(Number(formCompra.total) > 0)) {
      toast('Preencha fornecedor e um total válido');
      return;
    }
    try {
      await api.criarOrdemCompra({
        fornecedor: formCompra.fornecedor.trim(),
        total: Math.round(Number(formCompra.total) * 100) / 100,
      });
      setFormCompra({ fornecedor: '', total: '' });
      setModalNova(false);
      toast('Rascunho de ordem criado — aguardando aprovação');
      carregar();
    } catch (e) {
      toast(`Erro ao criar ordem: ${e.message}`);
    }
  };

  const aprovar = async (id) => {
    try {
      await api.aprovarOrdemCompra(id, 'manual');
      toast('Ordem aprovada');
      carregar();
    } catch (e) {
      toast(`Erro ao aprovar: ${e.message}`);
    }
  };

  const rejeitar = async (id) => {
    const motivo = typeof window !== 'undefined' && window.prompt
      ? window.prompt('Motivo da rejeição:')
      : null;
    if (motivo == null) return;
    if (motivo.trim().length < 3) {
      toast('Informe um motivo com ao menos 3 caracteres');
      return;
    }
    try {
      await api.rejeitarOrdemCompra(id, motivo.trim());
      toast('Ordem rejeitada');
      carregar();
    } catch (e) {
      toast(`Erro ao rejeitar: ${e.message}`);
    }
  };

  const gerarRascunhoReposicao = async (p) => {
    if (!p.fornecedor) {
      toast('Produto sem fornecedor vinculado');
      return;
    }
    const quantidade = Math.max(Number(p.minimo) * 2 - Number(p.estoque ?? 0), 10);
    try {
      await api.criarOrdemCompra({
        fornecedor: p.fornecedor,
        total: Math.round(Number(p.preco || 0) * quantidade * 100) / 100,
      });
      toast(`Rascunho criado para ${p.nome} — aguardando aprovação`);
      carregar();
    } catch (e) {
      toast(`Erro ao criar rascunho: ${e.message}`);
    }
  };

  const ordensFiltradas = ordens.filter(o => {
    if (busca && !`${o.id} ${o.fornecedor}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (statusFiltro !== 'todas' && o.status !== statusFiltro) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Compras</h1>
          <p className="text-sm text-slate-500">Ordens de compra reais com aprovação manual</p>
        </div>
        <Button onClick={() => setModalNova(true)}>
          <Plus className="h-4 w-4" /> Nova compra
        </Button>
      </div>

      <Modal open={modalNova} onClose={() => setModalNova(false)} title="Nova ordem de compra">
        <div className="space-y-3">
          <Input label="Fornecedor *" value={formCompra.fornecedor} onChange={e => setFormCompra(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Ex: Leo Madeiras" />
          <Input label="Total (R$) *" type="number" min="0" value={formCompra.total} onChange={e => setFormCompra(f => ({ ...f, total: e.target.value }))} />
          <p className="text-xs text-slate-500">Cria rascunho com status aguardando aprovação. Nada é enviado ou pago.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNova(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarCompra}>
            Criar rascunho
          </Button>
        </div>
      </Modal>

      {/* Reposição a partir do estoque real */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <CardTitle>Reposição necessária</CardTitle>
          </div>
          <Badge variant={reposicao.length > 0 ? 'amber' : 'teal'}>
            {reposicao.length} abaixo do mínimo
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-12 rounded-lg" />
          ) : reposicao.length === 0 ? (
            <p className="text-sm text-slate-500">Todos os produtos estão com estoque saudável. 🎉</p>
          ) : (
            <div className="space-y-3">
              {reposicao.map(p => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{p.nome}</p>
                    <p className="text-xs text-slate-500">
                      Estoque atual: {p.estoque} · Mínimo: {p.minimo} · Fornecedor: {p.fornecedor || '—'}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => gerarRascunhoReposicao(p)}>
                    <Truck className="h-4 w-4" /> Gerar rascunho
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ordens de compra reais */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens de compra</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar ordem ou fornecedor..."
              className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <select
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value)}
              aria-label="Filtrar por status"
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {FILTROS_STATUS.map(s => (
                <option key={s} value={s}>{s === 'todas' ? 'Todos os status' : (STATUS_LABEL[s] || s)}</option>
              ))}
            </select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Ordem</th>
                <th className="px-5 py-3 font-medium">Fornecedor</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Rastreio</th>
                <th className="px-5 py-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-3">
                    <Skeleton className="h-12 rounded-lg" />
                  </td>
                </tr>
              ) : erro ? (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-red-600">{erro}</td>
                </tr>
              ) : ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-6 text-center text-sm text-slate-500">
                    Nenhuma ordem de compra encontrada.
                  </td>
                </tr>
              ) : (
                ordensFiltradas.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setRastreio(c)}
                        title="Abrir detalhes"
                        className="font-mono text-xs text-primary-600 hover:underline"
                      >
                        {c.id}
                      </button>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{c.fornecedor}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.data}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      R$ {Number(c.total).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[c.status] ?? 'slate'}>{STATUS_LABEL[c.status] || c.status}</Badge></td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.rastreio || '—'}</td>
                    <td className="px-5 py-3">
                      {c.status === 'aguardando_aprovacao' ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => aprovar(c.id)}>
                            Aprovar
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => rejeitar(c.id)}>
                            Rejeitar
                          </Button>
                        </div>
                      ) : c.status === 'compra_aprovada' ? (
                        <Button size="sm" variant="secondary" onClick={() => marcarEnviada(c.id)}>
                          Marcar como enviado
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {rastreio && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Detalhe ${rastreio.id}`}>
          <button type="button" aria-label="Fechar" onClick={() => setRastreio(null)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{rastreio.id}</h2>
              <button type="button" onClick={() => setRastreio(null)} aria-label="Fechar detalhe" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="text-sm">
                <p className="text-slate-500">Fornecedor</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">{rastreio.fornecedor}</p>
              </div>
              <div className="text-sm">
                <p className="text-slate-500">Status</p>
                <p className="font-medium text-slate-800 dark:text-slate-100">{STATUS_LABEL[rastreio.status] || rastreio.status}</p>
              </div>
              <div className="text-sm">
                <p className="text-slate-500">Rastreio</p>
                <p className="font-mono font-medium text-slate-800 dark:text-slate-100">{rastreio.rastreio || 'Ainda sem código'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
                <p className="text-slate-500">Total</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">R$ {Number(rastreio.total).toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );

  async function marcarEnviada(id) {
    try {
      await api.marcarOcEnviada(id);
      toast('Ordem marcada como enviada ao fornecedor');
      carregarOrdens();
    } catch (e) {
      toast(`Erro ao marcar envio: ${e.message}`);
    }
  }

  async function carregarOrdens() {
    try {
      const lista = await api.listarOrdensCompra();
      setOrdens(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error('Erro ao recarregar ordens:', e);
    }
  }
}
