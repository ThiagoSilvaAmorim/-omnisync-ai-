import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

// ============================================
// AlertsDrawer — gaveta lateral que detalha os
// itens críticos para ação imediata. Desliza da
// direita quando `open` é true.
// ============================================
export function AlertsDrawer({ open, alerts = [], onClose }) {
  const toast = useToast();
  const [resolvidos, setResolvidos] = useState([]);
  const [processando, setProcessando] = useState(null);

  // Resolver cria tarefa real na fila (Central de IA → Automações) e marca o item.
  const resolver = async alerta => {
    setProcessando(alerta.id);
    try {
      await api.criarTarefa({
        agentId: 'StockGuard',
        action: 'stock.alert_rupture',
        entityType: 'alerta',
        entityId: String(alerta.id),
        payload: { titulo: alerta.titulo, detalhe: alerta.detalhe },
      });
      setResolvidos(prev => [...prev, alerta.id]);
      toast(`"${alerta.titulo}" encaminhado para a fila de automações`);
    } catch (e) {
      console.error('Erro ao encaminhar alerta:', e);
      toast('Erro ao encaminhar alerta');
    } finally {
      setProcessando(null);
    }
  };

  const resolverTodos = async () => {
    const pendentes = alerts.filter(a => !resolvidos.includes(a.id));
    if (pendentes.length === 0) {
      toast('Nenhum item pendente');
      return;
    }
    for (const a of pendentes) {
      await resolver(a);
    }
    toast('Todos os itens críticos encaminhados');
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm print:hidden"
          onClick={onClose}
        />
      )}

      {/* Painel */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 print:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Itens críticos — ação imediata
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de itens */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {alerts.map(alerta => (
            <div
              key={alerta.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-800 dark:text-slate-100">{alerta.titulo}</p>
                <Badge variant={alerta.tipo === 'critico' ? 'red' : 'amber'}>
                  {alerta.tipo === 'critico' ? 'Crítico' : 'Atenção'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">{alerta.detalhe}</p>
              <div className="mt-4">
                {resolvidos.includes(alerta.id) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400">
                    <CheckCircle2 className="h-4 w-4" /> Encaminhado ✓
                  </span>
                ) : (
                  <Button size="sm" onClick={() => resolver(alerta)} disabled={processando === alerta.id}>
                    <CheckCircle2 className="h-4 w-4" /> {processando === alerta.id ? 'Enviando...' : 'Resolver'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-200 p-5 dark:border-slate-800">
          <Button className="w-full" onClick={resolverTodos}>
            Resolver todos os itens
          </Button>
        </div>
      </aside>
    </>
  );
}
