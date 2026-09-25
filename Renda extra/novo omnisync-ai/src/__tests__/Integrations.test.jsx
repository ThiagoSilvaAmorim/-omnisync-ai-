import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Integrations } from '../pages/Integrations';

vi.mock('../services/api', () => ({
  api: {
    integracoesMl: {
      status: vi.fn(),
      authorizeUrl: vi.fn(() => 'https://api.teste/api/integracoes/ml/authorize?empresaId=1'),
      shopeeStatus: vi.fn(),
      shopeeStart: vi.fn(),
    },
    mlDisconnect: vi.fn(),
    produtosMl: vi.fn(),
    mlGetStatus: vi.fn(),
    getKpisIntegracao: vi.fn(),
    getIntegracao: vi.fn(),
    getLogIntegracao: vi.fn(),
    tiktokShopStatus: vi.fn(),
  },
}));

const STATUS_OFF = {
  ok: true,
  empresaId: 1,
  provedor: 'mercadolivre',
  conectado: false,
  status: 'nao_configurado',
  sellerId: null,
  nickname: null,
  criadoEm: null,
  sincronizacao: { status: 'ocioso', total: 0, feitos: 0, erro: null },
};

const STATUS_ON = {
  ok: true,
  empresaId: 1,
  provedor: 'mercadolivre',
  conectado: true,
  status: 'conectado',
  sellerId: '238610309',
  nickname: 'AMBR2052460',
  criadoEm: '2026-01-10T12:00:00Z',
  sincronizacao: { status: 'rodando', total: 40, feitos: 20, erro: null },
};

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Integrations />
      </AppProvider>
    </MemoryRouter>
  );
}

const cardMl = async () => within(await screen.findByTestId('card-ml'));
const cardShopee = async () => within(await screen.findByTestId('card-shopee'));

describe('Integrations (/integrations) — cards ML e Shopee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.integracoesMl.status.mockResolvedValue(STATUS_OFF);
    api.integracoesMl.shopeeStatus.mockResolvedValue({
      status: 'configuration_pending',
      provider: 'shopee',
      conta: null,
    });
    api.produtosMl.mockResolvedValue({ items: [], total: 0, fonte: 'ml' });
    api.mlGetStatus.mockResolvedValue({ status: 'nao_configurado', conta: null, sellers: [] });
    api.getKpisIntegracao.mockResolvedValue({ integracaoAtiva: 0, totalEnvios: 0, taxaSucesso: 100, pending: 0 });
    api.getIntegracao.mockResolvedValue([]);
    api.getLogIntegracao.mockResolvedValue([]);
    api.tiktokShopStatus.mockResolvedValue({ status: 'configuration_pending', provider: 'tiktok-shop', conta: null });
    window.history.replaceState({}, '', '/');
  });

  it('sem conta mostra botão Conectar e status Não conectada', async () => {
    renderizar();
    expect(await screen.findByText('Mercado Livre')).toBeTruthy();
    const ml = await cardMl();
    expect(await ml.findByText('Não conectada')).toBeTruthy();
    expect(await ml.findByRole('button', { name: /Conectar/ })).toBeTruthy();
    expect(api.integracoesMl.status).toHaveBeenCalled();
  });

  it('conectada expõe Seller ID, data de criação e botão Inativar', async () => {
    api.integracoesMl.status.mockResolvedValue(STATUS_ON);
    renderizar();
    const ml = await cardMl();
    expect(await ml.findByText('238610309')).toBeTruthy();
    expect(await ml.findByText('10/01/2026')).toBeTruthy();
    expect(await ml.findByRole('button', { name: /Inativar/ })).toBeTruthy();
  });

  it('sync rodando mostra a barra "Sincronizando X de Y anúncios"', async () => {
    api.integracoesMl.status.mockResolvedValue(STATUS_ON);
    renderizar();
    const ml = await cardMl();
    expect(await ml.findByText('Sincronizando 20 de 40 anúncios')).toBeTruthy();
    expect(await ml.findByText('Sincronizando')).toBeTruthy();
  });

  it('Conectar navega para o authorize do backend (302 → auth.mercadolivre.com.br)', async () => {
    renderizar();
    const ml = await cardMl();
    fireEvent.click(await ml.findByRole('button', { name: /Conectar/ }));
    await waitFor(() => {
      expect(api.integracoesMl.authorizeUrl).toHaveBeenCalledWith(1);
    });
  });

  it('Inativar chama mlDisconnect (marca inativa sem apagar token) e recarrega', async () => {
    api.integracoesMl.status.mockResolvedValue(STATUS_ON);
    api.mlDisconnect.mockResolvedValue({ ok: true });
    renderizar();
    const ml = await cardMl();
    fireEvent.click(await ml.findByRole('button', { name: /Inativar/ }));
    await waitFor(() => {
      expect(api.mlDisconnect).toHaveBeenCalled();
    });
  });

  it('card Shopee mostra Preparação pendente (status real, sem inventar conexão)', async () => {
    renderizar();
    expect(await screen.findByText('Shopee')).toBeTruthy();
    const shopee = await cardShopee();
    expect(await shopee.findByText('Preparação pendente')).toBeTruthy();
    expect(await shopee.findByText(/configuration_pending/)).toBeTruthy();
    expect(shopee.getByRole('button', { name: /Conectar/ })).toBeTruthy();
  });

  it('callback com ?connected recarrega o status e limpa a URL', async () => {
    window.history.replaceState({}, '', '/integrations?connected=mercadolivre');
    renderizar();
    const ml = await cardMl();
    expect(await ml.findByText('Não conectada')).toBeTruthy();
    await waitFor(() => {
      expect(api.integracoesMl.status).toHaveBeenCalledTimes(2);
    });
    expect(window.location.search).toBe('');
  });

  it('sem conta conectada não mostra nem busca a seção de anúncios', async () => {
    renderizar();
    expect(await screen.findByTestId('card-ml')).toBeTruthy();
    expect(screen.queryByText('Anúncios sincronizados')).toBeNull();
    expect(api.produtosMl).not.toHaveBeenCalled();
  });

  it('conectada lista os anúncios sincronizados (título, preço e link do ML)', async () => {
    api.integracoesMl.status.mockResolvedValue(STATUS_ON);
    api.produtosMl.mockResolvedValue({
      items: [{
        id: 'p9',
        name: 'Smartwatch Pro 50m',
        imageUrl: 'https://http2.mlstatic.com/sw.jpg',
        mlItemId: 'MLB1234',
        preco: 199.9,
        moeda: 'BRL',
        statusMl: 'active',
        vendidos: 3,
        permalink: 'https://www.mercadolivre.com.br/anuncio/MLB1234',
        sincronizadoEm: '2026-09-25T10:00:00Z',
      }],
      total: 1,
      fonte: 'ml',
    });
    renderizar();

    expect(await screen.findByText('Anúncios sincronizados')).toBeTruthy();
    expect(await screen.findByText('Smartwatch Pro 50m')).toBeTruthy();
    expect(await screen.findByText('R$ 199,90')).toBeTruthy();
    await waitFor(() => {
      expect(api.produtosMl).toHaveBeenCalledWith(1, 48);
    });
    expect(screen.getByTitle('Abrir anúncio no Mercado Livre'))
      .toHaveAttribute('href', 'https://www.mercadolivre.com.br/anuncio/MLB1234');
  });

  it('conectada sem anúncios mostra estado vazio honesto (0 anúncios na conta)', async () => {
    api.integracoesMl.status.mockResolvedValue(STATUS_ON);
    renderizar();
    expect(await screen.findByText(/0 anúncios na conta/)).toBeTruthy();
    expect(screen.getByText('Anúncios sincronizados')).toBeTruthy();
  });

  it('duas lojas exibem seletor e troca recarrega o status da loja escolhida', async () => {
    api.integracoesMl.status.mockResolvedValue({
      ...STATUS_ON,
      sellers: [
        { mlUserId: '11', nickname: 'loja-a', ativo: true },
        { mlUserId: '22', nickname: 'loja-b', ativo: true },
      ],
    });
    api.mlGetStatus.mockResolvedValue({
      status: 'conectado',
      conta: { mlUserId: '22', mlUser: { nickname: 'loja-b' } },
      sellers: [],
    });
    renderizar();
    const select = await screen.findByLabelText('Loja');
    expect(select).toBeTruthy();
    fireEvent.change(select, { target: { value: '22' } });
    await waitFor(() => {
      expect(api.mlGetStatus).toHaveBeenCalledWith('22');
    });
    expect(await screen.findByTestId('dd-apelido')).toHaveTextContent('loja-b');
  });
});

describe('Integrations — fusão com /integracao (KPIs, registradas, logs, TikTok)', () => {
  const REGISTRADAS = [
    { id: 'tiny', nome: 'Tiny ERP', categoria: 'ERP', descricao: 'Sincroniza produtos, estoque e pedidos.', status: 'conectado', authUrl: 'https://app.tiny.com.br/login' },
    { id: 'amazon', nome: 'Amazon', categoria: 'Marketplace', descricao: 'Marketplace com logística FBA.', status: 'desconectado', authUrl: '#' },
    { id: 'stripe', nome: 'Stripe', categoria: 'Pagamentos', descricao: 'Cobranças e gateway de pagamento.', status: 'desconectado', authUrl: '#' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.integracoesMl.status.mockResolvedValue(STATUS_OFF);
    api.integracoesMl.shopeeStatus.mockResolvedValue({ status: 'configuration_pending', provider: 'shopee', conta: null });
    api.produtosMl.mockResolvedValue({ items: [], total: 0, fonte: 'ml' });
    api.mlGetStatus.mockResolvedValue({ status: 'nao_configurado', conta: null, sellers: [] });
    api.getKpisIntegracao.mockResolvedValue({ integracaoAtiva: 0, totalEnvios: 0, taxaSucesso: 100, pending: 0 });
    api.getIntegracao.mockResolvedValue(REGISTRADAS);
    api.getLogIntegracao.mockResolvedValue([]);
    api.tiktokShopStatus.mockResolvedValue({ status: 'configuration_pending', provider: 'tiktok-shop', conta: null });
    window.history.replaceState({}, '', '/');
  });

  it('KPIs gerais renderizam os valores calculados', async () => {
    api.getKpisIntegracao.mockResolvedValue({ integracaoAtiva: 3, totalEnvios: 111, taxaSucesso: 75, pending: 1 });
    renderizar();
    const kpis = await screen.findByTestId('kpis-integracao');
    expect(await within(kpis).findByText('Integrações ativas')).toBeTruthy();
    expect(await within(kpis).findByText('3')).toBeTruthy();
    expect(await within(kpis).findByText('111')).toBeTruthy();
    expect(await within(kpis).findByText('75%')).toBeTruthy();
    expect(await within(kpis).findByText('Pendências')).toBeTruthy();
  });

  it('registradas: busca filtra por nome/categoria', async () => {
    renderizar();
    const box = await screen.findByTestId('registradas');
    expect(await within(box).findByText('Tiny ERP')).toBeTruthy();
    expect(await within(box).findByText('Amazon')).toBeTruthy();
    fireEvent.change(within(box).getByLabelText('Buscar integração registrada'), { target: { value: 'amazon' } });
    await waitFor(() => {
      expect(within(box).queryByText('Tiny ERP')).toBeNull();
    });
    expect(within(box).getByText('Amazon')).toBeTruthy();
    expect(api.getIntegracao).toHaveBeenCalled();
  });

  it('registradas: filtro de status conectado esconde as desconectadas', async () => {
    renderizar();
    const box = await screen.findByTestId('registradas');
    expect(await within(box).findByText('Tiny ERP')).toBeTruthy();
    fireEvent.change(within(box).getByLabelText('Filtrar por status'), { target: { value: 'conectado' } });
    await waitFor(() => {
      expect(within(box).queryByText('Amazon')).toBeNull();
      expect(within(box).queryByText('Stripe')).toBeNull();
    });
    expect(within(box).getByText('Tiny ERP')).toBeTruthy();
  });

  it('registradas: paginação com mais de 10 itens', async () => {
    api.getIntegracao.mockResolvedValue(
      Array.from({ length: 11 }, (_, i) => ({ id: `i${i}`, nome: `Integração ${i + 1}`, categoria: 'ERP', status: 'conectado' }))
    );
    renderizar();
    const box = await screen.findByTestId('registradas');
    expect(await within(box).findByText('Página 1 de 2')).toBeTruthy();
    fireEvent.click(within(box).getByRole('button', { name: /Próxima/ }));
    expect(await within(box).findByText('Página 2 de 2')).toBeTruthy();
  });

  it('logs de sincronização exibem os eventos recebidos', async () => {
    api.getLogIntegracao.mockResolvedValue([
      { acao: 'Sync do Mercado Livre concluído', timestamp: '2026-09-25T10:00:00Z' },
    ]);
    renderizar();
    expect(await screen.findByText('Sync do Mercado Livre concluído')).toBeTruthy();
    expect(await screen.findByTestId('logs-sync')).toBeTruthy();
  });

  it('card TikTok Shop mostra o status real (Preparação pendente, sem inventar conexão)', async () => {
    renderizar();
    const card = await screen.findByTestId('card-tiktok');
    expect(await within(card).findByText('Preparação pendente')).toBeTruthy();
    expect(within(card).getByText(/configuration_pending/)).toBeTruthy();
    expect(within(card).getByText(/\/api\/auth\/tiktok-shop\/status/)).toBeTruthy();
  });
});
