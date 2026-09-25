import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { RadarMercado } from '../pages/RadarMercado';

vi.mock('../services/marketplace', () => ({
  CATEGORIAS_INTERNET: [{ value: 'todas', label: 'Todas' }],
  buscarMercadoLivre: vi.fn(async () => []),
  buscarProdutosInternet: vi.fn(async () => [
    { id: 'd1', nome: 'Fone X', preco: 100, moeda: 'USD', imagem: '', categoria: 'Eletrônicos', marca: 'Loja X', avaliacao: 4.5, vendidos: 0, origem: 'DummyJSON', consultadoEm: null },
    { id: 'd2', nome: 'Fone Y', preco: 200, moeda: 'USD', imagem: '', categoria: 'Eletrônicos', marca: 'Loja X', avaliacao: 4.8, vendidos: 0, origem: 'DummyJSON', consultadoEm: null },
  ]),
  formatPrecoRadar: (p) => `PRECO:${p?.preco}`,
}));

vi.mock('../services/api', () => ({
  api: {
    getProdutos: vi.fn(async () => ({ produtos: [] })),
    criarProduto: vi.fn(),
    // Tendências oficiais do ML (/trends) — cache simulado com 3 termos.
    tendencias: vi.fn(async () => ({
      ok: true,
      cache: true,
      categoria: null,
      atualizadoEm: '2026-09-25T10:00:00Z',
      total: 3,
      termos: [
        { ordem: 1, termo: 'fone bluetooth', termoUrl: 'https://lista.mercadolivre.com.br/fone-bluetooth', produto: null },
        {
          ordem: 2,
          termo: 'smartwatch',
          termoUrl: 'https://lista.mercadolivre.com.br/smartwatch',
          produto: {
            titulo: 'Smartwatch Pro 50m',
            imagem: 'https://http2.mlstatic.com/sw.jpg',
            preco: 199.9,
            link: 'https://www.mercadolivre.com.br/anuncio/9',
          },
        },
        { ordem: 15, termo: 'case iphone', termoUrl: 'https://lista.mercadolivre.com.br/case-iphone', produto: null },
      ],
    })),
    // Menu de categorias do site ML (uma tentativa por sessão).
    tendenciasCategorias: vi.fn(async () => ({
      ok: true,
      cache: false,
      categorias: [
        { id: 'MLB1051', nome: 'Celulares e Telefonia' },
        { id: 'MLB1000', nome: 'Informática' },
      ],
    })),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <RadarMercado />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('RadarMercado (abas de agregação)', () => {
  it('mostra aba Vendedores agregando marcas reais', async () => {
    renderizar();
    expect(await screen.findByText('Agregações do Radar')).toBeTruthy();
    expect(await screen.findByText('Loja X')).toBeTruthy();
  });

  it('alterna para Categorias e Tendências', async () => {
    renderizar();
    await screen.findByText('Agregações do Radar');
    fireEvent.click(screen.getByText('Categorias'));
    expect(await screen.findByText('Eletrônicos')).toBeTruthy();
    fireEvent.click(screen.getByText('Tendências'));
    expect(await screen.findByText('Maior crescimento')).toBeTruthy();
  });

  it('Tendências usa a API /trends: 3 colunas, termo clicável e botão Atualizar', async () => {
    renderizar();
    await screen.findByText('Agregações do Radar');
    fireEvent.click(screen.getByText('Tendências'));

    expect(await screen.findByText('Mais desejados')).toBeTruthy();
    expect(await screen.findByText('Mais buscados')).toBeTruthy();

    const link = await screen.findByRole('link', { name: /fone bluetooth/ });
    expect(link).toHaveAttribute('href', 'https://lista.mercadolivre.com.br/fone-bluetooth');
    expect(link).toHaveAttribute('target', '_blank');

    // Forçar nova varredura passa atualizar=1 (ignora o cache de 24h).
    fireEvent.click(screen.getByRole('button', { name: /Atualizar/ }));
    await waitFor(() => {
      expect(api.tendencias).toHaveBeenCalledWith('', true);
    });
  });

  it('linha com produto mostra imagem, título e preço (quando a busca por termo resolve)', async () => {
    const { container } = renderizar();
    await screen.findByText('Agregações do Radar');
    fireEvent.click(screen.getByText('Tendências'));

    expect(await screen.findByText('Smartwatch Pro 50m')).toBeTruthy();
    expect(screen.getByText('R$ 199,90')).toBeTruthy();
    expect(container.querySelector('img[src="https://http2.mlstatic.com/sw.jpg"]')).toBeTruthy();
  });

  it('seletor de categoria troca a categoria e recarrega as tendências', async () => {
    renderizar();
    await screen.findByText('Agregações do Radar');
    fireEvent.click(screen.getByText('Tendências'));

    const select = await screen.findByLabelText('Categoria');
    fireEvent.change(select, { target: { value: 'MLB1051' } });
    await waitFor(() => {
      expect(api.tendencias).toHaveBeenCalledWith('MLB1051', false);
    });
  });
});
