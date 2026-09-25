import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, X, Infinity as InfinityIcon, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { SECTIONS as NAV_SECTIONS } from '../../lib/navigation';

// ============================================
// Sidebar — dois modos:
// 1) Desktop: trilha de ícones por seção (w-16);
//    clique abre painel (flyout) com nome da seção
//    e itens. Esc/clique fora fecham. O botão fixo
//    do AppShell oculta a barra inteira (w-0).
// 2) forceExpanded (drawer mobile): menu expandido
//    com seções e itens sempre visíveis.
// ============================================

const slug = titulo => titulo.replace(/\s+/g, '-').toLowerCase();

export function Sidebar({ onNavigate, forceExpanded = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [secaoAtiva, setSecaoAtiva] = useState(null);
  const [secoesAbertas, setSecoesAbertas] = useState(() => {
    const inicial = {};
    NAV_SECTIONS.forEach(s => { inicial[s.titulo] = true; });
    return inicial;
  });
  const rootRef = useRef(null);

  const secaoSelecionada = NAV_SECTIONS.find(s => s.titulo === secaoAtiva) || null;

  // Painel fecha ao clicar fora da barra ou com Esc.
  useEffect(() => {
    if (!secaoAtiva) return undefined;
    const aoClicar = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setSecaoAtiva(null);
    };
    const aoTeclar = e => {
      if (e.key === 'Escape') setSecaoAtiva(null);
    };
    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [secaoAtiva]);

  const alternarSecao = titulo => setSecaoAtiva(prev => (prev === titulo ? null : titulo));
  const navegarNoPainel = () => {
    setSecaoAtiva(null);
    onNavigate?.();
  };
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const itemAtivo = i => pathname === i.rota || pathname.startsWith(`${i.rota}/`);

  const ItemIcone = ({ Icone, destaque }) => (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      {destaque ? <Zap className="h-4 w-4" /> : <Icone className="h-4 w-4" />}
    </span>
  );

  // ---------- Modo expandido (drawer mobile) ----------
  if (forceExpanded) {
    return (
      <div ref={rootRef} className="flex h-full flex-col" style={{ background: 'var(--tl-sidebar-bg)' }}>
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary-600 [border-radius:var(--tl-radius-sm)]">
            <InfinityIcon className="h-5 w-5 text-white" />
          </span>
          <span className="min-w-0 flex-1 truncate text-base font-bold text-white">
            OmniSync AI
          </span>
        </div>

        {/* Navegação: seções expansíveis */}
        <nav className="flex-1 space-y-1 overflow-y-auto py-3 pl-2 pr-0" aria-label="Menu principal">
          {NAV_SECTIONS.map(secao => {
            const aberta = secoesAbertas[secao.titulo] !== false;
            const temAtiva = secao.itens.some(itemAtivo);
            const IconeSecao = secao.Icone || Zap;
            return (
              <div key={secao.titulo}>
                <button
                  type="button"
                  onClick={() => setSecoesAbertas(prev => ({ ...prev, [secao.titulo]: !prev[secao.titulo] }))}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    temAtiva ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                  )}
                  aria-expanded={aberta}
                  aria-controls={`secao-${slug(secao.titulo)}`}
                >
                  <IconeSecao className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{secao.titulo}</span>
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
                      aberta && 'rotate-90'
                    )}
                  />
                </button>
                {aberta && (
                  <ul id={`secao-${slug(secao.titulo)}`} className="mt-0.5 space-y-0.5 pb-1">
                    {secao.itens.map(item => (
                      <li key={item.nome}>
                        <NavLink
                          to={item.rota}
                          onClick={onNavigate}
                          className={({ isActive }) => cn(
                            'flex items-center gap-3 rounded-lg py-2 pl-8 pr-3 text-sm transition-all duration-150',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                            isActive
                              ? 'font-medium text-slate-900'
                              : 'text-slate-300 hover:bg-white/8 hover:text-white',
                            item.destaque && !isActive && 'bg-emerald-500/10 hover:bg-emerald-500/20'
                          )}
                          style={({ isActive }) =>
                            isActive ? { background: 'var(--tl-sidebar-active)' } : undefined
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <ItemIcone Icone={item.Icone} destaque={item.destaque} />
                              <span className={cn('truncate', item.destaque && 'font-semibold text-emerald-300')}>
                                {item.nome}
                              </span>
                              {item.destaque && !isActive && (
                                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-900 text-[10px] font-bold animate-pulse">
                                  ★
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Usuário no rodapé */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white [border-radius:var(--tl-radius-sm)]"
              title={user?.nome}
            >
              {user?.nome?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.nome || 'Usuário'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email || 'Administrador'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Modo trilha (desktop) ----------
  return (
    <div ref={rootRef} className="relative flex h-full flex-col" style={{ background: 'var(--tl-sidebar-bg)' }}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-center" title="OmniSync AI">
        <span className="flex h-9 w-9 items-center justify-center bg-primary-600 [border-radius:var(--tl-radius-sm)]">
          <InfinityIcon className="h-5 w-5 text-white" />
        </span>
      </div>

      {/* Trilha de seções */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2" aria-label="Menu principal">
        {NAV_SECTIONS.map(secao => {
          const IconeSecao = secao.Icone || Zap;
          const aberta = secaoAtiva === secao.titulo;
          const temAtiva = secao.itens.some(itemAtivo);
          return (
            <button
              key={secao.titulo}
              type="button"
              onClick={() => alternarSecao(secao.titulo)}
              title={secao.titulo}
              aria-label={secao.titulo}
              aria-expanded={aberta}
              aria-controls={aberta ? 'painel-secao' : undefined}
              data-testid={`rail-${slug(secao.titulo)}`}
              className={cn(
                'flex w-full items-center justify-center rounded-lg py-2.5 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                aberta
                  ? 'bg-white/15 text-white'
                  : temAtiva
                    ? 'bg-white/8 text-white'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
              )}
            >
              <IconeSecao className="h-5 w-5" />
            </button>
          );
        })}
      </nav>

      {/* Rodapé: usuário + sair */}
      <div className="flex shrink-0 flex-col items-center gap-1 border-t border-white/10 p-2">
        <div
          className="flex h-9 w-9 items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white [border-radius:var(--tl-radius-sm)]"
          title={user?.nome}
        >
          {user?.nome?.charAt(0) || 'U'}
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Painel (flyout): nome da seção + itens */}
      {secaoSelecionada && (
        <div
          id="painel-secao"
          data-testid="painel-secao"
          className="absolute left-full top-0 z-40 flex h-full w-60 flex-col border-l border-white/10 shadow-2xl"
          style={{ background: 'var(--tl-sidebar-bg)' }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
            <span className="truncate text-sm font-semibold uppercase tracking-wider text-white">
              {secaoSelecionada.titulo}
            </span>
            <button
              type="button"
              onClick={() => setSecaoAtiva(null)}
              aria-label="Fechar menu"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {secaoSelecionada.itens.map(item => (
              <li key={item.nome}>
                <NavLink
                  to={item.rota}
                  onClick={navegarNoPainel}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    isActive
                      ? 'font-medium text-slate-900'
                      : 'text-slate-300 hover:bg-white/8 hover:text-white',
                    item.destaque && !isActive && 'bg-emerald-500/10 hover:bg-emerald-500/20'
                  )}
                  style={({ isActive }) =>
                    isActive ? { background: 'var(--tl-sidebar-active)' } : undefined
                  }
                >
                  {({ isActive }) => (
                    <>
                      <ItemIcone Icone={item.Icone} destaque={item.destaque} />
                      <span className={cn('truncate', item.destaque && 'font-semibold text-emerald-300')}>
                        {item.nome}
                      </span>
                      {item.destaque && !isActive && (
                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-900 text-[10px] font-bold animate-pulse">
                          ★
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
