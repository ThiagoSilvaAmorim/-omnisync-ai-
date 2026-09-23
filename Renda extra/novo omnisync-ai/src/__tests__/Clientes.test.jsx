import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Clientes } from '../pages/Clientes';

vi.mock('../services/api', () => ({
  api: {
    getClientes: vi.fn(async () => []),
    getNegocios: vi.fn(async () => []),
    getEstagios: vi.fn(async () => ['lead', 'qualificado', 'proposta', 'fechado', 'perdido']),
    criarCliente: vi.fn(),
    moverNegocio: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Clientes />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Clientes (pipeline real)', () => {
  it('carrega negócios da API em vez de mock fixo', async () => {
    api.getNegocios.mockResolvedValue([
      { id: 1, titulo: 'Reposição real', cliente: 'Loja A', valor: 5000, estagio: 'proposta', data: '2026-09-01' },
    ]);
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'Pipeline' }));
    expect(await screen.findByText('Reposição real')).toBeTruthy();
    expect(api.getNegocios).toHaveBeenCalled();
  });

  it('pipeline vazia não mostra negócios antigos', async () => {
    api.getNegocios.mockResolvedValue([]);
    renderizar();
    await screen.findByText('CRM — Clientes');
    expect(screen.queryByText('Reposição trimestral')).toBeNull();
  });
});
