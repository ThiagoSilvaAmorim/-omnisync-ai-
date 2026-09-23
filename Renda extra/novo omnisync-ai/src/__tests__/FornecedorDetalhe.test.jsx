import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { FornecedorDetalhe } from '../pages/FornecedorDetalhe';

vi.mock('../services/api', () => ({
  api: {
    getFornecedor: vi.fn(),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
    listarOrdensCompra: vi.fn(async () => []),
    marcarOcEnviada: vi.fn(),
  },
}));

function renderizar(id = '5') {
  return render(
    <MemoryRouter initialEntries={[`/fornecedores/${id}`]}>
      <AppProvider>
        <Routes>
          <Route path="/fornecedores/:id" element={<FornecedorDetalhe />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

describe('FornecedorDetalhe (dados reais)', () => {
  it('exibe fornecedor real com métricas da base', async () => {
    api.getFornecedor.mockResolvedValue({
      id: 5, nome: 'Distribuidora Real', categoria: 'Atacado',
      telefone: '11 99999-0000', fonte: 'Google Places', verificado: false,
    });
    renderizar('5');
    expect(await screen.findByText('Distribuidora Real')).toBeTruthy();
    expect(await screen.findByText('Nenhuma ordem de compra para este fornecedor ainda.')).toBeTruthy();
  });

  it('id desconhecido mostra estado vazio honesto', async () => {
    api.getFornecedor.mockResolvedValue(null);
    renderizar('999');
    expect(await screen.findByText('Fornecedor não encontrado')).toBeTruthy();
  });

  it('ordens exibem código de rastreio quando houver', async () => {
    api.getFornecedor.mockResolvedValue({ id: 5, nome: 'Distribuidora Real', fonte: 'Manual', verificado: false });
    api.listarOrdensCompra.mockResolvedValue([
      { id: 'OC-1', fornecedor: 'Distribuidora Real', data: '2026-09-01', total: 100, status: 'aguardando_aprovacao', rastreio: 'BR123456' },
    ]);
    renderizar('5');
    expect(await screen.findByText('BR123456')).toBeTruthy();
  });

  it('marcar como enviado atualiza o status da ordem', async () => {
    api.getFornecedor.mockResolvedValue({ id: 5, nome: 'Distribuidora Real', fonte: 'Manual', verificado: false });
    api.listarOrdensCompra.mockResolvedValue([
      { id: 'OC-2', fornecedor: 'Distribuidora Real', data: '2026-09-02', total: 50, status: 'compra_aprovada', rastreio: null },
    ]);
    api.marcarOcEnviada.mockResolvedValue({ ok: true, ordem: { id: 'OC-2', status: 'enviado_ao_fornecedor' } });
    renderizar('5');
    fireEvent.click(await screen.findByText('Marcar como enviado'));
    expect(api.marcarOcEnviada).toHaveBeenCalledWith('OC-2');
    expect(await screen.findByText('enviado_ao_fornecedor')).toBeTruthy();
  });
});
