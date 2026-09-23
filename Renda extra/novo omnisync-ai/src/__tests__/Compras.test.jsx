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
    receberOrdemCompra: vi.fn(),
    vincularEnvioOc: vi.fn(),
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

  it('marca como recebido apenas após envio', async () => {
    api.listarOrdensCompra
      .mockResolvedValueOnce([
        { id: 'OC-9', fornecedor: 'D', data: '2026-09-01', total: 10, status: 'enviado_ao_fornecedor', rastreio: null },
      ])
      .mockResolvedValue([]);
    api.receberOrdemCompra.mockResolvedValue({ ok: true });
    renderizar();
    fireEvent.click(await screen.findByText('Marcar como recebido'));
    expect(api.receberOrdemCompra).toHaveBeenCalledWith('OC-9');
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

  it('vincula envio ML no detalhe da ordem', async () => {
    api.listarOrdensCompra
      .mockResolvedValueOnce([
        { id: 'OC-9', fornecedor: 'D', data: '2026-09-01', total: 10, status: 'enviado_ao_fornecedor', rastreio: null, mlShipmentId: null },
      ])
      .mockResolvedValue([]);
    api.vincularEnvioOc.mockResolvedValue({ ok: true, ordem: { id: 'OC-9', mlShipmentId: 'SHP-1', mlStatus: 'ready_to_ship' } });
    renderizar();
    fireEvent.click(await screen.findByTitle('Abrir detalhes'));
    fireEvent.change(await screen.findByPlaceholderText('ID do envio (shipment)'), { target: { value: 'SHP-1' } });
    fireEvent.click(screen.getByText('Vincular'));
    expect(api.vincularEnvioOc).toHaveBeenCalledWith('OC-9', 'SHP-1');
  });
});
