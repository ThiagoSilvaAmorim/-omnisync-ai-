import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserCog } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { normalizarPerfil } from '../lib/permissoes';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// Usuários — lista de contas e perfis canônicos
// (Diretor, Comercial, Estoquista).
// Leitura via GET /api/usuarios. Criação e
// edição seguem BLOCKED até existir tabela de
// usuários no Neon (ver PROGRESS.md).
// ============================================

const PERFIL_VARIANT = { Diretor: 'indigo', Comercial: 'sky', Estoquista: 'teal' };
const STATUS_VARIANT = { ativo: 'teal', inativo: 'slate' };

export function Usuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    api.getUsuarios()
      .then(lista => { if (ativo) setUsuarios(Array.isArray(lista) ? lista : []); })
      .catch(e => {
        console.error('Erro ao carregar usuários:', e);
        toast('Erro ao carregar usuários');
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [toast]);

  const filtrados = usuarios.filter(u => {
    if (!busca) return true;
    return `${u.nome ?? ''} ${u.email ?? ''}`.toLowerCase().includes(busca.toLowerCase());
  });

  const totalAtivos = usuarios.filter(u => u.status === 'ativo').length;
  const totalDiretores = usuarios.filter(u => normalizarPerfil(u.perfil) === 'Diretor').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Usuários</h1>
          <p className="text-sm text-slate-500">Contas, perfis de acesso e MFA (via Segurança)</p>
        </div>
        <Link
          to="/seguranca"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <ShieldCheck className="h-4 w-4" /> Gerenciar em Segurança
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading ? (
          [0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          [
            { label: 'Total de usuários', valor: usuarios.length },
            { label: 'Ativos', valor: totalAtivos },
            { label: 'Diretores', valor: totalDiretores },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{k.valor}</p>
            </div>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contas cadastradas</CardTitle>
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Perfil</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-3">
                    <Skeleton className="h-12 rounded-lg" />
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sm text-slate-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map(u => {
                  const perfil = normalizarPerfil(u.perfil);
                  return (
                    <tr key={u.id ?? u.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">
                        <span className="flex items-center gap-2">
                          <UserCog className="h-4 w-4 text-slate-400" /> {u.nome}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3"><Badge variant={PERFIL_VARIANT[perfil] ?? 'slate'}>{perfil}</Badge></td>
                      <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[u.status] ?? 'slate'}>{u.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
