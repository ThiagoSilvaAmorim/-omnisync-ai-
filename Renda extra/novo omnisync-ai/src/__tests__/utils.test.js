import { describe, it, expect } from 'vitest';
import { cn, formatValue } from '../lib/utils';

describe('cn', () => {
  it('junta classes ignorando valores falsos', () => {
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
  });
});

describe('formatValue', () => {
  it('formata número com separador de milhar', () => {
    expect(formatValue(1284, 'number')).toBe('1.284');
  });

  it('formata moeda em BRL', () => {
    expect(formatValue(99.9, 'currency')).toContain('99,90');
  });
});
