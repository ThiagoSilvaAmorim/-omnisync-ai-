import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { ClienteDetalhe } from '../pages/ClienteDetalhe';

vi.mock('../services/api', () => ({
  api: {
    getClientes: vi.fn(async () => []),
    getNegocios: vi.fn(async () => []),
    criarNegocio: vi.fn(),
  },
}));

function renderizar(id = '1') {
  return render(
    <MemoryRouter initialEntries={[`/clientes/${id}`]}>
      <AppProvider>
        <Routes>
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

const CLIENTE = { id: 1, nome: 'Loja Real', tipo: 'loja', email: 'a@a.com', cidade: 'SP', status: 'ativo', totalPedidos: 3, totalGasto: 1500, ultimoContato: '2026-09-01' };

describe('ClienteDetalhe (dados reais)', () => {
  it('exibe cliente e negócios vindos da API', async () => {
    api.getClientes.mockResolvedValue([CLIENTE]);
    api.getNegocios.mockResolvedValue([
      { id: 10, titulo: 'Compra real', cliente: 'Loja Real', valor: 2000, estagio: 'lead', data: '2026-09-01' },
    ]);
    renderizar('1');
    expect(await screen.findByText('Loja Real')).toBeTruthy();
    expect(await screen.findByText('Compra real')).toBeTruthy();
    expect(screen.queryByText('João Silva')).toBeNull();
  });

  it('cria negócio via API em vez de estado local', async () => {
    api.getClientes.mockResolvedValue([CLIENTE]);
    api.getNegocios.mockResolvedValue([]);
    api.criarNegocio.mockResolvedValue({ ok: true, negocio: { id: 99 } });
    renderizar('1');
    expect(await screen.findByText('Loja Real')).toBeTruthy();
    fireEvent.click(screen.getByText('+ Novo negócio'));
    fireEvent.change(screen.getByPlaceholderText('Ex: Reposição trimestral'), { target: { value: 'Teste API' } });
    fireEvent.change(screen.getByLabelText(/Valor/), { target: { value: '3000' } });
    fireEvent.click(screen.getByText('Criar negócio'));
    expect(api.criarNegocio).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Teste API', cliente: 'Loja Real', valor: 3000 })
    );
  });
});
