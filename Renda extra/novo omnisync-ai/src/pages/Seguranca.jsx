import { useEffect, useState } from 'react';
import { Download, Pencil, ShieldCheck, UserPlus } from 'lucide-react';
import { auditLog, usuarios } from '../data/mockData';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv } from '../lib/utils';
import { MODULOS_EDITAVEIS, podeAcessar } from '../lib/permissoes';
import { Modal } from '../components/ui/Modal';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';

// ============================================
// Tela 08 — Segurança e Usuários.
// ============================================

const TABS = ['Usuários e perfis', 'MFA', 'Audit Log'];

const PERFIL_VARIANT = { Admin: 'indigo', Operador: 'sky', Visualizador: 'slate' };
const STATUS_VARIANT = { ativo: 'teal', inativo: 'slate' };

export function Seguranca() {
  const toast = useToast();
  const [tab, setTab] = useState('Usuários e perfis');

  // Estado local do MFA (não persiste).
  const [mfa, setMfa] = useState(() => Object.fromEntries(usuarios.map(u => [u.id, u.mfaConfigurado])));

  const [buscaAudit, setBuscaAudit] = useState('');
  // Trilha de auditoria real: eventos do barramento do backend.
  const [auditLog, setAuditLog] = useState([]);
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const r = await api.fetchAtividadesComFiltros(new URLSearchParams({ limit: '100' }));
        const lista = Array.isArray(r) ? r : (Array.isArray(r?.eventos) ? r.eventos : []);
        if (ativo) {
          setAuditLog(lista.map(e => ({
            timestamp: e?.timestamp || '',
            usuario: e?.source_agent || 'sistema',
            acao: e?.type || 'evento',
            origem: e?.entity_type || 'sistema',
          })).filter(a => a.timestamp));
        }
      } catch {
        if (ativo) setAuditLog([]);
      }
    })();
    return () => { ativo = false; };
  }, []);
  const [periodoAudit, setPeriodoAudit] = useState('todos');
  const [editando, setEditando] = useState(null);
  const [perfis, setPerfis] = useState(() => Object.fromEntries(usuarios.map(u => [u.id, u.perfil])));

  const salvarPerfil = () => {
    if (!editando) return;
    toast(`Perfil de ${editando.nome} atualizado para ${perfis[editando.id]}`);
    setEditando(null);
  };
  const [emailConvite, setEmailConvite] = useState('');
  const [convites, setConvites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexora-convites') || '[]');
    } catch {
      return [];
    }
  });
  // Exceções de RBAC vivem em localStorage (lidas por podeAcessar); este
  // contador só força novo render após salvar uma alteração.
  const [, setExcecoesTick] = useState(0);

  const toggleMfa = id => setMfa(m => ({ ...m, [id]: !m[id] }));

  // Prazo de MFA: 7 dias desde a primeira detecção de pendência.
  const pendentesMfa = usuarios.filter(u => !mfa[u.id]).length;
  const [diasRestantesMfa, setDiasRestantesMfa] = useState(7);
  useEffect(() => {
    try {
      let desde = localStorage.getItem('nexora-mfa-desde');
      if (pendentesMfa > 0 && !desde) {
        desde = new Date().toISOString();
        localStorage.setItem('nexora-mfa-desde', desde);
      }
      if (desde) {
        setDiasRestantesMfa(Math.max(0, 7 - Math.floor((Date.now() - new Date(desde).getTime()) / 86400000)));
      }
    } catch { /* sem persistência */ }
  }, [pendentesMfa]);

  const alternarExcecao = (perfil, modulo) => {
    try {
      const atual = podeAcessar(perfil, modulo);
      const prev = JSON.parse(localStorage.getItem('nexora-rbac') || '{}');
      const next = { ...prev, [perfil]: { ...(prev[perfil] || {}), [modulo]: !atual } };
      localStorage.setItem('nexora-rbac', JSON.stringify(next));
    } catch { /* sem persistência */ }
    setExcecoesTick(t => t + 1);
    toast('Permissão personalizada salva');
  };

  const convidar = () => {
    const email = emailConvite.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast('Digite um e-mail válido para convidar');
      return;
    }
    const convite = { email, quando: new Date().toLocaleString('pt-BR'), token: `convite-${Date.now().toString(36)}` };
    setConvites(prev => {
      const next = [convite, ...prev].slice(0, 20);
      try {
        localStorage.setItem('nexora-convites', JSON.stringify(next));
      } catch { /* sem persistência */ }
      return next;
    });
    setEmailConvite('');
    toast(`Convite criado para ${email} (token temporário gerado)`);
  };

  const exportarAuditoria = () => {
    exportarCsv('auditoria-omnisync.csv', [
      { titulo: 'Timestamp', chave: 'timestamp' },
      { titulo: 'Usuário', chave: 'usuario' },
      { titulo: 'Ação', chave: 'acao' },
      { titulo: 'Origem', chave: 'origem' },
    ], auditFiltrado);
    toast('Trilha de auditoria exportada em CSV');
  };

  const auditFiltrado = auditLog.filter(a => {
    if (buscaAudit && !`${a.usuario} ${a.acao}`.toLowerCase().includes(buscaAudit.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Segurança e Usuários</h1>
        <p className="text-sm text-slate-500">Gerencie acessos, perfis e acompanhe a trilha de auditoria</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Usuários e perfis */}
      {tab === 'Usuários e perfis' && (
        <>
        <Card>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Convidar novo usuário (e-mail)" value={emailConvite} onChange={e => setEmailConvite(e.target.value)} placeholder="colaborador@empresa.com" />
            </div>
            <Button onClick={convidar}>
              <UserPlus className="h-4 w-4" /> Convidar
            </Button>
          </div>
          {convites.length > 0 && (
            <div className="space-y-1.5 px-5 pb-5">
              {convites.map((c, i) => (
                <p key={i} className="text-xs text-slate-500">
                  Convite pendente: <span className="font-mono">{c.email}</span> • token <span className="font-mono">{c.token}</span> • {c.quando}
                </p>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>RBAC personalizado por módulo</CardTitle>
            <p className="text-xs text-slate-500">Exceções por perfil (Diretor sempre tem acesso total). Passkeys/FIDO2 exigem backend WebAuthn — BLOCKED.</p>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Módulo</th>
                  <th className="px-5 py-3 text-center font-medium">Comercial</th>
                  <th className="px-5 py-3 text-center font-medium">Estoquista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {MODULOS_EDITAVEIS.map(mod => (
                  <tr key={mod} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{mod}</td>
                    {['Comercial', 'Estoquista'].map(perfil => (
                      <td key={perfil} className="px-5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={podeAcessar(perfil, mod)}
                          onChange={() => alternarExcecao(perfil, mod)}
                          aria-label={`${perfil} acessa ${mod}`}
                          className="h-4 w-4 accent-primary-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">E-mail</th>
                  <th className="px-5 py-3 font-medium">Perfil</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{u.nome}</td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3"><Badge variant={PERFIL_VARIANT[perfis[u.id]] ?? 'slate'}>{perfis[u.id]}</Badge></td>
                    <td className="px-5 py-3"><Badge variant={STATUS_VARIANT[u.status]}>{u.status === 'ativo' ? 'Ativo' : 'Inativo'}</Badge></td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => setEditando(u)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-500 dark:text-primary-400"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar permissões
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}

      {/* MFA */}
      {tab === 'MFA' && (
        <Card>
          <CardHeader>
            <CardTitle>Autenticação de dois fatores</CardTitle>
            <p className="text-xs text-slate-500">
              {pendentesMfa === 0
                ? 'Todas as contas com MFA configurado.'
                : `${pendentesMfa} conta(s) pendente(s) — bloqueio de navegação em ${diasRestantesMfa} dia(s).`}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {usuarios.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{u.nome}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={mfa[u.id] ? 'teal' : 'amber'}>{mfa[u.id] ? 'Configurado' : 'Pendente'}</Badge>
                  <button
                    type="button"
                    onClick={() => toggleMfa(u.id)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${mfa[u.id] ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    aria-label={`Alternar MFA de ${u.nome}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${mfa[u.id] ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {tab === 'Audit Log' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Trilha de auditoria</CardTitle>
              <Button variant="secondary" onClick={exportarAuditoria}>
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={buscaAudit} onChange={e => setBuscaAudit(e.target.value)} placeholder="Buscar por usuário ou ação..." className="sm:w-72" />
              <Select
                value={periodoAudit}
                onChange={setPeriodoAudit}
                options={[
                  { value: 'todos', label: 'Todo o período' },
                  { value: '7d', label: 'Últimos 7 dias' },
                  { value: '30d', label: 'Últimos 30 dias' },
                ]}
                className="sm:w-44"
              />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Timestamp</th>
                  <th className="px-5 py-3 font-medium">Usuário</th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditFiltrado.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{a.timestamp}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{a.usuario}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{a.acao}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{a.origem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={!!editando} onClose={() => setEditando(null)} title={`Permissões — ${editando?.nome}`}>
        <Select
          label="Perfil de acesso"
          value={editando ? perfis[editando.id] : 'Operador'}
          onChange={v => editando && setPerfis(prev => ({ ...prev, [editando.id]: v }))}
          options={[{ value: 'Admin', label: 'Admin (Diretor)' }, { value: 'Operador', label: 'Operador' }, { value: 'Visualizador', label: 'Visualizador' }]}
        />
        <p className="mt-2 text-xs text-slate-500">O perfil passa a valer na sessão atual e no RBAC personalizado abaixo.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setEditando(null)}>
            Cancelar
          </Button>
          <Button onClick={salvarPerfil}>
            Salvar
          </Button>
        </div>
      </Modal>

      {/* Rodapé fixo */}
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4" />
        A segurança é aplicada no backend e refletida na experiência, sem expor dados sensíveis.
      </p>
    </div>
  );
}
