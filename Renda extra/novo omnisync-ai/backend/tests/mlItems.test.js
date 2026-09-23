import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';
import { approvalEngine } from '../src/approvalEngine.js';
import { mlOAuth } from '../src/services/mlOAuth.js';

vi.mock('../src/approvalEngine.js', () => ({
  approvalEngine: {
    getSolicitacao: vi.fn(),
    marcarExecutada: vi.fn(),
  },
}));

vi.mock('../src/services/mlOAuth.js', () => ({
  mlOAuth: { getValidAccessToken: vi.fn() },
}));

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

function aprovacaoOk(action) {
  return { id: 'apv-1', status: 'aprovada', action };
}

describe('escrita ML exige aprovação (nunca automática)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mlOAuth.getValidAccessToken.mockResolvedValue('tok-ml');
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'MLB1' }) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).post('/api/ml/items').send({ approvalId: 'x', item: {} });
    expect(res.status).toBe(401);
  });

  it('sem approvalId retorna 403 e não chama o ML', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(null);
    const res = await request(app)
      .post('/api/ml/items')
      .set(auth())
      .send({ item: { title: 'X', price: 10 } });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('APPROVAL_REQUIRED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('aprovação de outra ação retorna 403 sem executar', async () => {
    approvalEngine.getSolicitacao.mockReturnValue({ id: 'a', status: 'aprovada', action: 'outra' });
    const res = await request(app)
      .put('/api/ml/items/MLB1/price')
      .set(auth())
      .send({ approvalId: 'a', price: 20 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('APPROVAL_MISMATCH');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('publicar com aprovação cria e marca executada', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.publish'));
    const res = await request(app)
      .post('/api/ml/items')
      .set(auth())
      .send({ approvalId: 'apv-1', item: { title: 'Cadeira', price: 100 } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ok: true });
    expect(approvalEngine.marcarExecutada).toHaveBeenCalledWith('apv-1', expect.anything());
  });

  it('preço inválido retorna 400 antes do ML', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.price'));
    const res = await request(app)
      .put('/api/ml/items/MLB1/price')
      .set(auth())
      .send({ approvalId: 'apv-1', price: 0 });
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('estoque negativo retorna 400', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.stock'));
    const res = await request(app)
      .put('/api/ml/items/MLB1/stock')
      .set(auth())
      .send({ approvalId: 'apv-1', quantity: -1 });
    expect(res.status).toBe(400);
  });

  it('status inválido retorna 400', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.status'));
    const res = await request(app)
      .put('/api/ml/items/MLB1/status')
      .set(auth())
      .send({ approvalId: 'apv-1', status: 'deleted' });
    expect(res.status).toBe(400);
  });

  it('pausar com aprovação funciona', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.status'));
    const res = await request(app)
      .put('/api/ml/items/MLB1/status')
      .set(auth())
      .send({ approvalId: 'apv-1', status: 'paused' });
    expect(res.status).toBe(200);
  });

  it('conta desconectada retorna 401 sem chamar o ML', async () => {
    mlOAuth.getValidAccessToken.mockResolvedValue(null);
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.price'));
    const res = await request(app)
      .put('/api/ml/items/MLB1/price')
      .set(auth())
      .send({ approvalId: 'apv-1', price: 20 });
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leitura de envio sanitizada sem vazar token', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'S1', status: 'shipped', tracking_number: 'BR123', receiver_address: { city: { name: 'SP' } } }),
    }));
    const res = await request(app).get('/api/ml/shipments/S1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.envio).toMatchObject({ id: 'S1', status: 'shipped', trackingNumber: 'BR123' });
    expect(JSON.stringify(res.body)).not.toMatch(/tok-ml|Bearer/i);
  });

  it('401 do ML vira 401 com reautorização', async () => {
    approvalEngine.getSolicitacao.mockReturnValue(aprovacaoOk('ml.price'));
    global.fetch = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    const res = await request(app)
      .put('/api/ml/items/MLB1/price')
      .set(auth())
      .send({ approvalId: 'apv-1', price: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Reautoriz|expirado|inválido/i);
  });
});
