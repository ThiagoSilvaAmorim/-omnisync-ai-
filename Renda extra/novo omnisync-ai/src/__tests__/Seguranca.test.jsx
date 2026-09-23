import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { Seguranca } from '../pages/Seguranca';

vi.mock('../services/api', () => ({
  api: {
    fetchAtividadesComFiltros: vi.fn(async () => []),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Seguranca />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Seguranca (auditoria real)', () => {
  it('carrega trilha de auditoria do barramento real', async () => {
    api.fetchAtividadesComFiltros.mockResolvedValue([
      { event_id: 'e1', type: 'purchase.created', timestamp: '2026-09-23T10:00:00.000Z', source_agent: 'api', entity_type: 'purchase_order', entity_id: 'OC-1', severity: 'info', payload: {} },
    ]);
    renderizar();
    fireEvent.click(screen.getByText('Audit Log'));
    expect(await screen.findByText('purchase.created')).toBeTruthy();
    expect(api.fetchAtividadesComFiltros).toHaveBeenCalled();
  });
});
