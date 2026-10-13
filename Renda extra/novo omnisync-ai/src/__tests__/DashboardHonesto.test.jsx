import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { DashboardExecutivo } from '../components/dashboard/DashboardExecutivo';
import { DashboardCommandCenter } from '../components/dashboard/DashboardCommandCenter';
import { BentoHome } from '../components/dashboard/BentoHome';

vi.mock('../services/api', () => ({
  api: {
    getDashboardAnalytics: vi.fn(async () => ({
      kpis: [
        { id: 'faturamento', value: 1500, delta: null },
        { id: 'pedidos', value: 0, delta: null },
        { id: 'ticketMedio', value: 250, delta: null },
      ],
    })),
    getPedidos: vi.fn(async () => []),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
    getTransacoes: vi.fn(async () => []),
    analisarDominio: vi.fn(async () => ({ ok: false, message: 'sem dados' })),
  },
}));

function renderizar(ui) {
  return render(
    <MemoryRouter>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DashboardExecutivo — sem dados fabricados (G1)', () => {
  it('mostra KPIs reais do analytics e NENHUM valor do mock antigo', async () => {
    renderizar(<DashboardExecutivo />);
    expect(await screen.findByText('Faturamento')).toBeTruthy();
    // KPIs vêm do endpoint real (mesmos rótulos do modo Comando):
    expect(screen.getByText('Pedidos')).toBeTruthy();
    expect(screen.getByText('Ticket médio')).toBeTruthy();
    // Sem lucro no analytics → "—" honesto, nunca valor inventado:
    expect(screen.getByText('Sem base de custo')).toBeTruthy();
    // Valores fabricados antigos (mockData) jamais aparecem:
    expect(screen.queryByText(/128\.400/)).toBeNull();
    expect(screen.queryByText(/1\.240/)).toBeNull();
    expect(screen.queryByText('NPS')).toBeNull();
    expect(screen.queryByText('Leads novos')).toBeNull();
    expect(screen.queryByText('Margem abaixo da meta')).toBeNull();
  });

  it('blocos sem fonte real mostram estado vazio honesto', async () => {
    renderizar(<DashboardExecutivo />);
    expect(await screen.findByText('Sem fonte de MRR conectada')).toBeTruthy();
    expect(screen.getByText('Sem alertas reais')).toBeTruthy();
    expect(screen.getByText('Sem dados de funil')).toBeTruthy();
    // Valores fixos do funil mockado (Leads 1200) jamais aparecem:
    expect(screen.queryByText(/1\.200/)).toBeNull();
  });
});

describe('Gráfico de faturamento — estado vazio honesto (G15)', () => {
  it('CommandCenter sem pedidos mostra estado vazio e não plota eixos', async () => {
    renderizar(<DashboardCommandCenter period="30d" />);
    expect(await screen.findByText('Sem pedidos no período')).toBeTruthy();
    expect(api.getPedidos).toHaveBeenCalled();
    // KPI real do analytics aparece no hero:
    expect(screen.getAllByText(/R\$ 1\.500/).length).toBeGreaterThan(0);
  });

  it('BentoHome sem pedidos mostra estado vazio e não plota eixos', async () => {
    renderizar(<BentoHome period="30d" />);
    expect(await screen.findByText('Sem pedidos no período')).toBeTruthy();
    expect(api.getDashboardAnalytics).toHaveBeenCalled();
  });
});
