import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { api } from '../services/api';
import { OrderDetailPanel } from '../components/pedidos/OrderDetailPanel';

vi.mock('../services/api', () => ({
  api: { criarOrdemCompra: vi.fn() },
}));

const pedido = { id: 'P1', total: 250, status: 'pendente', cliente: 'Loja A' };

describe('OrderDetailPanel — ordem de compra', () => {
  it('cria rascunho aguardando aprovação sem enviar nada', async () => {
    api.criarOrdemCompra.mockResolvedValue({ ok: true, ordem: { id: 'OC-abc', status: 'aguardando_aprovacao' } });
    render(<OrderDetailPanel pedido={pedido} onClose={() => {}} onStatusChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Fornecedor para a ordem de compra'), { target: { value: 'Distribuidora' } });
    fireEvent.click(screen.getByText('Criar rascunho'));
    expect(await screen.findByText(/Rascunho OC-abc — aguardando aprovação/)).toBeTruthy();
    expect(api.criarOrdemCompra).toHaveBeenCalledWith(
      expect.objectContaining({ fornecedor: 'Distribuidora', pedidoId: 'P1' })
    );
  });

  it('exibe erro explícito quando a criação falha', async () => {
    api.criarOrdemCompra.mockRejectedValue(new Error('Backend indisponível'));
    render(<OrderDetailPanel pedido={pedido} onClose={() => {}} onStatusChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Fornecedor para a ordem de compra'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Criar rascunho'));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
