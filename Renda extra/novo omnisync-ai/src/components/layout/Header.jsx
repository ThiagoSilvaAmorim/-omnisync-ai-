import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Printer,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { getPeriodoLabel, periodos } from '../../data/mockData';
import { exportarExcel, exportarPdf, imprimir } from '../../lib/export';
import { SearchPalette } from '../search/SearchPalette';

// ============================================
// Header — barra superior fixa.
// [Busca][Período][Notificações][Ajuda][⋯ overflow: Nova ação/Exportação][Perfil com Aparência/Sair]
// ============================================
export function Header() {
  const { setMobileNavOpen, period, setPeriod, customRange, setCustomRange, notificacoes, naoLidas, marcarTodasLidas, ajudaOpen, setAjudaOpen, _painel } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [buscaOpen, setBuscaOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);

  const ACOES_RAPIDAS = [
    { nome: 'Novo produto', rota: '/produtos' },
    { nome: 'Novo pedido', rota: '/pedidos' },
    { nome: 'Novo cliente', rota: '/clientes' },
    { nome: 'Abrir B.O.', rota: '/central-bo' },
    { nome: 'Nova publicação', rota: '/publicacoes' },
    { nome: 'Novo evento', rota: '/calendario' },
  ];

  // Atalho global: Ctrl+K / ⌘K abre a busca.
  useEffect(() => {
    const onKey = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscaOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Rótulo do período selecionado (fixo ou customizado).
  const periodoLabel = getPeriodoLabel(period, customRange);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:px-6 print:hidden">
      {/* Esquerda: menu mobile + busca */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setBuscaOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 sm:flex"
        >
          <Search className="h-4 w-4" />
          <span>Pesquisar...</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-700">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Direita: ações + usuário */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Seletor de período (fixo ou personalizado) */}
        <div className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setPeriodoOpen(o => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Selecionar período"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className="max-w-[170px] truncate">{periodoLabel}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {periodoOpen && (
            <div>
              <div className="fixed inset-0 z-40" onClick={() => setPeriodoOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Período
                </p>
                {periodos.filter(p => p.id !== 'custom').map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPeriod(p.id); setPeriodoOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      period === p.id ? 'font-medium text-primary-600' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {p.label}
                    {period === p.id && <Check className="h-4 w-4 text-primary-600" />}
                  </button>
                ))}

                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Personalizado
                </p>
                <div className="space-y-2 px-1 pt-1">
                  <label className="block">
                    <span className="text-xs text-slate-500">Data inicial</span>
                    <input
                      type="date"
                      value={customRange.inicio}
                      onChange={e => { setCustomRange({ ...customRange, inicio: e.target.value }); setPeriod('custom'); }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:[color-scheme:dark]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">Data final</span>
                    <input
                      type="date"
                      value={customRange.fim}
                      onChange={e => { setCustomRange({ ...customRange, fim: e.target.value }); setPeriod('custom'); }}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:[color-scheme:dark]"
                    />
</label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notificações */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setBellOpen(o => !o)}
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {naoLidas > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {naoLidas}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Notificações</p>
                  {naoLidas > 0 && (
                    <button
                      type="button"
                      onClick={marcarTodasLidas}
                      className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-72 space-y-1 overflow-y-auto">
                  {notificacoes.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-slate-400">Nenhuma notificação por enquanto.</p>
                  ) : (
                    notificacoes.slice(0, 10).map(n => {
                      const corpo = (
                        <>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.titulo}</p>
                          <p className="text-xs text-slate-500">{n.descricao}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{n.data}</p>
                        </>
                      );
                      return n.rota ? (
                        <Link
                          key={n.id}
                          to={n.rota}
                          onClick={() => setBellOpen(false)}
                          className={`block rounded-lg p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 ${n.lida ? '' : 'bg-primary-50 dark:bg-primary-500/10'}`}
                        >
                          {corpo}
                        </Link>
                      ) : (
                        <div key={n.id} className={`rounded-lg p-2.5 ${n.lida ? '' : 'bg-primary-50 dark:bg-primary-500/10'}`}>
                          {corpo}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Ajuda */}
        <button
          type="button"
          onClick={() => setAjudaOpen(o => !o)}
          className="hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:block"
          aria-label="Ajuda"
          title="Central de ajuda"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        {ajudaOpen && (
          <div>
            <div className="fixed inset-0 z-40" onClick={() => setAjudaOpen(false)} />
            <div className="absolute right-4 top-16 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
              <p className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Central de ajuda</p>
              <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                <li><kbd className="rounded border px-1.5 text-[11px]">Ctrl/⌘ K</kbd> — busca global de telas</li>
                <li>Use os filtros e a busca no topo de cada lista para triar registros.</li>
                <li>Clique nas linhas das tabelas para abrir detalhes.</li>
                <li>Suporte: <span className="font-mono">contato@omnisync.ai</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* Overflow (⋯) — Nova ação + Exportação */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setOverflowOpen(o => !o)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Mais ações"
            title="Mais ações"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {overflowOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOverflowOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Ações rápidas</p>
                {ACOES_RAPIDAS.map(a => (
                  <Link
                    key={a.rota}
                    to={a.rota}
                    onClick={() => setOverflowOpen(false)}
                    className="block rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {a.nome}
                  </Link>
                ))}
                <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Exportação</p>
                <button
                  type="button"
                  onClick={() => { imprimir(); setOverflowOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Printer className="h-4 w-4 text-slate-400" /> Imprimir Relatório
                </button>
                <button
                  type="button"
                  onClick={() => { exportarExcel('comercial', period, customRange); setOverflowOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" /> Exportar para Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => { exportarPdf(); setOverflowOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4 text-slate-400" /> Exportar para PDF
                </button>
              </div>
            </>
          )}
        </div>

        {/* Perfil dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPerfilOpen(o => !o)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 pr-3 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Menu do usuário"
            aria-expanded={perfilOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
              CM
            </div>
            <span className="hidden lg:block text-sm font-medium text-slate-700 dark:text-slate-200">Carlos Menezes</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {perfilOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPerfilOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
                    CM
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">Carlos Menezes</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">Diretor</p>
                  </div>
                </div>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <NavLink
                  to="/configuracoes"
                  onClick={() => setPerfilOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span>Aparência</span>
                </NavLink>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Tema claro/escuro */}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
      </header>

      {/* Busca global (⌘K) */}
      <SearchPalette open={buscaOpen} onClose={() => setBuscaOpen(false)} />
    </>
  );
}
