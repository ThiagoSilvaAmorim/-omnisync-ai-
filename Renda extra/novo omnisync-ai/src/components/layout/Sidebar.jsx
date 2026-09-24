import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LogOut, Infinity as InfinityIcon, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { SECTIONS as NAV_SECTIONS } from '../../lib/navigation';

// ============================================
// Sidebar — menu hierárquico colapsável (padrão SNV).
// - Botão oculta/mostra nomes (só ícones ↔ ícones + textos)
// - Seções expansíveis; rota ativa mantém a seção aberta
// - Preferência persistida em localStorage
// ============================================

const STORAGE_KEY = 'omnisync-sidebar-collapsed';

function lerColapsada() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar({ onNavigate, forceExpanded = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [colapsadaState, setColapsadaState] = useState(lerColapsada);
  const colapsada = forceExpanded ? false : colapsadaState;

  const [secoesAbertas, setSecoesAbertas] = useState(() => {
    // Estado inicial: todas abertas (modo expandido).
    const inicial = {};
    NAV_SECTIONS.forEach(s => { inicial[s.titulo] = true; });
    return inicial;
  });

  // Rota ativa mantém a própria seção expandida.
  useEffect(() => {
    const secaoAtiva = NAV_SECTIONS.find(s =>
      s.itens.some(i => pathname === i.rota || pathname.startsWith(`${i.rota}/`))
    );
    if (secaoAtiva) {
      setSecoesAbertas(prev => (
        prev[secaoAtiva.titulo] ? prev : { ...prev, [secaoAtiva.titulo]: true }
      ));
    }
  }, [pathname]);

  const alternarColapso = () => {
    setColapsadaState(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Armazenamento indisponível: segue só em memória.
      }
      // Sincroniza a largura do AppShell (mesmo origin).
      window.dispatchEvent(new Event('omnisync-sidebar-toggle'));
      return next;
    });
  };

  const alternarSecao = titulo => {
    if (colapsada) return;
    setSecoesAbertas(prev => ({ ...prev, [titulo]: !prev[titulo] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const secoesVisiveis = useMemo(() => NAV_SECTIONS, []);

  const ItemIcone = ({ Icone, destaque }) => (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center">
      {destaque ? <Zap className="h-4 w-4" /> : <Icone className="h-4 w-4" />}
    </span>
  );

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--tl-sidebar-bg)' }}>
      {/* Logo + toggle de colapso */}
      <div className={cn(
        'flex h-16 shrink-0 items-center gap-2.5',
        colapsada ? 'justify-center px-2' : 'px-5'
      )}>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary-600 [border-radius:var(--tl-radius-sm)]"
          title={colapsada ? 'OmniSync AI' : undefined}
        >
          <InfinityIcon className="h-5 w-5 text-white" />
        </span>
        {!colapsada && (
          <span className="min-w-0 flex-1 truncate text-base font-bold text-white">
            OmniSync AI
          </span>
        )}
        {!forceExpanded && (
          <button
            type="button"
            onClick={alternarColapso}
            className={cn(
              'rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white',
              colapsada && 'hidden'
            )}
            title="Ocultar nomes do menu"
            aria-label="Ocultar nomes do menu"
            aria-pressed={false}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navegação */}
      <nav
        className={cn(
          'flex-1 space-y-1 overflow-y-auto py-3',
          colapsada ? 'px-2' : 'pl-2 pr-0'
        )}
      >
        {secoesVisiveis.map(secao => {
          const aberta = colapsada ? false : (secoesAbertas[secao.titulo] !== false);
          const temAtiva = secao.itens.some(
            i => pathname === i.rota || pathname.startsWith(`${i.rota}/`)
          );
          const IconeSecao = secao.Icone || Zap;

          if (colapsada) {
            return (
              <div key={secao.titulo} className="pb-1" title={secao.titulo}>
                <div className="flex items-center justify-center py-1.5" aria-hidden>
                  <IconeSecao className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <ul className="space-y-0.5">
                  {secao.itens.map(item => (
                    <li key={item.nome}>
                      <NavLink
                        to={item.rota}
                        onClick={onNavigate}
                        title={item.nome}
                        className={({ isActive }) => cn(
                          'flex items-center justify-center rounded-lg py-2 transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                          isActive
                            ? 'text-slate-900'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white',
                          item.destaque && !isActive && 'bg-emerald-500/10 hover:bg-emerald-500/20'
                        )}
                        style={({ isActive }) =>
                          isActive ? { background: 'var(--tl-sidebar-active)' } : undefined
                        }
                      >
                        <ItemIcone Icone={item.Icone} destaque={item.destaque} />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <div key={secao.titulo}>
              <button
                type="button"
                onClick={() => alternarSecao(secao.titulo)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                  temAtiva
                    ? 'text-slate-200'
                    : 'text-slate-500 hover:text-slate-300'
                )}
                aria-expanded={aberta}
                aria-controls={`secao-${secao.titulo.replace(/\s+/g, '-').toLowerCase()}`}
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
                <ul id={`secao-${secao.titulo.replace(/\s+/g, '-').toLowerCase()}`} className="mt-0.5 space-y-0.5 pb-1">
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

        {/* Reabrir nomes quando colapsada (rodapé da nav) */}
        {colapsada && !forceExpanded && (
          <button
            type="button"
            onClick={alternarColapso}
            className="mt-2 flex w-full items-center justify-center rounded-lg py-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            title="Mostrar nomes do menu"
            aria-label="Mostrar nomes do menu"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </nav>

      {/* Usuário no rodapé */}
      <div className={cn('shrink-0 border-t border-white/10 p-3', colapsada && 'px-2')}>
        <div className={cn('flex items-center gap-3', colapsada && 'flex-col gap-2')}>
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 text-sm font-semibold text-white [border-radius:var(--tl-radius-sm)]',
              colapsada && 'h-8 w-8'
            )}
            title={colapsada ? user?.nome : undefined}
          >
            {user?.nome?.charAt(0) || 'U'}
          </div>
          {!colapsada && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.nome || 'Usuário'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email || 'Administrador'}</p>
            </div>
          )}
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
