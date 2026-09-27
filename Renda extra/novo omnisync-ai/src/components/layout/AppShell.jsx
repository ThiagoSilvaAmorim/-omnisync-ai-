import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronRight, ShieldAlert } from 'lucide-react';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { PageHeader } from './PageHeader';
import { Skeleton } from '../ui/Skeleton';
import { ToastContainer } from '../ui/Toast';
import { AssistantChat } from '../assistant/AssistantChat';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { cn } from '../../lib/utils';

// Fallback exibido enquanto a tela (carregada via lazy) é baixada.
function PageFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 rounded-md" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}

// ============================================
// AppShell — layout mestre que envolve todas as
// rotas. O componente de navegação depende do
// modo ativo: sidebar (Clássico/Moderno) ou
// mega-menu no topo (Comando/Neon).
// ============================================
// Faixa de enforcement de MFA: contas sem autenticação em dois fatores
// veem um alerta persistente com prazo até o bloqueio de navegação.
function MfaBanner() {
  const { user } = useAuth();
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.getUsuarios()
      .then(lista => {
        if (!ativo) return;
        const conta = (lista || []).find(u => u.email?.toLowerCase() === user?.email?.toLowerCase());
        setPendente(!!conta && conta.mfaConfigurado === false);
      })
      .catch(() => {});
    return () => { ativo = false; };
  }, [user?.email]);

  if (!pendente) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" role="alert">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>Sua conta está sem MFA. Configure em até 7 dias para não ter a navegação bloqueada.</span>
      <Link to="/seguranca" className="font-bold underline">Ativar agora</Link>
    </div>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const { modoAtivo } = useApp();
  const navTop = modoAtivo.nav === 'topo';

  // Estados da sidebar: expandida (padrão), recolhida (trilha w-16), oculta (w-0).
  const [sidebarOculta, setSidebarOculta] = useState(() => {
    try {
      return localStorage.getItem('omnisync-sidebar-hidden') === '1';
    } catch {
      return false;
    }
  });
  const [sidebarRecolhida, setSidebarRecolhida] = useState(() => {
    try {
      return localStorage.getItem('omnisync-sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const aplicar = () => {
      try {
        setSidebarOculta(localStorage.getItem('omnisync-sidebar-hidden') === '1');
        setSidebarRecolhida(localStorage.getItem('omnisync-sidebar-collapsed') === '1');
      } catch {
        setSidebarOculta(false);
        setSidebarRecolhida(false);
      }
    };
    window.addEventListener('storage', aplicar);
    window.addEventListener('omnisync-sidebar-toggle', aplicar);
    return () => {
      window.removeEventListener('storage', aplicar);
      window.removeEventListener('omnisync-sidebar-toggle', aplicar);
    };
  }, []);

  let asideW;
  let contentPad;
  if (navTop) {
    asideW = 'w-64';
    contentPad = 'md:pl-64';
  } else if (sidebarOculta) {
    asideW = 'w-0';
    contentPad = 'md:pl-0';
  } else if (sidebarRecolhida) {
    asideW = 'w-16';
    contentPad = 'md:pl-16';
  } else {
    asideW = 'w-64';
    contentPad = 'md:pl-64';
  }

  const _alternarSidebar = () => {
    // Alterna entre expandida (w-64) e recolhida/trilha (w-16).
    setSidebarRecolhida(prev => {
      const next = !prev;
      try {
        localStorage.setItem('omnisync-sidebar-collapsed', next ? '1' : '0');
      } catch {
        // Armazenamento indisponível: segue só em memória.
      }
      return next;
    });
  };

  const _ocultarSidebar = () => {
    // Oculta completamente (w-0) - mantido para compatibilidade.
    try {
      localStorage.setItem('omnisync-sidebar-hidden', '1');
    } catch {
      // Armazenamento indisponível.
    }
    window.dispatchEvent(new Event('omnisync-sidebar-toggle'));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navegação lateral fixa — desktop.
          z-40 > z-30 do Header: o cabeçalho do painel da sidebar
          (nome da seção) fica visível por cima da busca global. */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 md:block print:hidden',
        asideW,
        !navTop && sidebarOculta && 'invisible overflow-hidden'
      )}>
        {navTop ? <TopNav /> : <Sidebar collapsed={sidebarRecolhida} />}
      </aside>

      {/* Aba discreta para reabrir a barra — só existe quando ela está
          oculta (w-0); o botão recolher/expandir mora no rodapé da Sidebar. */}
      {!navTop && sidebarOculta && (
        <button
          type="button"
          onClick={() => setSidebarOculta(false)}
          aria-label="Mostrar menu lateral"
          data-testid="btn-toggle-sidebar"
          title="Mostrar menu lateral"
          style={{ background: 'var(--tl-sidebar-bg)' }}
          className="fixed left-0 top-24 z-40 hidden h-10 w-5 items-center justify-center rounded-r-md text-slate-400 shadow-md transition-colors hover:text-white md:flex print:hidden"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Drawer mobile (sempre expandido) */}
      <MobileNav navTop={navTop} />

      {/* Conteúdo à direita da navegação */}
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200 print:pl-0', contentPad)}>
        <Header />
        <MfaBanner />
        <main className="flex-1 p-4 md:p-8">
          <PageHeader />
          <div key={pathname} className="animate-page">
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Notificações (toasts) */}
      <ToastContainer />

      {/* Assistente de IA (Gemini) */}
      <AssistantChat />
    </div>
  );
}
