import { useCallback, useEffect, useState } from 'react';
import { Plug, RefreshCw, Store, Unplug } from 'lucide-react';
// Tela /integrations — conexões de conta (Mercado Livre + Shopee).
// Fonte única de verdade: GET /api/integracoes/ml/status (dados reais do
// backend, incluindo o progresso do sync inicial em `products`).
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

const ROTULOS_SYNC = {
  ocioso: 'Aguardando primeira sincronização',
  rodando: 'Sincronizando',
  ok: 'Sincronizado',
  erro: 'Erro de sincronização',
};

function chipStatus(status) {
  if (status === 'conectado') return { texto: 'Ativa', classe: 'bg-teal-100 text-teal-700', ponto: 'bg-teal-500' };
  if (status === 'token_expirado') return { texto: 'Token expirado', classe: 'bg-amber-100 text-amber-700', ponto: 'bg-amber-500' };
  if (status === 'desconectado') return { texto: 'Inativa', classe: 'bg-slate-100 text-slate-600', ponto: 'bg-slate-400' };
  return { texto: 'Não conectada', classe: 'bg-slate-100 text-slate-600', ponto: 'bg-slate-400' };
}

export function Integrations() {
  const toast = useToast();
  const [ml, setMl] = useState(null);
  const [shopee, setShopee] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [acao, setAcao] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [statusMl, statusShopee] = await Promise.all([
        api.integracoesMl.status(),
        api.integracoesMl.shopeeStatus().catch(() => ({ status: 'indisponivel' })),
      ]);
      setMl(statusMl);
      setShopee(statusShopee);
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Retorno do OAuth (o callback redireciona para cá com ?connected= ou ?error=).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conectado = params.get('connected');
    const falha = params.get('error');
    if (conectado === 'mercadolivre') {
      toast('Mercado Livre conectado. Sincronização inicial iniciada.');
      carregar();
    } else if (falha) {
      toast(`Falha ao conectar: ${falha}`);
    }
    if (conectado || falha) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, carregar]);

  // Enquanto o sync inicial roda, a barra acompanha o progresso (3 em 3s).
  const statusSync = ml?.sincronizacao?.status;
  useEffect(() => {
    if (statusSync !== 'rodando') return undefined;
    const timer = setInterval(carregar, 3000);
    return () => clearInterval(timer);
  }, [statusSync, carregar]);

  const conectarML = () => {
    const url = api.integracoesMl.authorizeUrl(ml?.empresaId || 1);
    if (!url) {
      toast('Backend indisponível: configure VITE_API_URL');
      return;
    }
    setAcao('ml');
    window.location.href = url;
  };

  const inativarML = async () => {
    setAcao('ml-inativar');
    try {
      await api.mlDisconnect();
      toast('Conta do Mercado Livre marcada como inativa (token mantido).');
      await carregar();
    } catch (e) {
      toast(`Erro ao inativar: ${e.message}`);
    } finally {
      setAcao('');
    }
  };

  const conectarShopee = async () => {
    setAcao('shopee');
    try {
      await api.integracoesMl.shopeeStart();
      toast('Shopee pronta para configuração.');
    } catch (e) {
      toast(e.message);
    } finally {
      setAcao('');
    }
  };

  if (carregando) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Conexões</h1>
          <p className="text-sm text-slate-500">Conecte suas contas de marketplace</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Conexões</h1>
        </div>
        <EmptyState
          icon={Plug}
          title="Sem conexão com o backend"
          description={`${erro} — recarregue a página ou tente novamente.`}
        />
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => { setCarregando(true); carregar(); }}>
            <RefreshCw className="h-4 w-4" /> Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  const chip = chipStatus(ml?.status);
  const sync = ml?.sincronizacao || { status: 'ocioso', total: 0, feitos: 0, erro: null };
  const conectado = !!ml?.conectado;
  const percentual = sync.total > 0 ? Math.min(100, Math.round((sync.feitos / sync.total) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Conexões</h1>
        <p className="text-sm text-slate-500">Conecte suas contas de marketplace para buscar dados reais</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card Mercado Livre */}
        <Card data-testid="card-ml">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 font-bold text-yellow-700">
                  ML
                </div>
                <div>
                  <CardTitle>Mercado Livre</CardTitle>
                  <p className="text-xs text-slate-500">Catálogo, tendências e anúncios</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${chip.classe}`}>
                <span className={`h-2 w-2 rounded-full ${sync.status === 'rodando' ? 'animate-pulse bg-blue-500' : chip.ponto}`} />
                {sync.status === 'rodando' ? 'Sincronizando' : chip.texto}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conectado || ml?.sellerId ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Seller ID</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">{ml.sellerId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Apelido</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">{ml.nickname || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Conta criada em</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">
                    {ml.criadoEm ? new Date(ml.criadoEm).toLocaleDateString('pt-BR') : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Última sincronização</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">
                    {sync.finalizadoEm
                      ? new Date(sync.finalizadoEm).toLocaleString('pt-BR')
                      : conectado ? 'Em andamento' : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">
                Nenhuma conta conectada. Ao conectar, o Mercado Livre autoriza a leitura dos seus anúncios e
                sincronizamos tudo para a base automaticamente.
              </p>
            )}

            {/* Progresso do sync inicial (dado real de /status, nunca inventado). */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {sync.status === 'rodando'
                    ? `Sincronizando ${sync.feitos} de ${sync.total} anúncios`
                    : ROTULOS_SYNC[sync.status] || ROTULOS_SYNC.ocioso}
                </span>
                {sync.status === 'rodando' && sync.total > 0 && (
                  <span className="text-slate-500">{percentual}%</span>
                )}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all ${sync.status === 'erro' ? 'bg-red-500' : 'bg-primary-600'}`}
                  style={{ width: sync.status === 'rodando' ? `${sync.total > 0 ? percentual : 40}%` : sync.status === 'ok' ? '100%' : sync.status === 'erro' ? '100%' : '0%' }}
                />
              </div>
              {sync.status === 'erro' && sync.erro && (
                <p className="mt-2 text-xs text-red-600">{sync.erro}</p>
              )}
              {sync.status === 'ok' && sync.total === 0 && (
                <p className="mt-2 text-xs text-slate-500">0 anúncios na conta — nada para sincronizar.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!conectado ? (
                <Button onClick={conectarML} disabled={acao === 'ml'}>
                  <Store className="h-4 w-4" /> {acao === 'ml' ? 'Abrindo...' : 'Conectar'}
                </Button>
              ) : (
                <Button variant="secondary" onClick={inativarML} disabled={acao === 'ml-inativar'}>
                  <Unplug className="h-4 w-4" /> {acao === 'ml-inativar' ? 'Inativando...' : 'Inativar'}
                </Button>
              )}
              <Button variant="secondary" onClick={() => carregar()}>
                <RefreshCw className="h-4 w-4" /> Atualizar status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card Shopee */}
        <Card data-testid="card-shopee">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-600">
                  SP
                </div>
                <div>
                  <CardTitle>Shopee</CardTitle>
                  <p className="text-xs text-slate-500">Pedidos e anúncios da Shopee</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${shopee?.status === 'configuration_pending' ? 'bg-amber-100 text-amber-700' : shopee?.status === 'conectado' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                <span className={`h-2 w-2 rounded-full ${shopee?.status === 'configuration_pending' ? 'bg-amber-500' : shopee?.status === 'conectado' ? 'bg-teal-500' : 'bg-slate-400'}`} />
                {shopee?.status === 'configuration_pending' ? 'Preparação pendente' : shopee?.status === 'conectado' ? 'Ativa' : 'Indisponível'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Sem aplicativo oficial da Shopee configurado no backend, nenhuma conexão é afirmada: o status
              vem real de <code className="text-xs">/api/auth/shopee/status</code> e a autorização da loja
              fica pendente até o app oficial (partner id/key) existir.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
              Status reportado pelo backend: <strong>{shopee?.status || 'desconhecido'}</strong>
              {' • '}Conta: {shopee?.conta ? 'vinculada' : 'não vinculada'}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={conectarShopee} disabled={acao === 'shopee'}>
                <Plug className="h-4 w-4" /> {acao === 'shopee' ? 'Verificando...' : 'Conectar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
