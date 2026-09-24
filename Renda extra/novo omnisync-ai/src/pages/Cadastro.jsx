import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Infinity as InfinityIcon, Loader2, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================
// Cadastro — criação de conta.
// ============================================

export function Cadastro() {
  const { registrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await registrar(nome, email, senha);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <InfinityIcon className="h-8 w-8 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Criar sua conta</h1>
            <p className="text-sm text-slate-500">Comece grátis por 14 dias</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          {erro && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {erro}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Nome</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  required
                  placeholder="Seu nome"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </label>

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
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary-600 font-medium text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Criando...' : 'Criar conta grátis'}
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
