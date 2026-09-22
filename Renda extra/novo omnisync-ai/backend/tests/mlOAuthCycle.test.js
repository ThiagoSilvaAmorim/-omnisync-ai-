import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';
import { mlOAuth } from '../src/services/mlOAuth.js';

// ============================================
// Ciclo OAuth ML com banco fake em memória:
// start → callback → status → disconnect →
// status → start (reconexão). Nenhum dado real
// é tocado; o backend de produção não é chamado.
// ============================================

const store = new Map();
const chave = (provedor, empresaId) => `${provedor}:${empresaId}`;

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    contaIntegracao: {
      upsert: vi.fn(async ({ where, update, create }) => {
        const k = chave(where.provedor_empresaId.provedor, where.provedor_empresaId.empresaId);
        const atual = store.get(k) || { id: store.size + 1 };
        const next = { ...atual, ...create, ...update };
        store.set(k, next);
        return next;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return store.get(chave(where.provedor_empresaId.provedor, where.provedor_empresaId.empresaId)) || null;
      }),
      update: vi.fn(async ({ where, data }) => {
        const k = chave(where.provedor_empresaId.provedor, where.provedor_empresaId.empresaId);
        const atual = store.get(k);
        if (!atual) {
          const e = new Error('Record not found');
          e.code = 'P2025';
          throw e;
        }
        const next = { ...atual, ...data };
        store.set(k, next);
        return next;
      }),
    },
  },
}));

vi.mock('../src/eventBus.js', () => ({ emitEvent: vi.fn() }));
vi.mock('../src/cripto.js', () => ({
  criptografar: vi.fn((d) => `enc:${d}`),
  descriptografar: vi.fn((d) => String(d).replace(/^enc:/, '')),
}));

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

describe('ciclo desconectar → reconectar (TESTE A)', () => {
  beforeEach(() => {
    store.clear();
    vi.stubEnv('ML_CLIENT_ID', 'id-teste');
    vi.stubEnv('ML_CLIENT_SECRET', 'segredo-teste');
    vi.stubEnv('ML_REDIRECT_URI', 'https://api.teste/api/auth/ml/callback');
    vi.stubEnv('FRONTEND_URL', 'https://app.teste');
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/oauth/token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'tok-1', refresh_token: 'ref-1',
            expires_in: 21600, token_type: 'Bearer', user_id: 42,
          }),
        };
      }
      return { ok: true, json: async () => ({ id: 42, nickname: 'lojateste' }) };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('start gera URL oficial com state/PKCE', async () => {
    const res = await request(app).get('/api/auth/ml/start').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.url.startsWith('https://auth.mercadolivre.com.br/authorization?')).toBe(true);
    expect(res.body.state).toBeTruthy();
    expect(res.body.url).toContain('code_challenge');
    expect(res.body.url).not.toMatch(/SEU_CLIENT_ID|localhost/);
  });

  it('callback válido persiste e status fica conectado', async () => {
    const inicio = await request(app).get('/api/auth/ml/start').set(auth());
    const cb = await request(app).get(`/api/auth/ml/callback?code=abc&state=${inicio.body.state}`);
    expect(cb.status).toBe(302);
    expect(cb.headers.location).toContain('connected=mercadolivre');
    const st = await request(app).get('/api/auth/ml/status').set(auth());
    expect(st.status).toBe(200);
    expect(st.body.status).toBe('conectado');
    expect(st.body.conta).toBeTruthy();
  });

  it('segunda autorização atualiza a mesma conexão (sem duplicar)', async () => {
    const i1 = await request(app).get('/api/auth/ml/start').set(auth());
    await request(app).get(`/api/auth/ml/callback?code=a&state=${i1.body.state}`);
    const i2 = await request(app).get('/api/auth/ml/start').set(auth());
    await request(app).get(`/api/auth/ml/callback?code=b&state=${i2.body.state}`);
    expect(store.size).toBe(1);
    const st = await request(app).get('/api/auth/ml/status').set(auth());
    expect(st.body.status).toBe('conectado');
  });

  it('disconnect → status sai de conectado → start funciona de novo', async () => {
    const i1 = await request(app).get('/api/auth/ml/start').set(auth());
    await request(app).get(`/api/auth/ml/callback?code=a&state=${i1.body.state}`);
    const antes = await request(app).get('/api/auth/ml/status').set(auth());
    expect(antes.body.status).toBe('conectado');

    const off = await request(app).post('/api/auth/ml/disconnect').set(auth());
    expect(off.status).toBe(200);

    const depois = await request(app).get('/api/auth/ml/status').set(auth());
    expect(depois.body.status).not.toBe('conectado');

    const i2 = await request(app).get('/api/auth/ml/start').set(auth());
    expect(i2.status).toBe(200);
    expect(i2.body.url.startsWith('https://auth.mercadolivre.com.br/')).toBe(true);
  });

  it('callback com state inválido retorna 400 sem salvar nada', async () => {
    const res = await request(app).get('/api/auth/ml/callback?code=a&state=invalido');
    expect(res.status).toBe(400);
    expect(store.size).toBe(0);
  });

  it('callback com code ausente retorna 400', async () => {
    const i1 = await request(app).get('/api/auth/ml/start').set(auth());
    const res = await request(app).get(`/api/auth/ml/callback?state=${i1.body.state}`);
    expect(res.status).toBe(400);
  });
});
