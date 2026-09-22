import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Globe, Clock, CheckCircle, XCircle, Download, Search, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv, formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';

export function Integracao() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ status: 'ativo', tipo: 'todas' });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({
    integracaoAtiva: 0,
    totalEnvios: 0,
    taxaSucesso: 0,
    pending: 0
  });
  const [integracoes, setIntegracoes] = useState([]);
  const [log, setLog] = useState([]);

  // ML OAuth state
  const [mlStatus, setMlStatus] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, integracoesData, logData] = await Promise.all([
        api.getKpisIntegracao(),
        api.getIntegracao(),
        api.getLogIntegracao(),
      ]);
      setKpisState(kpisData);
      const lista = Array.isArray(integracoesData) ? integracoesData : (integracoesData.integracoes || []);
      const listaLog = Array.isArray(logData) ? logData : (logData.log || []);
      setIntegracoes(lista);
      setLog(listaLog.map((l, i) => ({
        mensagem: l.acao ?? l.mensagem ?? `Evento ${i + 1}`,
        tempo: l.timestamp ?? l.tempo ?? '',
      })));
    } catch (e) {
      console.error('Erro ao carregar dados de integrações:', e);
      toast('Erro ao carregar dados de integrações');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const carregarMlStatus = useCallback(async () => {
    try {
      const status = await api.mlGetStatus();
      setMlStatus(status);
    } catch (e) {
      console.error('Erro ao buscar status ML:', e);
      setMlStatus({ status: 'erro_sincronizacao' });
    }
  }, []);

  useEffect(() => {
    carregarDados();
    carregarMlStatus();
  }, [carregarDados, carregarMlStatus]);

  // Tratar retorno do callback OAuth (compatível com backend: ?connected=mercadolivre / ?error=).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'mercadolivre' || params.get('ml_connected') === 'true') {
      toast('Mercado Livre conectado com sucesso!');
      window.history.replaceState({}, document.title, window.location.pathname);
      carregarMlStatus();
    } else if (params.get('ml_error') || params.get('error')) {
      toast(`Erro ao conectar Mercado Livre: ${params.get('ml_error') || params.get('error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      carregarMlStatus();
    }
  }, [toast, carregarMlStatus]);

  const handleConectarML = async () => {
    setMlLoading(true);
    try {
      const { authUrl } = await api.mlStartOAuth();
      if (!authUrl || authUrl === '#') {
        toast('Autorização do Mercado Livre indisponível no momento');
        setMlLoading(false);
        return;
      }
      window.location.href = authUrl;
    } catch (e) {
      console.error('Erro ao iniciar OAuth ML:', e);
      toast('Erro ao iniciar conexão com Mercado Livre');
      setMlLoading(false);
    }
  };

  const handleDesconectarML = async () => {
    setMlLoading(true);
    try {
      await api.mlDisconnect();
      toast('Mercado Livre desconectado');
      carregarMlStatus();
    } catch (e) {
      console.error('Erro ao desconectar ML:', e);
      toast('Erro ao desconectar Mercado Livre');
    } finally {
      setMlLoading(false);
    }
  };

  const k = kpisState;
  const dadosKpis = [
    { label: 'Integração Ativa', valor: k.integracaoAtiva, destaque: true },
    { label: 'Total de Envios', valor: k.totalEnvios, destaque: true },
    { label: 'Taxa de Sucesso', valor: `${k.taxaSucesso}%`, destaque: false },
    { label: 'Pending', valor: k.pending, destaque: true },
  ];

  const filtrados = integracoes.filter(i => {
    if (busca && !`${i.nome} ${i.tipo}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.status !== 'todos' && i.status !== filtros.status) return false;
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

  const getStatusBadge = (status) => {
    const variants = {
      conectado: 'teal',
      conectando: 'amber',
      nao_configurado: 'slate',
      desconectado: 'slate',
      token_expirado: 'red',
      erro_sincronizacao: 'red',
    };
    const labels = {
      conectado: 'Conectado',
      conectando: 'Conectando...',
      nao_configurado: 'Não configurado',
      desconectado: 'Desconectado',
      token_expirado: 'Token expirado',
      erro_sincronizacao: 'Erro de sincronização',
    };
    return (
      <Badge variant={variants[status] || 'slate'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Integrações</h1>
          <p className="text-sm text-slate-500">Conexões com plataformas externas e serviços</p>
        </div>
        <Button variant="secondary" onClick={() => {
          exportarCsv('integracoes-omnisync.csv', [
            { titulo: 'Nome', chave: 'nome' },
            { titulo: 'Tipo', chave: 'tipo' },
            { titulo: 'Status', chave: 'status' },
          ], filtrados);
          toast(`${filtrados.length} integração(ões) exportadas em CSV`);
        }}>
          <Download className="h-4 w-4" /> Exportar relatório
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Select label="Status" value={filtros.status} onChange={v => setFiltros(f => ({ ...f, status: v }))} options={[{ value: 'todos', label: 'Todos' }, { value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }, { value: 'erro', label: 'Com Erro' }]} />
          <Select label="Tipo" value={filtros.tipo} onChange={v => setFiltros(f => ({ ...f, tipo: v }))} options={[{ value: 'todas', label: 'Todas' }, { value: 'ecommerce', label: 'E-commerce' }, { value: 'erp', label: 'ERP' }, { value: 'crm', label: 'CRM' }]} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conexões Ativas</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Buscar integração por nome ou tipo..."
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
            <CardTitle>Integrações Registradas</CardTitle>
          </CardHeader>
          <div className="h-96 overflow-y-auto">
            {loading ? (
              <Skeleton className="h-72 rounded-lg" />
            ) : paginaAtual.map(i => (
              <div key={i.id} className="p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{i.nome}</span>
                    <span className="text-xs text-slate-500">• {i.tipo}</span>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  <p>Status: {i.status}</p>
                  <p>Última sinc: {i.ultimaSinc}</p>
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
              <CardTitle>Mercado Livre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100/50 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">Mercado Livre</span>
                    <span className="text-xs text-slate-500">• Marketplace</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(mlStatus?.status || 'nao_configurado')}
                  {mlStatus?.conta?.mlUser && (
                    <span className="text-xs text-slate-500">
                      @{typeof mlStatus.conta.mlUser === 'string' ? mlStatus.conta.mlUser : mlStatus.conta.mlUser.nickname}
                    </span>
                  )}
                </div>
              </div>

              {mlStatus?.status === 'conectado' && mlStatus?.expiresAt && (
                <div className="text-xs text-slate-500">
                  Token expira em: {formatDate(new Date(mlStatus.expiresAt))}
                  {mlStatus.isExpired && <span className="text-red-500 ml-2">(expirado)</span>}
                </div>
              )}

              <div className="flex gap-2">
                {mlStatus?.status === 'token_expirado' ? (
                  <>
                    <Button
                      onClick={handleConectarML}
                      disabled={mlLoading}
                      className="flex-1"
                    >
                      {mlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reautorizar'}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleDesconectarML}
                      disabled={mlLoading}
                    >
                      Desconectar
                    </Button>
                  </>
                ) : mlStatus?.status === 'conectado' ? (
                  <Button
                    variant="secondary"
                    onClick={handleDesconectarML}
                    disabled={mlLoading}
                    className="flex-1"
                  >
                    {mlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Desconectar'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleConectarML}
                    disabled={mlLoading}
                    className="flex-1"
                  >
                    {mlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Conectar Mercado Livre'}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shopee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100/60 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">Shopee</span>
                    <span className="text-xs text-slate-500">• Marketplace</span>
                  </div>
                </div>
                <Badge variant="slate">Preparação pendente</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Integração preparada. Configure o aplicativo oficial e autorize a loja para sincronizar dados reais.
              </p>
              <Button variant="secondary" disabled className="flex-1 w-full">
                Aguardando configuração oficial
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TikTok Shop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center dark:bg-slate-800">
                    <Globe className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">TikTok Shop</span>
                    <span className="text-xs text-slate-500">• Marketplace</span>
                  </div>
                </div>
                <Badge variant="slate">Preparação pendente</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Integração preparada. Configure o aplicativo oficial e autorize a loja para sincronizar dados reais.
              </p>
              <Button variant="secondary" disabled className="flex-1 w-full">
                Aguardando configuração oficial
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs de Sincronização</CardTitle>
            </CardHeader>
            <CardContent className="h-72 space-y-3">
              {log.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{l.mensagem}</span>
                  <span className="text-xs text-slate-500">{l.tempo}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}