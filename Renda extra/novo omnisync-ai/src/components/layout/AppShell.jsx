import { Suspense, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
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

  // Largura da sidebar segue o estado de colapso (localStorage).
  const [sidebarW, setSidebarW] = useState(() => {
    try {
      return localStorage.getItem('omnisync-sidebar-collapsed') === '1' ? 'w-16' : 'w-64';
    } catch {
      return 'w-64';
    }
  });

  useEffect(() => {
    const aplicar = () => {
      try {
        setSidebarW(localStorage.getItem('omnisync-sidebar-collapsed') === '1' ? 'w-16' : 'w-64');
      } catch {
        setSidebarW('w-64');
      }
    };
    aplicar();
    window.addEventListener('storage', aplicar);
    // Sidebar grava no mesmo contexto: escuta custom event.
    window.addEventListener('omnisync-sidebar-toggle', aplicar);
    return () => {
      window.removeEventListener('storage', aplicar);
      window.removeEventListener('omnisync-sidebar-toggle', aplicar);
    };
  }, []);

  const contentPad = sidebarW === 'w-16' ? 'md:pl-16' : 'md:pl-64';
  const asideW = navTop ? 'w-64' : sidebarW;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navegação lateral fixa — desktop */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 md:block print:hidden', asideW)}>
        {navTop ? <TopNav /> : <Sidebar />}
      </aside>

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
