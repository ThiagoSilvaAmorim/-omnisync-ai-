import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSimulador } from '../hooks/useSimulador';

describe('useSimulador', () => {
  it('calcula lucro unitário, total, margem e ROI', () => {
    const { result } = renderHook(() =>
      useSimulador({ custo: 50, frete: 10, impostos: 10, taxa: 10, preco: 100, quantidade: 10 })
    );

    // custo unitário = 60; impostos = 10; taxa = 10; lucro = 100 - 60 - 10 - 10 = 20
    expect(result.current.lucroUnitario).toBe(20);
    expect(result.current.lucroTotal).toBe(200);
    expect(result.current.margem).toBe(20);
    expect(result.current.roi).toBeCloseTo(33.33, 1);
  });

  it('retorna ponto de equilíbrio nulo quando não há lucro', () => {
    const { result } = renderHook(() =>
      useSimulador({ custo: 100, frete: 0, impostos: 0, taxa: 0, preco: 80, quantidade: 5 })
    );
    expect(result.current.pontoEquilibrio).toBeNull();
    expect(result.current.lucroUnitario).toBeLessThan(0);
  });
});
