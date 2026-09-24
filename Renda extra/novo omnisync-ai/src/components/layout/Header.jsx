import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Menu,
  Moon,
  Printer,
  Search,
  Sun,
} from 'lucide-react';
import { MODOS } from '../../lib/modes';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { getPeriodoLabel, periodos } from '../../data/mockData';
import { exportarExcel, exportarPdf, imprimir } from '../../lib/export';
import { Button } from '../ui/Button';
import { SearchPalette } from '../search/SearchPalette';

// ============================================
// Header — barra superior fixa com busca global
// (⌘K), seletor de período, ação rápida,
// notificações, ajuda e tema.
// ============================================
export function Header() {
  const { setMobileNavOpen, period, setPeriod, customRange, setCustomRange, painel, modo, setModo, modoAtivo, notificacoes, naoLidas, marcarTodasLidas, customAtiva, setCustomColor } = useApp();
  const { theme, toggleTheme } = useTheme();

  // Controla a abertura dos menus (paletas, período, exportação e notificações).
  const [paletaOpen, setPaletaOpen] = useState(false);
  const [periodoOpen, setPeriodoOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [buscaOpen, setBuscaOpen] = useState(false);
  const [acaoOpen, setAcaoOpen] = useState(false);
  const [ajudaOpen, setAjudaOpen] = useState(false);

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
            <>
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
            </>
          )}
        </div>

        <div className="relative hidden sm:block">
          <Button size="sm" className="inline-flex" onClick={() => setAcaoOpen(o => !o)}>
            + Nova ação
          </Button>
          {acaoOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAcaoOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                {ACOES_RAPIDAS.map(a => (
                  <Link
                    key={a.rota}
                    to={a.rota}
                    onClick={() => setAcaoOpen(false)}
                    className="block rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {a.nome}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Exportação unificada (menu suspenso) */}
        <div className="relative hidden md:block">
          <Button size="sm" variant="secondary" onClick={() => setExportOpen(o => !o)}>
            <Download className="h-4 w-4" />
            Exportação
            <ChevronDown className="h-4 w-4" />
          </Button>

          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => { imprimir(); setExportOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Printer className="h-4 w-4 text-slate-400" /> Imprimir Relatório
                </button>
                <button
                  type="button"
                  onClick={() => { exportarExcel(painel, period, customRange); setExportOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileSpreadsheet className="h-4 w-4 text-slate-400" /> Exportar para Excel (CSV)
                </button>
                <button
                  type="button"
                  onClick={() => { exportarPdf(); setExportOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <FileText className="h-4 w-4 text-slate-400" /> Exportar para PDF
                </button>
              </div>
            </>
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
          <>
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
          </>
        )}

        {/* ThemeSwitcher — modo visual + cor customizada */}
        <div className="relative hidden md:inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPaletaOpen(o => !o)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Escolher tema/estilo"
            title="Tema"
          >
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {modoAtivo.nome}
            </span>
          </button>

          {paletaOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPaletaOpen(false)} />
              <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Estilo
                </p>
                {MODOS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setModo(m.id);
                      setPaletaOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      modo === m.id ? 'bg-slate-50 dark:bg-slate-700/50 border' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded {m.style.chip}" />
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{m.nome}</span>
                    </span>
                    {modo === m.id && <Check className="h-4 w-4 text-primary-600" />}
                  </button>
                ))}
                <div className="my-4 border-t border-slate-200 dark:border-slate-700" />
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Cor personalizada
                </p>
                {modoAtivo.permiteCustomColor && customAtiva ? (
                  <div className="space-y-1 px-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Cor atual:</span>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: customAtiva }} />
                    </div>
                    <input
                      type="color"
                      value={customAtiva?.replace('#', '') || '000000'}
                      onChange={e => setCustomColor(modo, '#' + e.target.value)}
                      className="w-16 h-2 px-2 rounded border border-slate-300 appearance-none"
                    />
                  </div>
) : (
                  <div className="px-2 py-1 text-center text-sm text-slate-500 dark:text-slate-400">
                    Clique em um modo para definir color
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="ml-1 flex items-center gap-2.5">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white">
              CM
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-slate-900" />
          </div>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Carlos Menezes</p>
            <p className="flex items-center gap-1 text-xs text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Online
            </p>
          </div>
        </div>
      </div>
      </header>

      {/* Busca global (⌘K) */}
      <SearchPalette open={buscaOpen} onClose={() => setBuscaOpen(false)} />
    </>
  );
}
