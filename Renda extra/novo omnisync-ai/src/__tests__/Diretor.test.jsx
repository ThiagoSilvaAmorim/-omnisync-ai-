import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Diretor } from '../pages/Diretor';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { nome: 'Diretor', perfil: 'Diretor' } }),
}));

vi.mock('../services/api', () => ({
  api: {
    getTransacoes: vi.fn(),
    getProdutos: vi.fn(),
    getMetas: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Diretor />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Diretor (dados reais)', () => {
  it('calcula DRE de transações reais, sem mock', async () => {
    api.getTransacoes.mockResolvedValue([
      { id: 'PED-1', tipo: 'receita', descricao: 'Venda', categoria: 'Vendas', data: '23/09/2026', valor: 1000 },
      { id: 'OC-1', tipo: 'despesa', descricao: 'Compra', categoria: 'Compras', data: '23/09/2026', valor: -400 },
    ]);
    api.getProdutos.mockResolvedValue({ produtos: [{ id: 1, nome: 'Fone', preco: 100, estoque: 10, minimo: 5 }] });
    api.getMetas.mockResolvedValue([{ id: 1, nome: 'Faturamento', meta: 10000, atual: 1000, tipo: 'currency', setor: 'Geral' }]);
    renderizar();
    // KPIs visíveis; metas e top produtos ficam em seções colapsadas.
    expect(await screen.findByText('Receita')).toBeTruthy();
    expect(await screen.findByText('R$ 1.000,00')).toBeTruthy();
    expect(api.getTransacoes).toHaveBeenCalled();
  });
});
