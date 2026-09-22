import { describe, it, expect, beforeEach } from 'vitest';
import { invalidarSessaoExpirada } from '../services/api';

describe('invalidarSessaoExpirada', () => {
  beforeEach(() => {
    localStorage.setItem('omnisync-token', 'token-antigo');
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'Teste' }));
  });

  it('remove token e usuário do armazenamento local', () => {
    invalidarSessaoExpirada();
    expect(localStorage.getItem('omnisync-token')).toBeNull();
    expect(localStorage.getItem('omnisync-user')).toBeNull();
  });

  it('não lança quando o armazenamento falha', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => { throw new Error('indisponível'); },
        removeItem: () => { throw new Error('indisponível'); },
        setItem: () => { throw new Error('indisponível'); },
      },
      configurable: true,
    });
    expect(() => invalidarSessaoExpirada()).not.toThrow();
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true });
  });
});
