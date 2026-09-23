import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Compras } from '../pages/Compras';

vi.mock('../services/api', () => ({
  api: {
    listarOrdensCompra: vi.fn(async () => []),
    criarOrdemCompra: vi.fn(),
    aprovarOrdemCompra: vi.fn(),
    rejeitarOrdemCompra: vi.fn(),
    marcarOcEnviada: vi.fn(),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Compras />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Compras (ordens reais)', () => {
  it('lista vazia honesta sem dados', async () => {
    renderizar();
    expect(await screen.findByText('Nenhuma ordem de compra encontrada.')).toBeTruthy();
  });

  it('aprova rascunho e recarrega a lista', async () => {
    api.listarOrdensCompra
      .mockResolvedValueOnce([
        { id: 'OC-1', fornecedor: 'Distribuidora', data: '2026-09-01', total: 100, status: 'aguardando_aprovacao', rastreio: null },
      ])
      .mockResolvedValue([]);
    api.aprovarOrdemCompra.mockResolvedValue({ ok: true });
    renderizar();
    fireEvent.click(await screen.findByText('Aprovar'));
    expect(api.aprovarOrdemCompra).toHaveBeenCalledWith('OC-1', 'manual');
    expect(await screen.findByText('Nenhuma ordem de compra encontrada.')).toBeTruthy();
  });
});
