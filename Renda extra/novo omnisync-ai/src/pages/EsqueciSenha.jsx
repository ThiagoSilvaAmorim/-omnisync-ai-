import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Infinity as InfinityIcon, Mail } from 'lucide-react';

// ============================================
// EsqueciSenha — recuperação de senha (mock).
// ============================================

export function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (!email.trim()) return;
    setEnviado(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <InfinityIcon className="h-8 w-8 text-white" />
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recuperar senha</h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {enviado ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-teal-500" />
              <p className="mt-4 font-medium text-slate-800 dark:text-slate-100">Enviamos um e-mail!</p>
              <p className="mt-2 text-sm text-slate-500">
                Se <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-500">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">E-mail</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </label>
              <button
                type="submit"
                className="h-10 w-full rounded-lg bg-primary-600 font-medium text-white transition-all hover:bg-primary-500 active:scale-95"
              >
                Enviar link
              </button>
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para o login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
