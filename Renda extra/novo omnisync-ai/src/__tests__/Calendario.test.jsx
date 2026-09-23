import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { Calendario } from '../pages/Calendario';

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Calendario />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Calendario (agenda local, sem mock)', () => {
  it('começa vazio e cria evento local', async () => {
    localStorage.clear();
    renderizar();
    expect(await screen.findByText('Nenhum evento neste filtro.')).toBeTruthy();
    fireEvent.click(screen.getByText('Novo evento'));
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Live de ofertas' } });
    fireEvent.change(screen.getByLabelText('Data *'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByText('Adicionar'));
    expect(await screen.findByText('Live de ofertas')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('nexora-calendario')).length).toBe(1);
  });
});
