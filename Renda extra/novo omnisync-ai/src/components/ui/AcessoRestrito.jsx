import { Lock } from 'lucide-react';

// ============================================
// AcessoRestrito — mensagem para telas que só o
// diretor (perfil Admin) pode ver.
// ============================================
export function AcessoRestrito() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Lock className="h-7 w-7 text-slate-400" />
      </div>
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Acesso restrito</h1>
      <p className="max-w-sm text-sm text-slate-500">
        Esta tela é exclusiva do Diretor (perfil Admin). Entre com uma conta de diretor para acessar.
      </p>
    </div>
  );
}
