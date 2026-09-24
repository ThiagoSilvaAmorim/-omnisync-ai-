import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Infinity as InfinityIcon, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================
// Login — tela de autenticação.
// ============================================

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, senha);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <InfinityIcon className="h-8 w-8 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">OmniSync AI</h1>
            <p className="text-sm text-slate-500">Sistema inteligente de gestão multicanal</p>
          </div>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Entrar</h2>
          <p className="mb-5 text-sm text-slate-500">Acesse sua conta para continuar</p>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
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

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Mostrar senha"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 font-medium text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <p className="mb-1 font-medium text-slate-600 dark:text-slate-300">Credenciais de demonstração:</p>
            <p>E-mail: <span className="font-mono">admin@omnisync.ai</span> ou <span className="font-mono">t.bruno000@gmail.com</span></p>
            <p>Senha: <span className="font-mono">123456</span></p>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/esqueci-senha" className="text-primary-600 hover:underline dark:text-primary-400">
              Esqueci a senha?
            </Link>
            <Link to="/cadastro" className="text-primary-600 hover:underline dark:text-primary-400">
              Criar conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
