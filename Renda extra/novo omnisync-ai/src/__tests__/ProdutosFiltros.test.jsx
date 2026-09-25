import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../services/api';
import { Produtos } from '../pages/Produtos';

vi.mock('../services/api', () => ({
  api: {
    getProdutos: vi.fn(),
    getKpisProdutos: vi.fn(async () => ({ totalItens: 3, valorTotal: 300, itensBaixoEstoque: 1, produtosCriticos: 0 })),
    gerarRascunhoAnuncio: vi.fn(),
    solicitarAprovacao: vi.fn(),
    getAprovacao: vi.fn(),
    publicarAnuncioML: vi.fn(),
    criarProduto: vi.fn(),
    atualizarProduto: vi.fn(),
    removerProduto: vi.fn(),
  },
}));

const PRODUTOS = [
  { id: 1, nome: 'Teclado Mecânico', sku: 'TC-01', preco: 250, estoque: 5, categoria: 'Eletrônicos', status: 'normal' },
  { id: 2, nome: 'Cadeira Giratória', sku: 'CG-02', preco: 800, estoque: 0, categoria: 'Móveis', status: 'baixo' },
  { id: 3, nome: 'Mesa de Escrivaninha', sku: 'ME-03', preco: 600, estoque: 2, categoria: 'Móveis', status: 'normal' },
];

function renderizar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AppProvider>
          <Produtos />
        </AppProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Produtos — barra única de filtros (piloto do novo layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getProdutos.mockResolvedValue({ produtos: PRODUTOS });
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'T', email: 't@t', perfil: 'Diretor' }));
  });

  it('busca + status + categoria numa linha só, sem os cards e pills antigos', async () => {
    renderizar();
    const barra = await screen.findByTestId('barra-filtros');
    expect(within(barra).getByLabelText('Buscar produto')).toBeTruthy();
    expect(within(barra).getByLabelText('Filtrar por status')).toBeTruthy();
    expect(within(barra).getByLabelText('Filtrar por categoria')).toBeTruthy();
    // Poluição removida: card só-busca com o título "Catálogo de Produtos"
    // e as pills duplicadas de status.
    expect(screen.queryByText('Catálogo de Produtos')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Esgotado' })).toBeNull();
  });

  it('busca por nome filtra a lista', async () => {
    renderizar();
    await screen.findByText('Teclado Mecânico');
    fireEvent.change(screen.getByLabelText('Buscar produto'), { target: { value: 'cadeira' } });
    expect(await screen.findByText('Cadeira Giratória')).toBeTruthy();
    expect(screen.queryByText('Teclado Mecânico')).toBeNull();
  });

  it('status Esgotado mostra só os produtos sem estoque', async () => {
    renderizar();
    await screen.findByText('Teclado Mecânico');
    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'esgotado' } });
    expect(await screen.findByText('Cadeira Giratória')).toBeTruthy();
    expect(screen.queryByText('Teclado Mecânico')).toBeNull();
    expect(screen.queryByText('Mesa de Escrivaninha')).toBeNull();
  });

  it('categoria é derivada dos produtos carregados e filtra a lista', async () => {
    renderizar();
    await screen.findByText('Teclado Mecânico');
    const sel = screen.getByLabelText('Filtrar por categoria');
    const valores = [...sel.options].map(o => o.value);
    expect(valores).toContain('Eletrônicos');
    expect(valores).toContain('Móveis');
    fireEvent.change(sel, { target: { value: 'Móveis' } });
    expect(await screen.findByText('Cadeira Giratória')).toBeTruthy();
    expect(screen.queryByText('Teclado Mecânico')).toBeNull();
  });

  it('Limpar filtros restaura a lista completa', async () => {
    renderizar();
    await screen.findByText('Teclado Mecânico');
    fireEvent.change(screen.getByLabelText('Buscar produto'), { target: { value: 'zzz' } });
    expect(await screen.findByText('Nenhum produto encontrado')).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('barra-filtros')).getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText('Teclado Mecânico')).toBeTruthy();
  });
});
