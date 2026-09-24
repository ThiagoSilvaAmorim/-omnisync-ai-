import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { SuppliersPage } from '../pages/SuppliersPage';

vi.mock('../services/api', () => ({
  api: {
    getCatalogSuppliers: vi.fn(async () => ({ items: [], total: 0, page: 1, limit: 24 })),
    getCatalogProducts: vi.fn(async () => ({ items: [], total: 0, page: 1, limit: 24, categorias: [] })),
    getSupplierNiches: vi.fn(async () => ({ niches: ['company', 'wholesale'] })),
    getSupplierCidades: vi.fn(async () => ({ cidades: [] })),
    getSupplierBySlug: vi.fn(async () => ({ fornecedor: null, produtos: [] })),
  },
}));

import { api } from '../services/api';

function renderizar(rota = '/fornecedores') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AppProvider>
        <SuppliersPage />
      </AppProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Restaura os padrões: clearAllMocks não remove impls setadas por teste.
  api.getCatalogSuppliers.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24 });
  api.getCatalogProducts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24, categorias: [] });
  api.getSupplierNiches.mockResolvedValue({ niches: ['company', 'wholesale'] });
  api.getSupplierCidades.mockResolvedValue({ cidades: [] });
});

describe('SuppliersPage (catálogo de fornecedores)', () => {
  it('renderiza cabeçalho e abas Fornecedores|Produtos', async () => {
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Fornecedores' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Fornecedores/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Produtos/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Fornecedores/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('estado vazio honesto quando a base não retorna resultados', async () => {
    renderizar();
    expect(await screen.findByText('Nenhum fornecedor encontrado')).toBeTruthy();
  });

  it('lista fornecedores retornados pela API com botão Ver fornecedor', async () => {
    api.getCatalogSuppliers.mockResolvedValue({
      items: [{
        id: 'u1',
        slug: 'atacado-central',
        name: 'Atacado Central',
        uf: 'SP',
        city: 'Campinas',
        niche: 'wholesale',
        productCount: 3,
        marketplaces: ['mercadolivre'],
        acceptsDropshipping: true,
        coverImages: [],
      }],
      total: 1,
      page: 1,
      limit: 24,
    });
    renderizar();
    expect(await screen.findByText('Atacado Central')).toBeTruthy();
    expect(screen.getByText('1 fornecedor(es) na base')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Ver fornecedor' });
    expect(link.getAttribute('href')).toBe('/fornecedores/atacado-central');
    expect(screen.getByText('ML')).toBeTruthy();
  });

  it('troca para aba Produtos e busca em /api/products', async () => {
    api.getCatalogProducts.mockResolvedValue({
      items: [{
        id: 'p1',
        name: 'Fone Bluetooth TWS',
        sku: 'DEMO-FONE-001',
        costPrice: 45.9,
        niche: 'company',
        supplier: { slug: '3g-foods', name: '3G Foods', uf: 'SP', city: 'Campinas' },
      }],
      total: 1,
      page: 1,
      limit: 24,
    });
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: /Produtos/ }));
    expect(await screen.findByText('Fone Bluetooth TWS')).toBeTruthy();
    expect(api.getCatalogProducts).toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: /Produtos/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('link', { name: /3G Foods/ }).getAttribute('href')).toBe('/fornecedores/3g-foods');
  });

  it('busca na URL (?q=) é aplicada com debounce de 300ms', async () => {
    renderizar('/fornecedores?q=fone');
    await waitFor(() =>
      expect(api.getCatalogSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'fone' })
      )
    );
    expect(await screen.findByDisplayValue('fone')).toBeTruthy();
  });

  it('digitar no campo de busca reflete na URL e dispara nova busca', async () => {
    renderizar();
    await waitFor(() => expect(api.getCatalogSuppliers).toHaveBeenCalledTimes(1));
    const campo = await screen.findByLabelText('Buscar no catálogo');
    fireEvent.change(campo, { target: { value: 'caneca' } });
    await waitFor(
      () =>
        expect(api.getCatalogSuppliers).toHaveBeenCalledWith(
          expect.objectContaining({ q: 'caneca' })
        ),
      { timeout: 2000 }
    );
  });

  it('erro de rede exibe estado de erro explícito (sem dados inventados)', async () => {
    api.getCatalogSuppliers.mockRejectedValue(new Error('Backend fora do ar'));
    renderizar();
    expect(await screen.findByText('Erro ao carregar o catálogo')).toBeTruthy();
    expect(screen.getByText('Backend fora do ar')).toBeTruthy();
  });

  it('filtro de nicho chega à API e select carrega nichos do banco', async () => {
    renderizar();
    expect(await screen.findByText('Nenhum fornecedor encontrado')).toBeTruthy();
    await waitFor(() => expect(api.getSupplierNiches).toHaveBeenCalled());
    const select = await screen.findByLabelText('Nicho');
    expect(select.querySelector('option[value="wholesale"]')).toBeTruthy();
    fireEvent.change(select, { target: { value: 'wholesale' } });
    await waitFor(() =>
      expect(api.getCatalogSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ niche: 'wholesale' })
      )
    );
  });

  it('botão Carregar mais aparece quando há mais páginas', async () => {
    api.getCatalogSuppliers.mockImplementation(async (params = {}) => {
      const pagina = Number(params.page) || 1;
      return {
        items: Array.from({ length: 24 }).map((_, i) => ({
          id: `f${pagina}-${i}`,
          slug: `f${pagina}-${i}`,
          name: `Fornecedor ${pagina}-${i}`,
          uf: 'SP',
          city: 'Campinas',
          niche: null,
          productCount: 0,
          marketplaces: [],
          acceptsDropshipping: true,
          coverImages: [],
        })),
        total: 60,
        page: pagina,
        limit: 24,
      };
    });
    renderizar();
    const botao = await screen.findByRole('button', { name: /Carregar mais \(24\/60\)/ });
    fireEvent.click(botao);
    await waitFor(() =>
      expect(api.getCatalogSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    );
  });

  it('ranking por cidade: URL com cidade+order=score mostra posição, score e banner', async () => {
    api.getCatalogSuppliers.mockResolvedValue({
      items: [
        {
          id: 'u1', slug: 'melhor-sp', name: 'Melhor de São Paulo', uf: 'SP', city: 'São Paulo',
          niche: 'wholesale', productCount: 5, marketplaces: ['mercadolivre'], acceptsDropshipping: true,
          coverImages: [], score: 100,
          scoreCriterios: [{ label: 'Site no ar', pontos: 30, max: 30 }],
        },
        {
          id: 'u2', slug: 'segundo-sp', name: 'Segundo de São Paulo', uf: 'SP', city: 'São Paulo',
          niche: 'company', productCount: 0, marketplaces: [], acceptsDropshipping: true,
          coverImages: [], score: 15,
          scoreCriterios: [{ label: 'Site no ar', pontos: 0, max: 30 }],
        },
      ],
      total: 2,
      page: 1,
      limit: 24,
    });
    renderizar('/fornecedores?cidade=São Paulo&order=score');
    await waitFor(() =>
      expect(api.getCatalogSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ cidade: 'São Paulo', order: 'score' })
      )
    );
    expect(await screen.findByText('Ranking de São Paulo — posição por score (site, dropshipping, produtos, logo e contato).')).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
    expect(screen.getByText('2 fornecedor(es) em São Paulo na base')).toBeTruthy();
  });

  it('select de cidade carrega cidades com contagem e ativa o ranking', async () => {
    api.getSupplierCidades.mockResolvedValue({
      cidades: [{ city: 'São Paulo', total: 274 }, { city: 'Campinas', total: 76 }],
    });
    renderizar();
    expect(await screen.findByText('Nenhum fornecedor encontrado')).toBeTruthy();
    await waitFor(() => expect(api.getSupplierCidades).toHaveBeenCalled());
    const select = await screen.findByLabelText('Cidade');
    expect(select.querySelector('option[value="São Paulo"]').textContent).toBe('São Paulo (274)');
    fireEvent.change(select, { target: { value: 'São Paulo' } });
    await waitFor(() =>
      expect(api.getCatalogSuppliers).toHaveBeenCalledWith(
        expect.objectContaining({ cidade: 'São Paulo', order: 'score' })
      )
    );
  });

  it('aba Produtos: select de categoria com contagens e card exibe a categoria real', async () => {
    api.getCatalogProducts.mockResolvedValue({
      items: [{
        id: 'p1', name: 'Fone Bluetooth TWS', sku: 'S-FONE', costPrice: null, niche: 'company',
        category: 'Eletrônicos', supplier: { slug: '3g-foods', name: '3G Foods', uf: 'SP', city: 'Campinas' },
      }],
      total: 1,
      page: 1,
      limit: 24,
      categorias: [{ category: 'Eletrônicos', total: 7 }, { category: 'Vestuário', total: 2 }],
    });
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: /Produtos/ }));
    expect(await screen.findByText('Fone Bluetooth TWS')).toBeTruthy();
    expect(screen.getByText('Eletrônicos')).toBeTruthy();
    const select = await screen.findByLabelText('Categoria do produto');
    expect(select.querySelector('option[value="Vestuário"]').textContent).toBe('Vestuário (2)');
    fireEvent.change(select, { target: { value: 'Vestuário' } });
    await waitFor(() =>
      expect(api.getCatalogProducts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Vestuário' })
      )
    );
  });
});
