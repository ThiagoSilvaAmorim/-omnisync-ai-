import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../services/api';
import { Produtos } from '../pages/Produtos';

vi.mock('../services/api', () => ({
  api: {
    getProdutos: vi.fn(async () => ({
      produtos: [{ id: 1, nome: 'Cadeira X', sku: 'C1', preco: 500, estoque: 3, categoria: 'Móveis', status: 'ativo' }],
    })),
    getKpisProdutos: vi.fn(async () => ({ totalItens: 1, valorTotal: 1500, itensBaixoEstoque: 0, produtosCriticos: 0 })),
    gerarRascunhoAnuncio: vi.fn(),
    criarProduto: vi.fn(),
    atualizarProduto: vi.fn(),
    removerProduto: vi.fn(),
  },
}));

describe('Produtos — rascunho de anúncio (nunca publica)', () => {
  beforeEach(() => {
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'T', email: 't@t', perfil: 'Diretor' }));
  });

  it('gera rascunho e exibe aviso de não publicação', async () => {
    api.gerarRascunhoAnuncio.mockResolvedValue({
      ok: true,
      tipo: 'listing-draft',
      rascunho: true,
      draft: { analysis: 'Rascunho de teste', recommendations: ['Título X'], risks: ['Sem foto'] },
    });
    render(
      <MemoryRouter>
        <AuthProvider>
          <AppProvider>
            <Produtos />
          </AppProvider>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(await screen.findByText('Cadeira X')).toBeTruthy();
    fireEvent.click(screen.getAllByText('Rascunho')[0]);
    expect(await screen.findByText('Rascunho de teste')).toBeTruthy();
    expect(await screen.findByText(/nada foi publicado/i)).toBeTruthy();
    expect(api.gerarRascunhoAnuncio).toHaveBeenCalledWith(1);
  });
});
