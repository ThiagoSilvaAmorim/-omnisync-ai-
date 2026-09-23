import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';
import { mlOAuth } from '../src/services/mlOAuth.js';
import { mlOAuth } from '../src/services/mlOAuth.js';

// ============================================
// Ciclo OAuth ML com banco fake em memória:
// start → callback → status → disconnect →
// status → start (reconexão). Nenhum dado real
// é tocado; o backend de produção não é chamado.
// ============================================

const store = new Map();
const chave = (provedor, empresaId, mlUserId) => `${provedor}:${empresaId}:${mlUserId ?? ''}`;

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    contaIntegracao: {
      upsert: vi.fn(async ({ where, update, create }) => {
        const w = where.provedor_empresaId_mlUserId;
        const k = chave(w.provedor, w.empresaId, w.mlUserId);
        const atual = store.get(k) || { id: store.size + 1 };
        const next = { ...atual, ...create, ...update };
        store.set(k, next);
        return next;
      }),
      findUnique: vi.fn(async ({ where }) => {
        if (where.provedor_empresaId_mlUserId) {
          const w = where.provedor_empresaId_mlUserId;
          return store.get(chave(w.provedor, w.empresaId, w.mlUserId)) || null;
        }
        if (where.id != null) {
          return [...store.values()].find(r => r.id === where.id) || null;
        }
        return null;
      }),
      findMany: vi.fn(async ({ where } = {}) => {
        let todos = [...store.values()];
        if (where?.provedor) todos = todos.filter(r => r.provedor === where.provedor);
        if (where?.empresaId != null) todos = todos.filter(r => r.empresaId === where.empresaId);
        todos.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        return todos;
      }),
      update: vi.fn(async ({ where, data }) => {
        const atual = [...store.values()].find(r => r.id === where.id);
        if (!atual) {
          const e = new Error('Record not found');
          e.code = 'P2025';
          throw e;
        }
        const next = { ...atual, ...data };
        const k = chave(next.provedor, next.empresaId, next.mlUserId);
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

describe('multi-loja (sellers isolados)', () => {
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
            access_token: 'tok-x', refresh_token: 'ref-x',
            expires_in: 21600, token_type: 'Bearer', user_id: 99,
          }),
        };
      }
      return { ok: true, json: async () => ({ id: 99, nickname: 'lojab' }) };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  async function conectar() {
    const i = await request(app).get('/api/auth/ml/start').set(auth());
    await request(app).get(`/api/auth/ml/callback?code=c&state=${i.body.state}`);
  }

  it('segunda loja cria nova linha em vez de sobrescrever', async () => {
    await mlOAuth.saveIntegration({
      empresaId: 1, userId: 1,
      tokens: { access_token: 'a', refresh_token: 'r', expires_in: 1, token_type: 'B', user_id: 11 },
      mlUser: { id: 11, nickname: 'loja-a' },
    });
    await mlOAuth.saveIntegration({
      empresaId: 1, userId: 1,
      tokens: { access_token: 'b', refresh_token: 's', expires_in: 1, token_type: 'B', user_id: 22 },
      mlUser: { id: 22, nickname: 'loja-b' },
    });
    expect(store.size).toBe(2);
    const a = await mlOAuth.getIntegration(1, '11');
    const b = await mlOAuth.getIntegration(1, '22');
    expect(a.mlUserId).toBe('11');
    expect(b.mlUserId).toBe('22');
  });

  it('empresa não acessa seller de outra empresa', async () => {
    await mlOAuth.saveIntegration({
      empresaId: 1, userId: 1,
      tokens: { access_token: 'a', refresh_token: 'r', expires_in: 1, token_type: 'B', user_id: 11 },
      mlUser: { id: 11, nickname: 'loja-a' },
    });
    expect(await mlOAuth.getIntegration(2, '11')).toBeNull();
    expect(await mlOAuth.getIntegration(2)).toBeNull();
  });

  it('status lista sellers sem segredos', async () => {
    await conectar();
    const st = await request(app).get('/api/auth/ml/status').set(auth());
    expect(st.status).toBe(200);
    expect(Array.isArray(st.body.sellers)).toBe(true);
    expect(st.body.sellers).toHaveLength(1);
    expect(st.body.sellers[0]).toMatchObject({ mlUserId: '99' });
    expect(JSON.stringify(st.body)).not.toMatch(/tok-x|ref-x|segredo/i);
  });

  it('disconnect com mlUserId desativa só aquela loja', async () => {
    await mlOAuth.saveIntegration({
      empresaId: 1, userId: 1,
      tokens: { access_token: 'a', refresh_token: 'r', expires_in: 1, token_type: 'B', user_id: 11 },
      mlUser: { id: 11, nickname: 'loja-a' },
    });
    await mlOAuth.saveIntegration({
      empresaId: 1, userId: 1,
      tokens: { access_token: 'b', refresh_token: 's', expires_in: 1, token_type: 'B', user_id: 22 },
      mlUser: { id: 22, nickname: 'loja-b' },
    });
    const off = await request(app).post('/api/auth/ml/disconnect').set(auth()).send({ mlUserId: '11' });
    expect(off.status).toBe(200);
    expect(await mlOAuth.getIntegration(1, '11')).toBeNull();
    const b = await mlOAuth.getIntegration(1, '22');
    expect(b).toBeTruthy();
    expect(b.ativo).toBe(true);
  });
});
