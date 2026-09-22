import { describe, it, expect, beforeEach } from 'vitest';
import { invalidarSessaoExpirada, normalizarInicioOAuth } from '../services/api';

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

describe('normalizarInicioOAuth', () => {
  it('converte resposta do backend {url, state} para {authUrl, state}', () => {
    const r = normalizarInicioOAuth({ url: 'https://auth.mercadolivre.com.br/authorization?x=1', state: 'abc' });
    expect(r).toEqual({ authUrl: 'https://auth.mercadolivre.com.br/authorization?x=1', state: 'abc' });
  });

  it('preserva fallback local {authUrl, state}', () => {
    const r = normalizarInicioOAuth({ authUrl: '#', state: 'mock-state' });
    expect(r).toEqual({ authUrl: '#', state: 'mock-state' });
  });

  it('resposta vazia vira authUrl null (botão exibe erro explícito)', () => {
    expect(normalizarInicioOAuth(null)).toEqual({ authUrl: null, state: null });
    expect(normalizarInicioOAuth({})).toEqual({ authUrl: null, state: null });
  });
});
