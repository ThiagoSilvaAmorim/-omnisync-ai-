import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Integracao } from '../pages/Integracao';

vi.mock('../services/api', () => ({
  api: {
    getKpisIntegracao: vi.fn(async () => ({ integracaoAtiva: 0, totalEnvios: 0, taxaSucesso: 0, pending: 0 })),
    getIntegracao: vi.fn(async () => []),
    getLogIntegracao: vi.fn(async () => []),
    mlGetStatus: vi.fn(async () => ({ status: 'nao_configurado' })),
    mlStartOAuth: vi.fn(),
    mlDisconnect: vi.fn(),
    statusDrive: vi.fn(async () => ({ vinculado: false })),
    syncMarketplace: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Integracao />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Integracao — card Mercado Livre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.mlGetStatus.mockResolvedValue({ status: 'nao_configurado' });
  });

  it('não conectado exibe Conectar Mercado Livre', async () => {
    renderizar();
    expect(await screen.findByText('Conectar Mercado Livre')).toBeTruthy();
  });

  it('token expirado exibe Reautorizar em vez de só Desconectar', async () => {
    api.mlGetStatus.mockResolvedValue({ status: 'token_expirado' });
    renderizar();
    expect(await screen.findByText('Reautorizar')).toBeTruthy();
    expect(await screen.findByText('Token expirado')).toBeTruthy();
  });

  it('conectado exibe loja e Desconectar', async () => {
    api.mlGetStatus.mockResolvedValue({
      status: 'conectado',
      conta: { mlUser: { nickname: 'lojateste' } },
    });
    renderizar();
    expect(await screen.findByText('Desconectar')).toBeTruthy();
    expect(await screen.findByText('@lojateste')).toBeTruthy();
  });
});
