import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

// ============================================
// Central de B.O. — registro e resolução de
// problemas operacionais (aberto → em andamento
// → resolvido), com notificações. Dados reais
// do backend (/api/problemas); sem backend, a
// lista vem vazia: nada é inventado.
// ============================================

const PRIORIDADE = { alta: 'red', media: 'amber', baixa: 'slate' };
const STATUS = { aberto: 'red', 'em andamento': 'amber', resolvido: 'teal' };
const STATUS_LABEL = { aberto: 'Aberto', 'em andamento': 'Em andamento', resolvido: 'Resolvido' };

export function CentralBO() {
  const toast = useToast();
  const { addNotificacao } = useApp();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [prioridade, setPrioridade] = useState('Todas');
  const [detalhe, setDetalhe] = useState(null);
  const [notas, setNotas] = useState({});
  const [excluindo, setExcluindo] = useState(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [formBO, setFormBO] = useState({ titulo: '', descricao: '', categoria: 'Operacional', prioridade: 'media' });

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await api.getProblemas();
        if (ativo) setLista(Array.isArray(dados) ? dados : []);
      } catch {
        if (ativo) setLista([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const salvarBO = async () => {
    if (!formBO.titulo.trim()) {
      toast('Descreva o problema para abrir o B.O.');
      return;
    }
    try {
      const r = await api.criarProblema({
        id: `BO-${String(Date.now()).slice(-6)}`,
        titulo: formBO.titulo.trim(),
        descricao: formBO.descricao.trim() || 'Sem descrição',
        categoria: formBO.categoria,
        prioridade: formBO.prioridade,
      });
      const novo = r?.bo || r;
      setLista(prev => [novo, ...prev]);
      addNotificacao('Novo B.O. aberto', `${novo.id} — ${novo.titulo}`);
      setFormBO({ titulo: '', descricao: '', categoria: 'Operacional', prioridade: 'media' });
      setModalNovo(false);
      toast(`B.O. ${novo.id} aberto`);
    } catch (e) {
      toast(`Erro ao abrir B.O.: ${e.message}`);
    }
  };
  const [varrendo, setVarrendo] = useState(false);

  const filtrados = lista.filter(p => {
    if (filtro !== 'Todos' && p.status !== filtro) return false;
    if (prioridade !== 'Todas' && p.prioridade !== prioridade) return false;
    if (busca && !`${p.id} ${p.titulo} ${p.descricao}`.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const abertos = lista.filter(p => p.status === 'aberto').length;
  const andamento = lista.filter(p => p.status === 'em andamento').length;
  const resolvidos = lista.filter(p => p.status === 'resolvido').length;

  const avancar = async id => {
    const problema = lista.find(p => p.id === id);
    if (!problema) return;
    const fluxo = { aberto: 'em andamento', 'em andamento': 'resolvido' };
    const proximo = fluxo[problema.status];
    if (!proximo) return;
    try {
      const r = await api.avancarProblema(id);
      const atualizado = r?.bo || { ...problema, status: proximo };
      setLista(prev => prev.map(p => (p.id === id ? atualizado : p)));
      if (atualizado.status === 'resolvido') {
        addNotificacao('B.O. resolvido', `${id} — ${problema.titulo}`);
        toast(`B.O. ${id} resolvido`);
      } else {
        toast(`B.O. ${id} em andamento`);
      }
    } catch (e) {
      toast(`Erro ao avançar B.O.: ${e.message}`);
    }
  };

  // Varredura IA: abre B.O.s reais a partir de produtos com estoque abaixo do mínimo.
  const varreduraIA = async () => {
    setVarrendo(true);
    try {
      const data = await api.getProdutos({ limit: 100 });
      const criticos = (data.produtos || []).filter(p => {
        const atual = Number(p.estoque ?? p.atual ?? 0);
        const minimo = Number(p.minimo ?? 0);
        return minimo > 0 && atual <= minimo;
      });
      if (criticos.length === 0) {
        toast('Varredura concluída: nenhum item crítico');
        return;
      }
      const novos = criticos
        .filter(p => !lista.some(b => b.id === `BO-EST-${p.id}`))
        .map(p => ({
          id: `BO-EST-${p.id}`,
          titulo: `Ruptura iminente: ${p.nome}`,
          descricao: `Estoque ${p.estoque ?? p.atual} ≤ mínimo ${p.minimo}. Sugerir reposição.`,
          categoria: 'Estoque',
          prioridade: 'alta',
          data: new Date().toLocaleDateString('pt-BR'),
          status: 'aberto',
        }));
      if (novos.length === 0) {
        toast('Varredura concluída: críticos já possuem B.O.');
        return;
      }
      const criados = [];
      for (const n of novos) {
        try {
          const r = await api.criarProblema(n);
          criados.push(r?.bo || { ...n, historico: [] });
        } catch (e) {
          console.error('Erro ao persistir B.O. da varredura:', e.message);
        }
      }
      if (criados.length === 0) {
        toast('Erro na varredura automática');
        return;
      }
      setLista(prev => [...criados, ...prev]);
      addNotificacao('B.O.s abertos pela IA', `${criados.length} chamado(s) de ruptura de estoque`);
      toast(`${criados.length} B.O.(s) aberto(s) pela IA`);
    } catch (e) {
      console.error('Erro na varredura IA:', e);
      toast('Erro na varredura automática');
    } finally {
      setVarrendo(false);
    }
  };

  const adicionarNota = async id => {
    const texto = (notas[id] || '').trim();
    if (!texto) return;
    try {
      const r = await api.anexarNotaProblema(id, texto);
      const historico = r?.bo?.historico || [...((lista.find(p => p.id === id)?.historico) || []), { texto, quando: new Date().toLocaleString('pt-BR') }];
      setLista(prev => prev.map(p => (p.id === id ? { ...p, historico } : p)));
      setDetalhe(prev => (prev && prev.id === id ? { ...prev, historico } : prev));
      setNotas(prev => ({ ...prev, [id]: '' }));
      toast('Nota interna registrada');
    } catch (e) {
      toast(`Erro ao registrar nota: ${e.message}`);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluindo) return;
    try {
      await api.removerProblema(excluindo.id);
      setLista(prev => prev.filter(p => p.id !== excluindo.id));
      toast(`B.O. ${excluindo.id} excluído`);
    } catch (e) {
      toast(`Erro ao excluir B.O.: ${e.message}`);
    }
    setExcluindo(null);
  };

  const kpis = [
    { label: 'Abertos', valor: abertos, cor: 'text-red-500 dark:text-red-400' },
    { label: 'Em andamento', valor: andamento, cor: 'text-amber-500 dark:text-amber-400' },
    { label: 'Resolvidos', valor: resolvidos, cor: 'text-teal-600 dark:text-teal-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Central de B.O.</h1>
          <p className="text-sm text-slate-500">Registre e acompanhe a resolução de problemas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={varreduraIA} disabled={varrendo}>
            <Sparkles className="h-4 w-4" /> {varrendo ? 'Varrendo...' : 'Varredura IA'}
          </Button>
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="h-4 w-4" /> Abrir B.O.
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${k.cor}`}>{k.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código, título..." />
        <Select
          value={filtro}
          onChange={setFiltro}
          options={[{ value: 'Todos', label: 'Todos os status' }, { value: 'aberto', label: 'Aberto' }, { value: 'em andamento', label: 'Em andamento' }, { value: 'resolvido', label: 'Resolvido' }]}
        />
        <Select
          value={prioridade}
          onChange={setPrioridade}
          options={[{ value: 'Todas', label: 'Todas as prioridades' }, { value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]}
        />
      </div>

      <Card>
        {carregando ? (
          <EmptyState title="Carregando B.O.s reais…" description="Buscando problemas no backend." />
        ) : filtrados.length === 0 ? (
          <EmptyState title="Nenhum B.O. neste filtro" description="Ajuste o filtro de status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">B.O.</th>
                  <th className="px-5 py-3 font-medium">Problema</th>
                  <th className="px-5 py-3 font-medium">Categoria</th>
                  <th className="px-5 py-3 font-medium">Prioridade</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtrados.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.id}</td>
                    <td className="px-5 py-3">
                      <p className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> {p.titulo}
                      </p>
                      <p className="text-xs text-slate-500">{p.descricao}</p>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{p.categoria}</td>
                    <td className="px-5 py-3"><Badge variant={PRIORIDADE[p.prioridade]}>{p.prioridade}</Badge></td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{p.data}</td>
                    <td className="px-5 py-3"><Badge variant={STATUS[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetalhe(p)}
                          title="Abrir histórico"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
                        >
                          <span className="font-mono text-xs font-bold">{p.id}</span>
                        </button>
                        {p.status !== 'resolvido' ? (
                          <Button size="sm" variant="secondary" onClick={() => avancar(p.id)}>
                            {p.status === 'aberto' ? 'Iniciar atendimento' : 'Resolver'}
                          </Button>
                        ) : (
                          <span className="text-xs text-teal-600 dark:text-teal-400">✓ Resolvido</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setExcluindo(p)}
                          title={`Excluir ${p.id}`}
                          aria-label={`Excluir ${p.id}`}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detalhe && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Histórico ${detalhe.id}`}>
          <button type="button" aria-label="Fechar" onClick={() => setDetalhe(null)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{detalhe.id}</h2>
              <button type="button" onClick={() => setDetalhe(null)} aria-label="Fechar histórico" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
              <p className="font-medium text-slate-800 dark:text-slate-100">{detalhe.titulo}</p>
              <p className="text-slate-500">{detalhe.descricao}</p>
              <div className="flex gap-2">
                <Badge variant={PRIORIDADE[detalhe.prioridade]}>{detalhe.prioridade}</Badge>
                <Badge variant={STATUS[detalhe.status]}>{STATUS_LABEL[detalhe.status]}</Badge>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Histórico interno</p>
                {(detalhe.historico || []).length === 0 && (
                  <p className="text-xs text-slate-400">Nenhuma nota registrada.</p>
                )}
                {(detalhe.historico || []).map((h, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-2.5 text-xs dark:bg-slate-800">
                    <p className="text-slate-700 dark:text-slate-200">{h.texto}</p>
                    <p className="mt-1 text-slate-400">{h.quando}</p>
                  </div>
                ))}
                {/* Nota nova reflete na lista via estado local */}
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
              <Input
                value={notas[detalhe.id] || ''}
                onChange={e => setNotas(prev => ({ ...prev, [detalhe.id]: e.target.value }))}
                placeholder="Adicionar nota interna..."
              />
              <Button onClick={() => adicionarNota(detalhe.id)}>
                Enviar
              </Button>
            </div>
          </aside>
        </div>
      )}

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Abrir B.O.">
        <div className="space-y-3">
          <Input label="Título *" value={formBO.titulo} onChange={e => setFormBO(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Divergência no estoque" />
          <Input label="Descrição" value={formBO.descricao} onChange={e => setFormBO(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhe o problema..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Categoria" value={formBO.categoria} onChange={v => setFormBO(f => ({ ...f, categoria: v }))} options={['Operacional', 'Estoque', 'Fiscal', 'Logística', 'Integração'].map(c => ({ value: c, label: c }))} />
            <Select label="Prioridade" value={formBO.prioridade} onChange={v => setFormBO(f => ({ ...f, prioridade: v }))} options={[{ value: 'alta', label: 'Alta' }, { value: 'media', label: 'Média' }, { value: 'baixa', label: 'Baixa' }]} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNovo(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarBO}>
            Abrir chamado
          </Button>
        </div>
      </Modal>

      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir chamado">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir o chamado <span className="font-mono font-semibold">{excluindo?.id}</span>?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={confirmarExclusao}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
