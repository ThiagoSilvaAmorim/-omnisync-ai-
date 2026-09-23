import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Onboarding } from '../pages/Onboarding';

vi.mock('../services/api', () => ({
  api: {
    mlGetStatus: vi.fn(),
    getProdutos: vi.fn(),
    getFornecedoresSalvos: vi.fn(),
    getPedidos: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Onboarding />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Onboarding (checks reais)', () => {
  it('marca concluído só com dado real', async () => {
    api.mlGetStatus.mockResolvedValue({ status: 'conectado' });
    api.getProdutos.mockResolvedValue({ produtos: [{ id: 1 }], total: 1 });
    api.getFornecedoresSalvos.mockResolvedValue([]);
    api.getPedidos.mockResolvedValue([]);
    renderizar();
    expect(await screen.findByText('2 de 4 etapas concluídas')).toBeTruthy();
    expect(await screen.findByText('Conectar o Mercado Livre')).toBeTruthy();
  });

  it('sem backend tudo fica pendente', async () => {
    api.mlGetStatus.mockRejectedValue(new Error('down'));
    api.getProdutos.mockRejectedValue(new Error('down'));
    api.getFornecedoresSalvos.mockRejectedValue(new Error('down'));
    api.getPedidos.mockRejectedValue(new Error('down'));
    renderizar();
    expect(await screen.findByText('0 de 4 etapas concluídas')).toBeTruthy();
  });
});
