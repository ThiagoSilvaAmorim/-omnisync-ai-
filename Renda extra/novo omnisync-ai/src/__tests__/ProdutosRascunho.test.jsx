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
    solicitarAprovacao: vi.fn(),
    getAprovacao: vi.fn(),
    publicarAnuncioML: vi.fn(),
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

  it('publicar exige aprovação e categoria, sem auto-publicar', async () => {
    api.gerarRascunhoAnuncio.mockResolvedValue({
      ok: true, tipo: 'listing-draft', rascunho: true,
      draft: { analysis: 'Análise do rascunho', recommendations: [], risks: [] },
    });
    api.solicitarAprovacao.mockResolvedValue({ id: 'apv-9', status: 'pendente' });
    api.getAprovacao.mockResolvedValue({ id: 'apv-9', status: 'aprovada' });
    api.publicarAnuncioML.mockResolvedValue({ ok: true, item: { id: 'MLB9' } });
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
    await screen.findByText('Análise do rascunho');
    fireEvent.click(screen.getByText('Solicitar aprovação'));
    expect(await screen.findByText(/Aprovação apv-9/)).toBeTruthy();
    expect(api.solicitarAprovacao).toHaveBeenCalledWith(expect.objectContaining({ action: 'ml.publish' }));
    fireEvent.click(screen.getByText('Verificar status'));
    await screen.findByText(/aprovada/);
    fireEvent.change(screen.getByPlaceholderText('Ex: MLB1234'), { target: { value: 'MLB1234' } });
    fireEvent.click(screen.getByText('Publicar no ML'));
    expect(await screen.findByText(/Anúncio publicado/)).toBeTruthy();
    expect(api.publicarAnuncioML).toHaveBeenCalledWith('apv-9', expect.objectContaining({ category_id: 'MLB1234' }));
  });
});
