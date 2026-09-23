import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { CentralBO } from '../pages/CentralBO';

vi.mock('../services/api', () => ({
  api: {
    getProblemas: vi.fn(),
    criarProblema: vi.fn(),
    avancarProblema: vi.fn(),
    anexarNotaProblema: vi.fn(),
    removerProblema: vi.fn(),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <CentralBO />
      </AppProvider>
    </MemoryRouter>
  );
}

const BO = { id: 'BO-1', titulo: 'Falha no servidor', descricao: 'd', categoria: 'Operacional', prioridade: 'alta', data: '23/09/2026', status: 'aberto', historico: [] };

describe('CentralBO (B.O.s reais)', () => {
  it('renderiza B.O.s reais do backend, sem mock', async () => {
    api.getProblemas.mockResolvedValue([BO]);
    renderizar();
    expect(await screen.findByText('Falha no servidor')).toBeTruthy();
    expect(api.getProblemas).toHaveBeenCalled();
  });

  it('avança B.O. via API', async () => {
    api.getProblemas.mockResolvedValue([BO]);
    api.avancarProblema.mockResolvedValue({ ok: true, bo: { ...BO, status: 'em andamento' } });
    renderizar();
    fireEvent.click(await screen.findByText('Iniciar atendimento'));
    expect(api.avancarProblema).toHaveBeenCalledWith('BO-1');
  });
});
