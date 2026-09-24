import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

// ============================================
// NotFound — página 404 simples com atalho
// de volta ao Dashboard.
// ============================================
export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
        Página não encontrada
      </h1>
      <p className="max-w-sm text-sm text-slate-500">
        O endereço que você tentou acessar não existe ou ainda não foi implementado.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-500 active:scale-95"
      >
        <Home className="h-4 w-4" />
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
