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
});
