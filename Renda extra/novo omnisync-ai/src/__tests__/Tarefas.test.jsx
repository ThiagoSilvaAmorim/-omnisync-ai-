import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Tarefas } from '../pages/Tarefas';

vi.mock('../services/api', () => ({
  api: {
    getTarefas: vi.fn(),
    repetirTarefa: vi.fn(),
    cancelarTarefa: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Tarefas />
      </AppProvider>
    </MemoryRouter>
  );
}

const TAREFA_FALHA = { id: 'tsk-1', agentId: 'estoque', action: 'repor', entityType: 'product', entityId: 'P-1', status: 'dead_letter', attempts: 3, maxRetries: 3 };
const TAREFA_PENDENTE = { id: 'tsk-2', agentId: 'precos', action: 'reajustar', entityType: 'product', entityId: null, status: 'pending', attempts: 0, maxRetries: 3 };

describe('Tarefas (fila real)', () => {
  it('renderiza tarefas reais do backend', async () => {
    api.getTarefas.mockResolvedValue([TAREFA_FALHA, TAREFA_PENDENTE]);
    renderizar();
    expect(await screen.findByText('tsk-1')).toBeTruthy();
    expect(await screen.findByText('repor')).toBeTruthy();
    expect(api.getTarefas).toHaveBeenCalled();
  });

  it('repete tarefa em falha via API', async () => {
    api.getTarefas.mockResolvedValue([TAREFA_FALHA]);
    api.repetirTarefa.mockResolvedValue({ ok: true });
    renderizar();
    fireEvent.click(await screen.findByText('Repetir'));
    expect(api.repetirTarefa).toHaveBeenCalledWith('tsk-1');
  });

  it('cancela tarefa pendente via API', async () => {
    api.getTarefas.mockResolvedValue([TAREFA_PENDENTE]);
    api.cancelarTarefa.mockResolvedValue({ ok: true });
    renderizar();
    fireEvent.click(await screen.findByText('Cancelar'));
    expect(api.cancelarTarefa).toHaveBeenCalledWith('tsk-2');
  });
});
