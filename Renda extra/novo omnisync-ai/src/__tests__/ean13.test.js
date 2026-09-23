import { describe, it, expect } from 'vitest';
import { gerarEan13, validarEan13, digitoVerificador } from '../lib/ean13';

describe('ean13 (puro)', () => {
  it('dígito verificador do exemplo oficial', () => {
    // 5901234123457 é um EAN-13 válido conhecido.
    expect(digitoVerificador('590123412345')).toBe('7');
    expect(validarEan13('5901234123457')).toBe(true);
  });

  it('gerado sempre passa na validação', () => {
    for (let i = 0; i < 20; i++) {
      const codigo = gerarEan13('789');
      expect(codigo).toMatch(/^789\d{10}$/);
      expect(validarEan13(codigo)).toBe(true);
    }
  });

  it('rejeita códigos inválidos', () => {
    expect(validarEan13('5901234123458')).toBe(false);
    expect(validarEan13('123')).toBe(false);
    expect(validarEan13('')).toBe(false);
  });
});
