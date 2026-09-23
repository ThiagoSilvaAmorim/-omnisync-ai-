import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Metas } from '../pages/Metas';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { nome: 'Diretor', perfil: 'Diretor' } }),
}));

vi.mock('../services/api', () => ({
  api: {
    getMetas: vi.fn(),
    criarMeta: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Metas />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Metas (reais)', () => {
  it('renderiza metas reais do backend, sem mock', async () => {
    api.getMetas.mockResolvedValue([{ id: 1, nome: 'Faturamento', meta: 100000, atual: 25000, tipo: 'currency', setor: 'Geral' }]);
    renderizar();
    expect(await screen.findByText('Faturamento')).toBeTruthy();
    expect(api.getMetas).toHaveBeenCalled();
  });

  it('cria meta via API', async () => {
    api.getMetas.mockResolvedValue([]);
    api.criarMeta.mockResolvedValue({ ok: true, meta: { id: 9, nome: 'Ticket médio', meta: 350, atual: 0, tipo: 'number', setor: 'Geral' } });
    renderizar();
    await screen.findByText('Nenhuma meta cadastrada. Crie a primeira com “Nova meta”.');
    fireEvent.click(screen.getByText('Nova meta'));
    fireEvent.change(screen.getByLabelText('Nome da meta'), { target: { value: 'Ticket médio' } });
    fireEvent.change(screen.getByLabelText('Valor da meta'), { target: { value: '350' } });
    fireEvent.click(screen.getByText('Criar meta'));
    expect(api.criarMeta).toHaveBeenCalledWith({ nome: 'Ticket médio', meta: 350, tipo: 'number' });
  });
});
