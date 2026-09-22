import { describe, it, expect } from 'vitest';
import { formatVariation, formatCurrency } from '../lib/utils';
import { formatPrecoRadar } from '../services/marketplace';

describe('formatVariation', () => {
  it('anterior = 0 retorna —', () => {
    expect(formatVariation(100, 0)).toBe('—');
  });

  it('anterior = null retorna —', () => {
    expect(formatVariation(100, null)).toBe('—');
  });

  it('anterior = undefined retorna —', () => {
    expect(formatVariation(100, undefined)).toBe('—');
  });

  it('current = 110, previous = 100 retorna +10,0%', () => {
    expect(formatVariation(110, 100)).toBe('+10,0%');
  });

  it('current = 90, previous = 100 retorna -10,0%', () => {
    expect(formatVariation(90, 100)).toBe('-10,0%');
  });

  it('nunca retorna NaN/Infinity/undefined', () => {
    for (const [c, p] of [[0, 0], [null, null], [Infinity, 100], [100, Infinity], ['x', 'y']]) {
      const out = formatVariation(c, p);
      expect(['—', out].join('')).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});

describe('moeda sem duplicação de símbolo', () => {
  it('formatCurrency retorna símbolo único R$', () => {
    const out = formatCurrency(1234.5);
    // toLocaleString pt-BR usa espaço inseparável U+00A0 após "R$".
    const NBSP = String.fromCharCode(160);
    const normalizado = out.split(NBSP).join(' ');
    expect(normalizado).toMatch(/^R\$ \d/);
    expect(out).not.toContain('R$ R$');
  });
});

describe('formatPrecoRadar', () => {
  it('BRL não sofre conversão', () => {
    expect(formatPrecoRadar({ preco: 52.4, moeda: 'BRL' })).toBe('R$ 52,40');
  });

  it('USD mantém o valor original', () => {
    expect(formatPrecoRadar({ preco: 9.99, moeda: 'USD' })).toBe('US$ 9.99');
  });

  it('moeda ausente mantém USD (sem fingir BRL)', () => {
    expect(formatPrecoRadar({ preco: 9.99 })).toBe('US$ 9.99');
  });

  it('preço nulo retorna Sem preço', () => {
    expect(formatPrecoRadar({ preco: null })).toBe('Sem preço');
  });

  it('preço inválido retorna Sem preço', () => {
    expect(formatPrecoRadar({ preco: 'abc' })).toBe('Sem preço');
  });
});
