import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Shield, Lock, TrendingUp, Download, Search } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';

export function Configuracoes() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState(() => {
    try {
      return { modulo: 'geral', idioma: 'pt-BR', ...JSON.parse(localStorage.getItem('nexora-prefs') || '{}') };
    } catch {
      return { modulo: 'geral', idioma: 'pt-BR' };
    }
  });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({
    usuariosAtivos: 0,
    ultimosAcessos: 0,
    storageTotal: 0
  });
  const [configuracoes, setConfiguracoes] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, configuracoesData, auditData] = await Promise.all([
        api.getKpisConfiguracoes(),
        api.getConfiguracoesSistema(),
        api.getLogAudit(),
      ]);
      setKpisState(kpisData);
      const listaConfig = Array.isArray(configuracoesData) ? configuracoesData : (configuracoesData.config || []);
      const listaAudit = Array.isArray(auditData) ? auditData : (auditData.log || []);
      setConfiguracoes(listaConfig.map((c, i) => ({
        chave: c.nome ?? c.email ?? `Item ${i + 1}`,
        tipo: c.perfil ?? c.status ?? '',
        modulo: 'geral',
        valor: c.email ?? '',
      })));
      setAuditLog(listaAudit.map((a, i) => ({
        acao: a.acao ?? `Evento ${i + 1}`,
        tempo: a.timestamp ?? a.tempo ?? '',
      })));
    } catch (e) {
      console.error('Erro ao carregar dados de configurações:', e);
      toast('Erro ao carregar dados de configurações');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const k = kpisState;
  const dadosKpis = [
    { label: 'Usuários Ativos', valor: k.usuariosAtivos, destaque: true },
    { label: 'Últimos Acessos', valor: k.ultimosAcessos, destaque: true },
    { label: 'Storage Total', valor: `R$ ${k.storageTotal.toLocaleString('pt-BR')}`, destaque: false },
  ];

  const filtrados = configuracoes.filter(c => {
    if (busca && !`${c.chave} ${c.valor}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.modulo !== 'geral' && c.modulo !== filtros.modulo) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const paginaAtual = filtrados.slice((page - 1) * 10, page * 10);

  const kpiCards = dadosKpis.map((item) => (
    <div
      key={item.label}
      className={`rounded-xl border p-5 shadow-sm ${item.destaque
        ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}
      `}
    >
      <p className="text-xs font-medium text-slate-500">{item.label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${item.destaque ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
      >
        {item.valor}
      </p>
    </div>
  ));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Configurações</h1>
          <p className="text-sm text-slate-500">Ajustes do sistema e preferências do usuário</p>
        </div>
        <Button variant="secondary" onClick={() => {
          try {
            localStorage.setItem('nexora-prefs', JSON.stringify(filtros));
          } catch { /* sem persistência */ }
          toast('Preferências salvas neste navegador');
        }}>
          <Download className="h-4 w-4" /> Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Select label="Módulo" value={filtros.modulo} onChange={v => setFiltros(f => ({ ...f, modulo: v }))} options={[{ value: 'geral', label: 'Geral' }, { value: 'seguranca', label: 'Segurança' }, { value: 'integracoes', label: 'Integrações' }, { value: 'notificacoes', label: 'Notificações' }]} />
          <Select label="Idioma" value={filtros.idioma} onChange={v => setFiltros(f => ({ ...f, idioma: v }))} options={[{ value: 'pt-BR', label: 'Português (BR)' }, { value: 'en', label: 'English' }, { value: 'es', label: 'Español' }]} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências do Usuário</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Buscar configuração ou chave..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              type="text"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
          </CardHeader>
          <div className="h-80 overflow-y-auto">
            {loading ? (
              <Skeleton className="h-64 rounded-lg" />
            ) : paginaAtual.map(c => (
              <div key={c.chave} className="p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-between justify-between mb-2">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{c.chave}</span>
                  <span className="text-xs text-slate-500">{c.tipo}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '64%' }} aria-valuemin={0} aria-valuemax={100} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              Página {page} de {totalPaginas}
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPage(p => Math.min(totalPaginas, p + 1))} disabled={page === totalPaginas} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log de Auditoria Recente</CardTitle>
            </CardHeader>
            <CardContent className="h-80 space-y-3">
              {auditLog.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{a.acao}</span>
                  <span className="text-xs text-slate-500">{a.tempo}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segurança do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <div className="h-full space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100/50 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">Autenticação Ativa</span>
                    <span className="text-xs text-slate-500">SSO + MFA</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-red-100/50 flex items-center justify-center">
                    <Lock className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">Tentativas Falhas Hoje</span>
                    <span className="text-xs text-slate-500">0</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-100/50 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800">Última Atualização</span>
                    <span className="text-xs text-slate-500">Há 2 horas</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}