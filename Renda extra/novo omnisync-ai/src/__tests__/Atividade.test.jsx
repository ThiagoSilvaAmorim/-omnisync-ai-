import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Atividade } from '../pages/Atividade';

vi.mock('../services/api', () => ({
  api: {
    fetchAtividadesComFiltros: vi.fn(),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Atividade />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Atividade (eventos reais)', () => {
  it('renderiza eventos reais do barramento, sem mock', async () => {
    api.fetchAtividadesComFiltros.mockResolvedValue([
      { event_id: 'e1', type: 'purchase.created', timestamp: '2026-09-23T10:00:00.000Z', source_agent: 'api', entity_type: 'purchase_order', entity_id: 'OC-1', severity: 'info', payload: { total: 500 } },
      { event_id: 'e2', type: 'fiscal.divergence', timestamp: '2026-09-23T11:00:00.000Z', source_agent: 'api', entity_type: 'system', entity_id: null, severity: 'high', payload: {} },
    ]);
    renderizar();
    expect(await screen.findByText('purchase.created — OC-1')).toBeTruthy();
    expect(await screen.findByText('fiscal.divergence')).toBeTruthy();
    expect(api.fetchAtividadesComFiltros).toHaveBeenCalled();
  });

  it('barramento vazio mostra estado honesto', async () => {
    api.fetchAtividadesComFiltros.mockResolvedValue({ eventos: [], stats: {} });
    renderizar();
    expect(await screen.findByText('Nenhum evento neste filtro.')).toBeTruthy();
  });
});
