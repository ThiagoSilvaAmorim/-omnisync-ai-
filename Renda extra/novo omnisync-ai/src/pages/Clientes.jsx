import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Plus, Trash2, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../hooks/useToast';
import { exportarCsv } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// CRM — carteira de clientes/lojas + pipeline.
// ============================================

const TIPO_VARIANT = { loja: 'indigo', pessoa: 'sky' };
const STATUS_VARIANT = { ativo: 'teal', vip: 'purple', inativo: 'slate', novo: 'sky' };
const ESTAGIO_VARIANT = { lead: 'slate', qualificado: 'sky', proposta: 'amber', fechado: 'teal', perdido: 'red' };
const ESTAGIO_LABEL = { lead: 'Lead', qualificado: 'Qualificado', proposta: 'Proposta', fechado: 'Fechado', perdido: 'Perdido' };

const BRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function Clientes() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: clientes, loading } = useApi(() => api.getClientes());

  const [tab, setTab] = useState('carteira');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [excluidos, setExcluidos] = useState([]);
  const [excluindo, setExcluindo] = useState(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novos, setNovos] = useState([]);
  const [formCliente, setFormCliente] = useState({ nome: '', email: '', cidade: '', telefone: '' });

  const salvarCliente = async () => {
    if (!formCliente.nome.trim() || !formCliente.email.trim()) {
      toast('Preencha nome e e-mail');
      return;
    }
    setSalvando(true);
    try {
      const criado = await api.criarCliente({
        nome: formCliente.nome.trim(),
        email: formCliente.email.trim().toLowerCase(),
        telefone: formCliente.telefone.trim(),
        cidade: formCliente.cidade.trim(),
        status: 'novo',
      });
      setNovos(prev => [{ ...criado, tipo: 'pessoa', totalPedidos: 0, totalGasto: 0 }, ...prev]);
      setFormCliente({ nome: '', email: '', cidade: '', telefone: '' });
      setModalNovo(false);
      toast(`Cliente "${criado.nome}" cadastrado`);
    } catch (e) {
      console.error('Erro ao cadastrar cliente:', e);
      toast(e.message || 'Erro ao cadastrar cliente');
    } finally {
      setSalvando(false);
    }
  };

  // Negócios do pipeline (API real; arrastar e soltar persiste no backend).
  const [listaNegocios, setListaNegocios] = useState([]);
  const [estagios, setEstagios] = useState([]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const [negs, ests] = await Promise.all([
          api.getNegocios().catch(() => []),
          api.getEstagios().catch(() => []),
        ]);
        if (!ativo) return;
        setListaNegocios(Array.isArray(negs) ? negs : []);
        setEstagios(Array.isArray(ests) && ests.length > 0 ? ests : []);
      } catch (e) {
        console.error('Erro ao carregar pipeline:', e);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const moverNegocio = async (id, estagio) => {
    const anterior = listaNegocios.find(n => n.id === id)?.estagio;
    setListaNegocios(prev => prev.map(n => (n.id === id ? { ...n, estagio } : n)));
    try {
      await api.moverNegocio(id, estagio);
      toast(`Negócio movido para ${ESTAGIO_LABEL[estagio]}`);
    } catch (e) {
      setListaNegocios(prev => prev.map(n => (n.id === id ? { ...n, estagio: anterior } : n)));
      toast(`Erro ao mover negócio: ${e.message}`);
    }
  };

  const lista = [...novos, ...(clientes || [])].filter(c => !excluidos.includes(c.id));

  // Lojas "em alta" (top 2 por total gasto).
  const lojasEmAlta = [...lista]
    .filter(c => c.tipo === 'loja')
    .sort((a, b) => b.totalGasto - a.totalGasto)
    .slice(0, 2)
    .map(c => c.id);

  const excluirCliente = () => {
    if (!excluindo) return;
    setExcluidos(prev => [...prev, excluindo.id]);
    toast(`Cliente "${excluindo.nome}" excluído`);
    setExcluindo(null);
  };

  const exportarClientes = () => {
    exportarCsv('clientes-omnisync.csv', [
      { titulo: 'Nome', chave: 'nome' },
      { titulo: 'Tipo', chave: 'tipo' },
      { titulo: 'E-mail', chave: 'email' },
      { titulo: 'Cidade', chave: 'cidade' },
      { titulo: 'Pedidos', chave: 'totalPedidos' },
      { titulo: 'Total gasto', chave: 'totalGasto' },
      { titulo: 'Status', chave: 'status' },
    ], lista);
    toast('Clientes exportados em CSV');
  };

  const filtrados = lista.filter(c => {
    if (busca && !`${c.nome} ${c.email} ${c.cidade}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (tipo !== 'Todos' && c.tipo !== tipo) return false;
    if (status !== 'Todos' && c.status !== status) return false;
    return true;
  });

  const lojas = lista.filter(c => c.tipo === 'loja').length;
  const negociosAbertos = listaNegocios.filter(n => n.estagio !== 'fechado' && n.estagio !== 'perdido').length;
  const receitaPipeline = listaNegocios
    .filter(n => n.estagio !== 'fechado' && n.estagio !== 'perdido')
    .reduce((a, n) => a + n.valor, 0);

  const kpis = [
    { label: 'Clientes', valor: lista.length.toLocaleString('pt-BR') },
    { label: 'Lojas', valor: lojas.toLocaleString('pt-BR') },
    { label: 'Negócios abertos', valor: negociosAbertos.toLocaleString('pt-BR') },
    { label: 'Receita em pipeline', valor: BRL(receitaPipeline) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">CRM — Clientes</h1>
          <p className="text-sm text-slate-500">Carteira de clientes e lojas com pipeline de negócios</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportarClientes}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className="mt-2 text-xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{k.valor}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'carteira', label: 'Carteira' },
          { id: 'pipeline', label: 'Pipeline' },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'carteira' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail ou cidade..." />
            <Select value={tipo} onChange={setTipo} options={[{ value: 'Todos', label: 'Todos os tipos' }, { value: 'loja', label: 'Lojas' }, { value: 'pessoa', label: 'Pessoas' }]} />
            <Select value={status} onChange={setStatus} options={[{ value: 'Todos', label: 'Todos os status' }, { value: 'ativo', label: 'Ativo' }, { value: 'vip', label: 'VIP' }, { value: 'inativo', label: 'Inativo' }, { value: 'novo', label: 'Novo' }]} />
          </div>

          <Card>
            {loading ? (
              <div className="space-y-2 p-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : filtrados.length === 0 ? (
              <EmptyState title="Nenhum cliente encontrado" description="Ajuste os filtros." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                      <th className="px-5 py-3 font-medium">Cliente</th>
                      <th className="px-5 py-3 font-medium">Tipo</th>
                      <th className="px-5 py-3 font-medium">Cidade</th>
                      <th className="px-5 py-3 text-right font-medium">Pedidos</th>
                      <th className="px-5 py-3 text-right font-medium">Total gasto</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtrados.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/clientes/${c.id}`)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-5 py-3">
                        <p className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                          {c.nome}
                          {lojasEmAlta.includes(c.id) && (
                            <Badge variant="purple">
                              <TrendingUp className="h-3 w-3" /> Em alta
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </td>
                      <td className="px-5 py-3"><Badge variant={TIPO_VARIANT[c.tipo] ?? 'slate'}>{c.tipo}</Badge></td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.cidade}</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{c.totalPedidos}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">{BRL(c.totalGasto)}</td>
                      <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[c.status] ?? 'slate'}>{c.status}</Badge></td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setExcluindo(c);
                          }}
                          title="Excluir"
                          aria-label={`Excluir ${c.nome}`}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="overflow-x-auto pb-2">
        {estagios.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
            Pipeline indisponível no momento.
          </p>
        ) : (
        <div className="grid min-w-[880px] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {estagios.map(estagio => {
            const itens = listaNegocios.filter(n => n.estagio === estagio);
            const soma = itens.reduce((a, n) => a + (Number(n.valor) || 0), 0);
            return (
              <div
                key={estagio}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData('text/plain'));
                  moverNegocio(id, estagio);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ESTAGIO_LABEL[estagio]}</span>
                  <Badge variant={ESTAGIO_VARIANT[estagio]}>{itens.length}</Badge>
                </div>
                <p className="mb-3 text-xs font-semibold text-primary-600 dark:text-primary-400">{BRL(soma)}</p>
                <div className="space-y-2">
                  {itens.map(n => (
                    <div
                      key={n.id}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('text/plain', String(n.id))}
                      className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800"
                    >
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.titulo}</p>
                      <p className="text-xs text-slate-500">{n.cliente}</p>
                      <p className="mt-1 text-sm font-semibold text-primary-600 dark:text-primary-400">{BRL(n.valor)}</p>
                    </div>
                  ))}
                  {itens.length === 0 && <p className="text-xs text-slate-400">Solte um negócio aqui</p>}
                </div>
              </div>
            );
          })}
        </div>
        )}
        </div>
      )}

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo cliente">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nome *" value={formCliente.nome} onChange={e => setFormCliente(f => ({ ...f, nome: e.target.value }))} />
          <Input label="E-mail *" value={formCliente.email} onChange={e => setFormCliente(f => ({ ...f, email: e.target.value }))} />
          <Input label="Cidade" value={formCliente.cidade} onChange={e => setFormCliente(f => ({ ...f, cidade: e.target.value }))} />
          <Input label="Telefone" value={formCliente.telefone} onChange={e => setFormCliente(f => ({ ...f, telefone: e.target.value }))} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNovo(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarCliente} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir cliente">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir <span className="font-semibold">{excluindo?.nome}</span>? O histórico de pedidos é preservado.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={excluirCliente}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
