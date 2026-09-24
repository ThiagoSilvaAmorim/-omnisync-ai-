import { describe, it, expect } from 'vitest';
import { getDashboardKpis, getFaturamentoSerie, getPeriodoLabel } from '../data/mockData';

describe('getPeriodoLabel', () => {
  it('retorna rótulo de período fixo', () => {
    expect(getPeriodoLabel('30d')).toBe('Últimos 30 dias');
  });

  it('formata intervalo customizado', () => {
    expect(getPeriodoLabel('custom', { inicio: '2024-04-20', fim: '2024-05-20' })).toBe(
      '20/04/2024 — 20/05/2024'
    );
  });
});

describe('getDashboardKpis', () => {
  it('escala valores conforme o período', () => {
    const mensal = getDashboardKpis('30d');
    const semanal = getDashboardKpis('7d');
    expect(semanal[0].value).toBeLessThan(mensal[0].value);
  });
});

describe('getFaturamentoSerie', () => {
  it('retorna 7 pontos para 7 dias', () => {
    expect(getFaturamentoSerie('7d')).toHaveLength(7);
  });

  it('retorna a série completa para 30 dias', () => {
    expect(getFaturamentoSerie('30d').length).toBeGreaterThan(7);
  });
});
