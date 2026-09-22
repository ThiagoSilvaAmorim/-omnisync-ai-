import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { askAssistant, aiDisponivel } from '../lib/gemini';

describe('askAssistant (via backend, sem chave no navegador)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'https://api.teste');
    vi.stubEnv('VITE_GEMINI_API_KEY', 'chave-que-nunca-deve-ser-usada');
    localStorage.setItem('omnisync-token', 'jwt-valido');
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'T' }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem backend configurado lança IA não configurada', async () => {
    vi.stubEnv('VITE_API_URL', '');
    await expect(askAssistant([{ role: 'user', text: 'oi' }])).rejects.toThrow('IA não configurada');
  });

  it('resposta válida retorna o texto real', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, answer: 'Resposta real', provider: 'gemini' }),
    }));
    await expect(askAssistant([{ role: 'user', text: 'oi' }])).resolves.toBe('Resposta real');
  });

  it('401 limpa a sessão e pede novo login', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Autenticação necessária' }),
    }));
    await expect(askAssistant([{ role: 'user', text: 'oi' }])).rejects.toThrow('Sessão expirada');
    expect(localStorage.getItem('omnisync-token')).toBeNull();
  });

  it('GEMINI_NOT_CONFIGURED vira IA não configurada', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ code: 'GEMINI_NOT_CONFIGURED', message: 'x' }),
    }));
    await expect(askAssistant([{ role: 'user', text: 'oi' }])).rejects.toThrow('IA não configurada');
  });

  it('erro de rede vira falha explícita, nunca resposta simulada', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('rede caiu'); });
    await expect(askAssistant([{ role: 'user', text: 'oi' }])).rejects.toThrow('Falha ao consultar a IA');
  });

  it('resposta vazia vira erro', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, answer: '', provider: 'gemini' }),
    }));
    await expect(askAssistant([{ role: 'user', text: 'oi' }])).rejects.toThrow('Resposta vazia');
  });

  it('envia o JWT sem expor segredo no corpo', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, answer: 'ok', provider: 'gemini' }),
    }));
    globalThis.fetch = fetchMock;
    await askAssistant([{ role: 'user', text: 'oi' }]);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer jwt-valido');
    expect(opts.body).not.toMatch(/jwt-valido|token|secret|senha/i);
  });

  it('aiDisponivel reflete o backend, não a chave', () => {
    expect(aiDisponivel()).toBe(true);
    vi.stubEnv('VITE_API_URL', '');
    expect(aiDisponivel()).toBe(false);
  });
});
