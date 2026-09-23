import { useEffect, useState } from 'react';
import { ListTodo, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

// ============================================
// Tarefas — fila real de tarefas do backend
// (/api/tasks). Filtros por status, repetição
// de falhas (dead_letter) e cancelamento de
// pendentes. Sem backend, lista vazia.
// ============================================

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'dead_letter', label: 'Falhas' },
];

const STATUS_VARIANT = {
  pending: 'amber',
  processing: 'sky',
  completed: 'teal',
  failed: 'red',
  dead_letter: 'red',
  cancelled: 'slate',
};

export function Tarefas() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('');
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = async (status) => {
    setCarregando(true);
    try {
      const dados = await api.getTarefas(status || undefined);
      setLista(Array.isArray(dados) ? dados : []);
    } catch {
      setLista([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(filtro); }, [filtro]);

  const repetir = async (id) => {
    try {
      await api.repetirTarefa(id);
      toast(`Tarefa ${id} reenfileirada`);
      carregar(filtro);
    } catch (e) {
      toast(`Erro ao repetir tarefa: ${e.message}`);
    }
  };

  const cancelar = async (id) => {
    try {
      await api.cancelarTarefa(id);
      toast(`Tarefa ${id} cancelada`);
      carregar(filtro);
    } catch (e) {
      toast(`Erro ao cancelar tarefa: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Tarefas</h1>
          <p className="text-sm text-slate-500">Fila de execução dos agentes no backend</p>
        </div>
        <Button variant="secondary" onClick={() => carregar(filtro)}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map(f => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filtro === f.value ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {carregando ? (
          <EmptyState title="Carregando tarefas reais…" description="Buscando a fila no backend." />
        ) : lista.length === 0 ? (
          <EmptyState title="Nenhuma tarefa neste filtro" description="A fila do backend está vazia." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Tarefa</th>
                  <th className="px-5 py-3 font-medium">Agente</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Tentativas</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lista.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{t.agentId || '-'}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <ListTodo className="h-3.5 w-3.5 text-slate-400" /> {t.action || '-'}
                      </span>
                      {t.entityId && <p className="font-mono text-xs text-slate-400">{t.entityId}</p>}
                    </td>
                    <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[t.status] || 'slate'}>{t.status}</Badge></td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.attempts ?? 0}/{t.maxRetries ?? '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {(t.status === 'dead_letter' || t.status === 'failed') && (
                          <Button size="sm" variant="secondary" onClick={() => repetir(t.id)}>
                            <RotateCcw className="h-3.5 w-3.5" /> Repetir
                          </Button>
                        )}
                        {t.status === 'pending' && (
                          <Button size="sm" variant="secondary" onClick={() => cancelar(t.id)}>
                            <XCircle className="h-3.5 w-3.5" /> Cancelar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
