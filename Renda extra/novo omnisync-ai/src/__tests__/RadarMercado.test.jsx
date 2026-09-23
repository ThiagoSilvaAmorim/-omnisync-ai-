import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
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
    expect(await screen.findByText('Melhor avaliados')).toBeTruthy();
  });
});
