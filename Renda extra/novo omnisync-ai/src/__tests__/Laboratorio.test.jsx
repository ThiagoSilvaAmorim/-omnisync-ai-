import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { LaboratorioOportunidades } from '../pages/LaboratorioOportunidades';

vi.mock('../services/api', () => ({
  api: {
    getProdutos: vi.fn(),
    criarOrdemCompra: vi.fn(),
    emitirEvento: vi.fn(async () => ({ ok: true })),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <LaboratorioOportunidades />
      </AppProvider>
    </MemoryRouter>
  );
}

const PRODUTOS = {
  produtos: [
    { id: 1, nome: 'Fone', categoria: 'Eletrônicos', preco: 100, estoque: 2, minimo: 10, fornecedor: 'TecParts' },
    { id: 2, nome: 'Capa', categoria: 'Acessórios', preco: 30, estoque: 50, minimo: 10, fornecedor: 'TecParts' },
  ],
};

describe('Laboratorio (ruptura real)', () => {
  it('deriva oportunidades do catálogo real, sem mock', async () => {
    api.getProdutos.mockResolvedValue(PRODUTOS);
    renderizar();
    expect(await screen.findByText('Repor: Fone')).toBeTruthy();
    expect(api.getProdutos).toHaveBeenCalled();
  });

  it('gera ordem de compra em rascunho', async () => {
    api.getProdutos.mockResolvedValue(PRODUTOS);
    api.criarOrdemCompra.mockResolvedValue({ ok: true, ordem: { id: 'OC-X' } });
    renderizar();
    fireEvent.click((await screen.findAllByText('Gerar ordem de compra'))[0]);
    expect(api.criarOrdemCompra).toHaveBeenCalledWith({ fornecedor: 'TecParts', total: 800 });
  });
});
