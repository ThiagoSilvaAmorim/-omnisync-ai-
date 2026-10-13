import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../services/api';
import { Produtos } from '../pages/Produtos';
import {
  statusEstoque,
  contarPorStatus,
  calcularKpisProdutos,
  cardsProdutos,
  cardsIntegracao,
} from '../lib/kpisPainel';

vi.mock('../services/api', () => ({
  api: {
    getProdutos: vi.fn(),
    gerarRascunhoAnuncio: vi.fn(),
    solicitarAprovacao: vi.fn(),
    getAprovacao: vi.fn(),
    publicarAnuncioML: vi.fn(),
    criarProduto: vi.fn(),
    atualizarProduto: vi.fn(),
    removerProduto: vi.fn(),
  },
}));

describe('statusEstoque — fonte única de classificação', () => {
  it('respeita status de estoque explícito (mock local)', () => {
    expect(statusEstoque({ status: 'excesso', estoque: 999, minimo: 1 })).toBe('excesso');
    expect(statusEstoque({ status: 'baixo', estoque: 999, minimo: 1 })).toBe('baixo');
  });

  it('ignora status de publicação (ativo/inativo) e deriva de estoque/minimo', () => {
    expect(statusEstoque({ status: 'ativo', estoque: 0 })).toBe('critico');
    expect(statusEstoque({ status: 'ativo', estoque: 5, minimo: 10 })).toBe('critico');
    expect(statusEstoque({ status: 'inativo', estoque: 15, minimo: 10 })).toBe('baixo');
    expect(statusEstoque({ status: 'ativo', estoque: 30, minimo: 10 })).toBe('normal');
    expect(statusEstoque({ status: 'ativo', estoque: 50, minimo: 10 })).toBe('excesso');
  });

  it('sem mínimo definido: zero = crítico, com estoque = normal', () => {
    expect(statusEstoque({ estoque: 0 })).toBe('critico');
    expect(statusEstoque({ estoque: 7 })).toBe('normal');
  });

  it('usa estoque ou atual como campo de quantidade', () => {
    expect(statusEstoque({ atual: 0, minimo: 5 })).toBe('critico');
    expect(statusEstoque({ atual: 30, minimo: 10 })).toBe('normal');
  });
});

describe('KPIs de Produtos coerentes com o painel (mesma fonte)', () => {
  const lista = [
    { id: 1, nome: 'A', estoque: 0, status: 'ativo' },
    { id: 2, nome: 'B', estoque: 5, minimo: 10, status: 'ativo' },
    { id: 3, nome: 'C', estoque: 15, minimo: 10, status: 'ativo' },
    { id: 4, nome: 'D', estoque: 30, minimo: 10, status: 'ativo' },
    { id: 5, nome: 'E', estoque: 50, minimo: 10, status: 'ativo' },
  ];

  it('produtosCriticos === contagem do painel para a MESMA lista', () => {
    const kpis = calcularKpisProdutos(lista);
    const painel = contarPorStatus(lista);
    expect(kpis.produtosCriticos).toBe(painel.critico);
    expect(kpis.produtosCriticos).toBe(2);
    expect(kpis.itensBaixoEstoque).toBe(painel.baixo);
    expect(kpis.itensBaixoEstoque).toBe(1);
    expect(painel.normal).toBe(1);
    expect(painel.excesso).toBe(1);
  });

  it('totalItens e valorTotal derivam da mesma lista', () => {
    const kpis = calcularKpisProdutos(lista);
    expect(kpis.totalItens).toBe(lista.length);
    expect(kpis.valorTotal).toBe(0); // sem preço definido = 0 honesto
  });

  it('cards de Produtos: vermelho só quando há problema real (zeros neutros)', () => {
    const zerados = cardsProdutos({ totalItens: 0, valorTotal: 0, itensBaixoEstoque: 0, produtosCriticos: 0 });
    expect(zerados.every(c => c.destaque === false)).toBe(true);
    const comProblema = cardsProdutos({ totalItens: 9, valorTotal: 100, itensBaixoEstoque: 1, produtosCriticos: 9 });
    expect(comProblema.find(c => c.label === 'Produtos Críticos').destaque).toBe(true);
    expect(comProblema.find(c => c.label === 'Itens com Estoque Baixo').destaque).toBe(true);
    expect(comProblema.find(c => c.label === 'Total de Itens').destaque).toBe(false);
  });
});

describe('Cards de Integrações — vermelho só para valor problemático', () => {
  it('zeros neutros (envios/pendências/taxa) não ficam vermelhos', () => {
    const cards = cardsIntegracao({ integracaoAtiva: 3, totalEnvios: 0, taxaSucesso: null, pending: 0 });
    expect(cards.find(c => c.label === 'Total de envios').destaque).toBe(false);
    expect(cards.find(c => c.label === 'Pendências').destaque).toBe(false);
    expect(cards.find(c => c.label === 'Taxa de sucesso').destaque).toBe(false);
    expect(cards.find(c => c.label === 'Taxa de sucesso').valor).toBe('—');
    expect(cards.find(c => c.label === 'Integrações ativas').destaque).toBe(false);
  });

  it('sem integrações ativas (0) ou com pendências (>0) o alerta aparece', () => {
    const nadaConectado = cardsIntegracao({ integracaoAtiva: 0, totalEnvios: 0, taxaSucesso: null, pending: 0 });
    expect(nadaConectado.find(c => c.label === 'Integrações ativas').destaque).toBe(true);
    expect(nadaConectado.find(c => c.label === 'Pendências').destaque).toBe(false);
    const comPendencias = cardsIntegracao({ integracaoAtiva: 2, totalEnvios: 10, taxaSucesso: 98, pending: 4 });
    expect(comPendencias.find(c => c.label === 'Pendências').destaque).toBe(true);
  });
});

// Regressão do achado da auditoria: KPI "Produtos Críticos" dizia 9 enquanto o
// painel "Produtos por Status" mostrava 0 em todos os grupos (fontes distintas:
// KPI usava estoque, painel lia o campo `status` de publicação).
describe('Produtos — página usa uma única fonte de cálculo', () => {
  const PRODUTOS = [
    { id: 1, nome: 'Sem Estoque', sku: 'SE-01', preco: 10, estoque: 0, categoria: 'Geral', status: 'ativo' },
    { id: 2, nome: 'Abaixo do Minimo', sku: 'AM-02', preco: 10, estoque: 5, minimo: 10, categoria: 'Geral', status: 'ativo' },
    { id: 3, nome: 'Estoque Sadavel', sku: 'ES-03', preco: 10, estoque: 30, minimo: 10, categoria: 'Geral', status: 'ativo' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getProdutos.mockResolvedValue({ produtos: PRODUTOS });
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'T', email: 't@t', perfil: 'Diretor' }));
  });

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

  it('KPI "Produtos Críticos" e painel "Produtos por Status" mostram o MESMO número', async () => {
    renderizar();
    await screen.findByText('Sem Estoque');
    const kpi = screen.getByText('Produtos Críticos');
    expect(kpi.nextElementSibling.textContent).toBe('2');
    const painelTitulo = screen.getByText('Produtos por Status');
    const painel = painelTitulo.closest('.rounded-xl') || painelTitulo.parentElement.parentElement;
    expect(within(painel).getByText('Crítico').nextElementSibling.textContent).toBe('2 itens');
    expect(within(painel).getByText('Normal').nextElementSibling.textContent).toBe('1 itens');
  });

  it('badge da tabela e filtro de status usam a mesma fonte (status de estoque)', async () => {
    renderizar();
    await screen.findByText('Sem Estoque');
    // Badge mostra status de estoque derivado, não o status de publicação "ativo".
    expect(screen.getAllByText('Crítico').length).toBeGreaterThan(0);
    expect(screen.queryByText('ativo')).toBeNull();
    fireEvent.change(screen.getByLabelText('Filtrar por status'), { target: { value: 'critico' } });
    expect(await screen.findByText('Sem Estoque')).toBeTruthy();
    expect(await screen.findByText('Abaixo do Minimo')).toBeTruthy();
    expect(screen.queryByText('Estoque Sadavel')).toBeNull();
  });

  it('KPIs críticos ganham alerta vermelho apenas quando > 0', async () => {
    renderizar();
    await screen.findByText('Sem Estoque');
    const kpi = screen.getByText('Produtos Críticos');
    const card = kpi.parentElement;
    expect(card.className).toContain('border-red-200');
    const total = screen.getByText('Total de Itens');
    expect(total.parentElement.className).not.toContain('border-red-200');
  });
});
