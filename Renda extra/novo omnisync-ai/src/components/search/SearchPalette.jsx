import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Search, ShoppingCart, Users } from 'lucide-react';
import { api } from '../../services/api';

// ============================================
// SearchPalette — busca global (⌘K).
// Pesquisa telas e dados reais (produtos,
// clientes, pedidos do backend) e navega ao
// selecionar. Sem backend, só as telas.
// ============================================

const TELAS = [
  { nome: 'Dashboard', rota: '/dashboard' },
  { nome: 'Painel do Diretor', rota: '/diretor' },
  { nome: 'Metas', rota: '/metas' },
  { nome: 'Vendas', rota: '/vendas' },
  { nome: 'Pedidos', rota: '/pedidos' },
  { nome: 'Produtos', rota: '/produtos' },
  { nome: 'Estoque', rota: '/estoque' },
  { nome: 'Compras', rota: '/compras' },
  { nome: 'Fornecedores', rota: '/fornecedores' },
  { nome: 'Clientes / CRM', rota: '/clientes' },
  { nome: 'Financeiro', rota: '/financeiro' },
  { nome: 'Fiscal', rota: '/fiscal' },
  { nome: 'Logística', rota: '/logistica' },
  { nome: 'Central de B.O.', rota: '/central-bo' },
  { nome: 'Tarefas', rota: '/tarefas' },
  { nome: 'Atividade', rota: '/atividade' },
  { nome: 'Comece por aqui', rota: '/onboarding' },
  { nome: 'Radar de Mercado', rota: '/radar-mercado' },
  { nome: 'Análise de Mercado', rota: '/analise-mercado' },
  { nome: 'Simulador de Negócio', rota: '/simulador' },
  { nome: 'Central de IA', rota: '/central-ia' },
  { nome: 'Central de Publicações', rota: '/publicacoes' },
  { nome: 'Calendário', rota: '/calendario' },
  { nome: 'Conteúdo IA', rota: '/conteudo-ia' },
  { nome: 'Integrações', rota: '/integracoes' },
  { nome: 'Segurança e Usuários', rota: '/seguranca' },
];

export function SearchPalette({ open, onClose }) {
  const [busca, setBusca] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  // Base de busca real, carregada ao abrir a paleta.
  const [base, setBase] = useState({ produtos: [], clientes: [], pedidos: [] });

  useEffect(() => {
    if (open) {
      // Reseta a busca e foca o input (fora do corpo síncrono do effect).
      const timer = setTimeout(() => {
        setBusca('');
        inputRef.current?.focus();
      }, 0);
      let ativo = true;
      (async () => {
        try {
          const [prods, clis, peds] = await Promise.all([
            api.getProdutos({ limit: 50 }).catch(() => null),
            api.getClientes().catch(() => null),
            api.getPedidos().catch(() => null),
          ]);
          if (ativo) {
            setBase({
              produtos: prods?.produtos || [],
              clientes: Array.isArray(clis) ? clis : [],
              pedidos: Array.isArray(peds) ? peds : [],
            });
          }
        } catch {
          if (ativo) setBase({ produtos: [], clientes: [], pedidos: [] });
        }
      })();
      return () => { ativo = false; clearTimeout(timer); };
    }
  }, [open]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = busca.toLowerCase().trim();
  const telas = (q ? TELAS.filter(t => t.nome.toLowerCase().includes(q)) : TELAS).slice(0, 6);
  const prods = q ? base.produtos.filter(p => `${p.nome || ''} ${p.sku || ''}`.toLowerCase().includes(q)).slice(0, 4) : [];
  const clis = q ? base.clientes.filter(c => `${c.nome || ''} ${c.email || ''}`.toLowerCase().includes(q)).slice(0, 4) : [];
  const peds = q ? base.pedidos.filter(p => `${p.id || ''} ${p.cliente || ''}`.toLowerCase().includes(q)).slice(0, 4) : [];

  const total = telas.length + prods.length + clis.length + peds.length;

  const ir = rota => {
    navigate(rota);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      <div className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl print:hidden dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar telas, produtos, clientes, pedidos..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none dark:text-slate-200"
          />
          <kbd className="rounded border border-slate-200 px-1.5 text-[11px] text-slate-400 dark:border-slate-600">ESC</kbd>
        </div>

        <div className="mt-2 max-h-80 space-y-3 overflow-y-auto p-1">
          {telas.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Telas</p>
              {telas.map(t => (
                <button
                  key={t.rota}
                  type="button"
                  onClick={() => ir(t.rota)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" /> {t.nome}
                </button>
              ))}
            </div>
          )}

          {prods.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Produtos</p>
              {prods.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => ir('/produtos')}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Package className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate">{p.nome}</span>
                  <span className="text-xs text-slate-400">{p.sku}</span>
                </button>
              ))}
            </div>
          )}

          {clis.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Clientes</p>
              {clis.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => ir(`/clientes/${c.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate">{c.nome}</span>
                  <span className="text-xs text-slate-400">{c.cidade}</span>
                </button>
              ))}
            </div>
          )}

          {peds.length > 0 && (
            <div>
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Pedidos</p>
              {peds.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => ir('/pedidos')}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="flex-1 truncate">{p.id} — {p.cliente}</span>
                </button>
              ))}
            </div>
          )}

          {total === 0 && (
            <p className="px-2 py-6 text-center text-sm text-slate-400">
              Nada encontrado para "{busca}".
            </p>
          )}
          {!q && (
            <p className="px-2 text-xs text-slate-400">Digite para buscar em todo o sistema.</p>
          )}
        </div>
      </div>
    </>
  );
}
