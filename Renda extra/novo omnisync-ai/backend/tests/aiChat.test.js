import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

// ============================================
// POST /api/ai — chatbot via Gemini (backend).
// A chave nunca aparece aqui: usa-se ausência/
// presença simulada via stubEnv e fetch mockado.
// ============================================

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function tokenExpirado() {
  // Assina com a mesma regra de auth.js, sem expor nenhum segredo.
  const segredo = process.env.JWT_SECRET || 'omnisync-dev-secret';
  const corpo = Buffer.from(
    JSON.stringify({ email: 't@t.ai', nome: 'T', perfil: 'Diretor', exp: Date.now() - 1000 })
  ).toString('base64url');
  const assinatura = crypto.createHmac('sha256', segredo).update(corpo).digest('base64url');
  return `${corpo}.${assinatura}`;
}

function respostaGemini(texto) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: texto }] } }],
    }),
  };
}

describe('POST /api/ai', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'chave-de-teste');
    global.fetch = vi.fn(async () => respostaGemini('Olá do Gemini'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).post('/api/ai').send({ history: [] });
    expect(res.status).toBe(401);
  });

  it('token inválido retorna 401', async () => {
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', 'Bearer token-invalido')
      .send({ history: [] });
    expect(res.status).toBe(401);
  });

  it('JWT expirado retorna 401', async () => {
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenExpirado()}`)
      .send({ history: [] });
    expect(res.status).toBe(401);
  });

  it('chave ausente retorna 503 GEMINI_NOT_CONFIGURED', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [{ role: 'user', text: 'oi' }] });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('GEMINI_NOT_CONFIGURED');
    expect(JSON.stringify(res.body)).not.toMatch(/chave-de-teste|sk-|eyJ/i);
  });

  it('chave presente e resposta válida retorna answer normalizado', async () => {
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [{ role: 'user', text: 'oi' }] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, answer: 'Olá do Gemini', provider: 'gemini' });
  });

  it('resposta 403 do Gemini vira 403', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [] });
    expect(res.status).toBe(403);
  });

  it('resposta 429 do Gemini vira 429', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [] });
    expect(res.status).toBe(429);
  });

  it('erro 500 do Gemini vira 500 genérico sem vazar detalhe', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: { message: 'x' } }) }));
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [] });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Falha ao consultar o Gemini.');
  });

  it('timeout vira 504', async () => {
    global.fetch = vi.fn(async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    });
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [] });
    expect(res.status).toBe(504);
  });

  it('resposta vazia do Gemini vira 500', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '' }] } }] }),
    }));
    const res = await request(app)
      .post('/api/ai')
      .set('Authorization', `Bearer ${tokenValido()}`)
      .send({ history: [] });
    expect(res.status).toBe(500);
  });
});
