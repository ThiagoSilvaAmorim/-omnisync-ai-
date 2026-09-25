import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Globe, Plug, RefreshCw, Search, Store, Unplug } from 'lucide-react';
// Tela /integrations — única tela de integrações (fusão com /integracao):
// conexões de conta (Mercado Livre + Shopee + TikTok), anúncios do sync,
// KPIs, integrações registradas e logs de sincronização.
// Fonte única de verdade: GET /api/integracoes/ml/status (dados reais do
// backend, incluindo o progresso do sync inicial em `products`).
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { exportarCsv } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
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
  // Multi-loja (portada da tela antiga): loja selecionada + detalhe via /auth/ml/status.
  const [lojaSel, setLojaSel] = useState('');
  const [lojaDetalhe, setLojaDetalhe] = useState(null);
  // Anúncios vindos do sync inicial (products com mlItemId).
  const [anuncios, setAnuncios] = useState([]);
  const [totalAnuncios, setTotalAnuncios] = useState(0);
  const [carregandoAnuncios, setCarregandoAnuncios] = useState(false);
  // Bloco legado de /integracao: KPIs, registradas, logs e TikTok (1 carga).
  const [kpis, setKpis] = useState({ integracaoAtiva: 0, totalEnvios: 0, taxaSucesso: 0, pending: 0 });
  const [registradas, setRegistradas] = useState([]);
  const [logSync, setLogSync] = useState([]);
  const [tiktok, setTiktok] = useState(null);
  const [carregandoExtras, setCarregandoExtras] = useState(true);
  const [filtros, setFiltros] = useState({ status: 'todos', categoria: 'todas' });
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  const carregarExtras = useCallback(async () => {
    setCarregandoExtras(true);
    try {
      const [kpisData, integData, logData, tiktokData] = await Promise.all([
        api.getKpisIntegracao(),
        api.getIntegracao(),
        api.getLogIntegracao(),
        api.tiktokShopStatus().catch(() => ({ status: 'indisponivel' })),
      ]);
      setKpis(kpisData || { integracaoAtiva: 0, totalEnvios: 0, taxaSucesso: 0, pending: 0 });
      const lista = Array.isArray(integData) ? integData : (integData?.integracoes || []);
      setRegistradas(lista);
      const listaLog = Array.isArray(logData) ? logData : (logData?.log || []);
      setLogSync(listaLog.map((l, i) => ({
        mensagem: l.acao ?? l.mensagem ?? `Evento ${i + 1}`,
        tempo: l.timestamp ?? l.tempo ?? '',
      })));
      setTiktok(tiktokData);
    } catch {
      toast('Erro ao carregar dados de integrações');
    } finally {
      setCarregandoExtras(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarExtras();
  }, [carregarExtras]);

  const carregarAnuncios = useCallback(async () => {
    setCarregandoAnuncios(true);
    try {
      const r = await api.produtosMl(1, 48);
      setAnuncios(Array.isArray(r?.items) ? r.items : []);
      setTotalAnuncios(Number(r?.total) || 0);
    } catch {
      setAnuncios([]);
      setTotalAnuncios(0);
    } finally {
      setCarregandoAnuncios(false);
    }
  }, []);

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

  // Anúncios sincronizados: carrega quando conectado e recarrega quando o
  // sync finaliza (finalizadoEm muda) — nunca em loop de fundo.
  const chaveSync = ml?.sincronizacao?.finalizadoEm || '';
  useEffect(() => {
    if (!ml?.conectado) {
      setAnuncios([]);
      setTotalAnuncios(0);
      return undefined;
    }
    carregarAnuncios();
    return undefined;
  }, [ml?.conectado, chaveSync, carregarAnuncios]);

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

  const trocarLoja = async (id) => {
    setLojaSel(id);
    if (!id) {
      setLojaDetalhe(null);
      return;
    }
    try {
      setLojaDetalhe(await api.mlGetStatus(id));
    } catch {
      setLojaDetalhe(null);
    }
  };

  if (carregando) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Integrações</h1>
          <p className="text-sm text-slate-500">Conecte suas contas de marketplace</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Integrações</h1>
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

  const chip = chipStatus(lojaDetalhe?.status ?? ml?.status);
  const sync = ml?.sincronizacao || { status: 'ocioso', total: 0, feitos: 0, erro: null };
  const conectado = !!ml?.conectado;
  const percentual = sync.total > 0 ? Math.min(100, Math.round((sync.feitos / sync.total) * 100)) : 0;

  // Integrações registradas: busca + filtros com os campos REAIS da API
  // (nome/categoria/status — a tela antiga filtrava por "ativo" e não achava).
  const categorias = [...new Set(registradas.map(i => i.categoria || i.tipo).filter(Boolean))].sort();
  const filtradas = registradas.filter(i => {
    const texto = `${i.nome || ''} ${i.categoria || i.tipo || ''}`.toLowerCase();
    if (busca && !texto.includes(busca.toLowerCase())) return false;
    if (filtros.status !== 'todos' && i.status !== filtros.status) return false;
    if (filtros.categoria !== 'todas' && (i.categoria || i.tipo) !== filtros.categoria) return false;
    return true;
  });
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / 10));
  const paginaAtual = filtradas.slice((pagina - 1) * 10, pagina * 10);

  const kpisCards = [
    { label: 'Integrações ativas', valor: kpis.integracaoAtiva, destaque: true },
    { label: 'Total de envios', valor: kpis.totalEnvios, destaque: true },
    { label: 'Taxa de sucesso', valor: `${kpis.taxaSucesso}%`, destaque: false },
    { label: 'Pendências', valor: kpis.pending, destaque: true },
  ].map(item => (
    <div
      key={item.label}
      className={`rounded-xl border p-5 shadow-sm ${item.destaque
        ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
    >
      <p className="text-xs font-medium text-slate-500">{item.label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${item.destaque ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
        {item.valor}
      </p>
    </div>
  ));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Integrações</h1>
        <p className="text-sm text-slate-500">Conexões de conta, indicadores e logs das plataformas externas</p>
      </div>

      {/* Indicadores gerais (bloco legado de /integracao) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="kpis-integracao">
        {kpisCards}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
            {/* Seletor de loja (multi-loja ML): só quando há 2+ contas vinculadas. */}
            {Array.isArray(ml?.sellers) && ml.sellers.length > 1 && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                Loja:
                <select
                  value={lojaSel}
                  onChange={e => trocarLoja(e.target.value)}
                  aria-label="Loja"
                  className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="">Conta atual</option>
                  {ml.sellers.map(s => (
                    <option key={s.mlUserId} value={s.mlUserId}>{s.nickname || s.mlUserId}</option>
                  ))}
                </select>
              </label>
            )}
            {conectado || ml?.sellerId ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Seller ID</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100">
                    {lojaDetalhe?.conta?.mlUserId || ml.sellerId || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Apelido</dt>
                  <dd className="font-medium text-slate-800 dark:text-slate-100" data-testid="dd-apelido">
                    {lojaDetalhe?.conta?.mlUser?.nickname || ml.nickname || '—'}
                  </dd>
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

        {/* Card TikTok Shop — status real de /api/auth/tiktok-shop/status */}
        <Card data-testid="card-tiktok">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  TT
                </div>
                <div>
                  <CardTitle>TikTok Shop</CardTitle>
                  <p className="text-xs text-slate-500">Vídeos e campanhas com catálogo</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tiktok?.status === 'conectado' ? 'bg-teal-100 text-teal-700' : tiktok?.status === 'configuration_pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                <span className={`h-2 w-2 rounded-full ${tiktok?.status === 'conectado' ? 'bg-teal-500' : tiktok?.status === 'configuration_pending' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                {tiktok?.status === 'conectado' ? 'Ativa' : tiktok?.status === 'configuration_pending' ? 'Preparação pendente' : 'Indisponível'}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Sem app oficial da TikTok Shop configurado no backend, nenhuma conexão é afirmada: o status
              vem real de <code className="text-xs">/api/auth/tiktok-shop/status</code> e a autorização da
              loja fica pendente até o app oficial (app key/secret) existir.
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
              Status reportado pelo backend: <strong>{tiktok?.status || 'carregando'}</strong>
              {' • '}Conta: {tiktok?.conta ? 'vinculada' : 'não vinculada'}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" disabled>
                <Plug className="h-4 w-4" /> Aguardando configuração oficial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anúncios vindos do sync inicial (products por mlItemId) */}
      {ml?.conectado && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Anúncios sincronizados</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Gravados em products por item_id do ML (upsert automático após conectar). Total na base: {totalAnuncios}.
              </p>
            </div>
            <Button variant="secondary" onClick={carregarAnuncios} disabled={carregandoAnuncios}>
              <RefreshCw className={`h-4 w-4 ${carregandoAnuncios ? 'animate-spin' : ''}`} /> Atualizar lista
            </Button>
          </CardHeader>
          <CardContent>
            {carregandoAnuncios ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : anuncios.length === 0 ? (
              <p className="text-sm text-slate-500">
                0 anúncios na conta — nada para sincronizar. Novos anúncios entram sozinhos na próxima conexão.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {anuncios.map(a => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100" title={a.name}>{a.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {a.mlItemId} • {a.statusMl || '—'} • {Number(a.vendidos || 0).toLocaleString('pt-BR')} vendidos
                        {a.sincronizadoEm ? ` • sinc. ${new Date(a.sincronizadoEm).toLocaleString('pt-BR')}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {a.preco != null
                        ? (a.moeda === 'BRL' || !a.moeda
                          ? Number(a.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : `${Number(a.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${a.moeda}`)
                        : '—'}
                    </span>
                    {a.permalink && (
                      <a
                        href={a.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir anúncio no Mercado Livre"
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integrações registradas + logs (bloco legado de /integracao) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-testid="registradas">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Integrações registradas</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">
                Lista de plataformas cadastradas (GET /api/integracoes). Total: {filtradas.length}
                {filtradas.length !== registradas.length ? ` de ${registradas.length}` : ''}.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Buscar por nome ou categoria..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPagina(1); }}
                  aria-label="Buscar integração registrada"
                  className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
              <Select
                value={filtros.status}
                onChange={v => { setFiltros(f => ({ ...f, status: v })); setPagina(1); }}
                options={[
                  { value: 'todos', label: 'Status: todos' },
                  { value: 'conectado', label: 'Conectado' },
                  { value: 'desconectado', label: 'Desconectado' },
                ]}
                className="w-40"
                aria-label="Filtrar por status"
              />
              <Select
                value={filtros.categoria}
                onChange={v => { setFiltros(f => ({ ...f, categoria: v })); setPagina(1); }}
                options={[
                  { value: 'todas', label: 'Categoria: todas' },
                  ...categorias.map(c => ({ value: c, label: c })),
                ]}
                className="w-44"
                aria-label="Filtrar por categoria"
              />
              <Button
                variant="secondary"
                disabled={filtradas.length === 0}
                onClick={() => exportarCsv('integracoes-registradas', [
                  { chave: 'nome', titulo: 'Nome' },
                  { chave: 'categoria', titulo: 'Categoria' },
                  { chave: 'status', titulo: 'Status' },
                  { chave: 'descricao', titulo: 'Descrição' },
                ], filtradas)}
              >
                <Download className="h-4 w-4" /> CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {carregandoExtras ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : paginaAtual.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma integração encontrada com esses filtros.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginaAtual.map(i => (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{i.nome}</p>
                      <p className="truncate text-[11px] text-slate-500">{i.categoria || i.tipo || '—'}{i.descricao ? ` • ${i.descricao}` : ''}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${i.status === 'conectado' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>
                      <span className={`h-2 w-2 rounded-full ${i.status === 'conectado' ? 'bg-teal-500' : 'bg-slate-400'}`} />
                      {i.status === 'conectado' ? 'Conectado' : i.status || 'desconhecido'}
                    </span>
                    {i.authUrl && (
                      <a
                        href={i.authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Abrir ${i.nome}`}
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {totalPaginas > 1 && (
              <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-500">
                <Button variant="secondary" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span>Página {pagina} de {totalPaginas}</span>
                <Button variant="secondary" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}>
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="logs-sync">
          <CardHeader>
            <CardTitle>Logs de sincronização</CardTitle>
          </CardHeader>
          <CardContent>
            {carregandoExtras ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : logSync.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum evento de sincronização registrado.</p>
            ) : (
              <ul className="max-h-72 space-y-3 overflow-y-auto pr-1">
                {logSync.map((l, i) => (
                  <li key={`${l.tempo}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200" title={l.mensagem}>{l.mensagem}</span>
                    <span className="shrink-0 text-xs text-slate-400">{l.tempo ? new Date(l.tempo).toLocaleString('pt-BR') : '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
