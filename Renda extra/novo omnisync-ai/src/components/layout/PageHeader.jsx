import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, LayoutDashboard } from 'lucide-react';
import { getPageMeta } from '../../lib/navigation';

// ============================================
// PageHeader — barra de navegação automática
// (breadcrumb) exibida no topo de TODAS as páginas.
// Mostra: Início > Seção > Página. O título grande
// fica a cargo de cada página (h1 próprio).
// ============================================
export function PageHeader() {
  const { pathname } = useLocation();
  const { nome, Icone, secao } = getPageMeta(pathname);

  // Na home, não mostramos o breadcrumb (já é a raiz).
  if (pathname === '/dashboard') {
    return <div className="sr-only mb-6">Dashboard</div>;
  }

  return (
    <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 print:hidden">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {secao && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-slate-500 dark:text-slate-400">{secao}</span>
        </>
      )}
      <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
        <Icone className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
        {nome}
      </span>
      <span className="ml-auto text-slate-300 dark:text-slate-600">
        <LayoutDashboard className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
