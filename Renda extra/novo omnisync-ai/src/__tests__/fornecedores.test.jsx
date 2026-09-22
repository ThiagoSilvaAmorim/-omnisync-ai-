import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { Fornecedores } from '../pages/Fornecedores';

vi.mock('../services/api', () => ({
  api: {
    getFornecedoresSalvos: vi.fn(async () => []),
    buscarFornecedoresPublicos: vi.fn(),
    salvarFornecedor: vi.fn(),
    verificarFornecedor: vi.fn(),
    excluirFornecedor: vi.fn(),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
  },
}));

describe('Fornecedores (estados honestos)', () => {
  it('estado inicial pede busca, sem cards fixos', async () => {
    render(
      <AppProvider>
        <Fornecedores />
      </AppProvider>
    );
    expect(
      await screen.findByText('Pesquise uma categoria e uma cidade para encontrar empresas públicas.')
    ).toBeTruthy();
  });

  it('lista vazia honesta quando nada foi salvo', async () => {
    render(
      <AppProvider>
        <Fornecedores />
      </AppProvider>
    );
    expect(
      await screen.findByText('Nenhum fornecedor salvo ainda. Busque empresas públicas acima ou cadastre manualmente.')
    ).toBeTruthy();
  });

  it('não exibe métricas inventadas sem dados', async () => {
    const { container } = render(
      <AppProvider>
        <Fornecedores />
      </AppProvider>
    );
    await screen.findByText('Nenhum fornecedor salvo ainda. Busque empresas públicas acima ou cadastre manualmente.');
    expect(container.textContent).not.toContain('Total comprado');
    expect(container.textContent).not.toContain('Em alta');
  });
});
