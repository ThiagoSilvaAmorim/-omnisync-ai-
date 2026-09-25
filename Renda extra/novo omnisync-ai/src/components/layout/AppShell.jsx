import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
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

  // Barra lateral: trilha de ícones (w-16) ou oculta (w-0).
  // Preferência persistida em localStorage (novo padrão de navegação).
  const [sidebarOculta, setSidebarOculta] = useState(() => {
    try {
      return localStorage.getItem('omnisync-sidebar-hidden') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const aplicar = () => {
      try {
        setSidebarOculta(localStorage.getItem('omnisync-sidebar-hidden') === '1');
      } catch {
        setSidebarOculta(false);
      }
    };
    window.addEventListener('storage', aplicar);
    return () => window.removeEventListener('storage', aplicar);
  }, []);

  const asideW = navTop ? 'w-64' : sidebarOculta ? 'w-0' : 'w-16';
  const contentPad = asideW === 'w-0' ? 'md:pl-0' : asideW === 'w-16' ? 'md:pl-16' : 'md:pl-64';

  const alternarSidebar = () => {
    setSidebarOculta(prev => {
      const next = !prev;
      try {
        localStorage.setItem('omnisync-sidebar-hidden', next ? '1' : '0');
      } catch {
        // Armazenamento indisponível: segue só em memória.
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navegação lateral fixa — desktop */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 md:block print:hidden',
        asideW,
        !navTop && sidebarOculta && 'invisible overflow-hidden'
      )}>
        {navTop ? <TopNav /> : <Sidebar />}
      </aside>

      {/* Botão fixo: ocultar/mostrar a barra lateral inteira */}
      {!navTop && (
        <button
          type="button"
          onClick={alternarSidebar}
          aria-label={sidebarOculta ? 'Mostrar menu lateral' : 'Ocultar menu lateral'}
          aria-pressed={sidebarOculta}
          data-testid="btn-toggle-sidebar"
          title={sidebarOculta ? 'Mostrar menu lateral' : 'Ocultar menu lateral'}
          className={cn(
            'fixed top-20 z-40 hidden h-12 w-6 items-center justify-center rounded-r-md border border-l-0 border-slate-200 bg-white text-slate-500 shadow-md transition-[left] duration-200 hover:text-primary-600',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400',
            'md:flex print:hidden',
            sidebarOculta ? 'left-0' : 'left-16'
          )}
        >
          {sidebarOculta ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
