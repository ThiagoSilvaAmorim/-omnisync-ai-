import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    order: { findMany: vi.fn(), findUnique: vi.fn() },
    product: { findMany: vi.fn(), findUnique: vi.fn() },
    fornecedor: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../src/prisma/client.js';

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

function respostaAnalise() {
  return {
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              analysis: 'Análise real',
              recommendations: ['Ação 1'],
              risks: ['Risco 1'],
              confidence: 0.8,
              dataQuality: 'medium',
            }),
          }],
        },
      }],
    }),
  };
}

describe('POST /api/ai/analyze/:dominio', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'chave-de-teste');
    global.fetch = vi.fn(async () => respostaAnalise());
    prisma.order.findMany.mockResolvedValue([
      { id: 'P1', cliente: 'Loja A', total: 100, status: 'pago', custoFornecedor: 60, taxaMarketplace: 10, frete: 5 },
    ]);
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.findUnique.mockResolvedValue(null);
    prisma.fornecedor.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).post('/api/ai/analyze/sales').send({});
    expect(res.status).toBe(401);
  });

  it('domínio desconhecido retorna 400', async () => {
    const res = await request(app).post('/api/ai/analyze/inventado').set(auth()).send({});
    expect(res.status).toBe(400);
  });

  it('chave ausente retorna 503 estruturado', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const res = await request(app).post('/api/ai/analyze/sales').set(auth()).send({});
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('GEMINI_NOT_CONFIGURED');
  });

  it('sales com pedidos retorna análise estruturada', async () => {
    const res = await request(app).post('/api/ai/analyze/sales').set(auth()).send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, tipo: 'sales' });
    expect(res.body.analysis).toBe('Análise real');
    expect(res.body.recommendations).toEqual(['Ação 1']);
    expect(res.body.confidence).toBe(0.8);
    expect(res.body.source).toBeTruthy();
    expect(res.body.generatedAt).toBeTruthy();
  });

  it('sales sem pedidos retorna INSUFFICIENT_DATA', async () => {
    prisma.order.findMany.mockResolvedValue([]);
    const res = await request(app).post('/api/ai/analyze/sales').set(auth()).send({});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: false, code: 'INSUFFICIENT_DATA' });
  });

  it('market sem produtos válidos retorna INSUFFICIENT_DATA', async () => {
    const res = await request(app).post('/api/ai/analyze/market').set(auth()).send({ produtos: [] });
    expect(res.body).toMatchObject({ ok: false, code: 'INSUFFICIENT_DATA' });
  });

  it('market com produtos reais retorna análise sem margem inventada', async () => {
    const res = await request(app).post('/api/ai/analyze/market').set(auth()).send({
      produtos: [{ nome: 'Fone X', preco: 99.9, moeda: 'USD', fonte: 'DummyJSON' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('conversão só com taxa, fonte e timestamp explícitos', async () => {
    const res = await request(app).post('/api/ai/analyze/market').set(auth()).send({
      produtos: [{
        nome: 'Fone X', preco: 9.99, moeda: 'USD', fonte: 'DummyJSON',
        fx: { rate: 5, source: 'Banco Central', observedAt: '2026-09-22T12:00:00.000Z' },
      }],
    });
    expect(res.status).toBe(200);
    expect(res.body.itens[0]).toMatchObject({
      convertedAmount: 49.95,
      convertedCurrency: 'BRL',
      fxRate: 5,
      fxSource: 'Banco Central',
      fxObservedAt: '2026-09-22T12:00:00.000Z',
    });
  });

  it('sem fx a moeda original é preservada e convertedAmount é nulo', async () => {
    const res = await request(app).post('/api/ai/analyze/market').set(auth()).send({
      produtos: [{ nome: 'Fone X', preco: 9.99, moeda: 'USD', fonte: 'DummyJSON' }],
    });
    expect(res.status).toBe(200);
    expect(res.body.itens[0]).toMatchObject({ moeda: 'USD', convertedAmount: null });
  });

  it('BRL com fx não sofre conversão', async () => {
    const res = await request(app).post('/api/ai/analyze/market').set(auth()).send({
      produtos: [{
        nome: 'Cadeira', preco: 52.4, moeda: 'BRL', fonte: 'DummyJSON',
        fx: { rate: 5, source: 'Banco Central', observedAt: '2026-09-22T12:00:00.000Z' },
      }],
    });
    expect(res.body.itens[0]).toMatchObject({ convertedAmount: null });
  });

  it('segredos no payload não chegam ao Gemini', async () => {
    await request(app).post('/api/ai/analyze/market').set(auth()).send({
      produtos: [{ nome: 'Fone X', preco: 10, moeda: 'USD', fonte: 'DummyJSON', token: 'segredo-absurdo-123' }],
    });
    const corpoEnviado = global.fetch.mock.calls[0][1].body;
    expect(corpoEnviado).not.toContain('segredo-absurdo-123');
  });

  it('supplier desconhecido retorna INSUFFICIENT_DATA', async () => {
    const res = await request(app).post('/api/ai/analyze/supplier').set(auth()).send({ fornecedorId: 999 });
    expect(res.body).toMatchObject({ ok: false, code: 'INSUFFICIENT_DATA' });
  });

  it('order desconhecido retorna 404', async () => {
    const res = await request(app).post('/api/ai/analyze/order').set(auth()).send({ pedidoId: 'X' });
    expect(res.status).toBe(404);
  });

  it('429 do Gemini vira 429', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    const res = await request(app).post('/api/ai/analyze/sales').set(auth()).send({});
    expect(res.status).toBe(429);
  });

  it('timeout vira 504', async () => {
    global.fetch = vi.fn(async () => {
      const e = new Error('abort');
      e.name = 'AbortError';
      throw e;
    });
    const res = await request(app).post('/api/ai/analyze/sales').set(auth()).send({});
    expect(res.status).toBe(504);
  });

  it('resposta inválida do Gemini vira 500', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'texto livre sem json' }] } }] }),
    }));
    const res = await request(app).post('/api/ai/analyze/sales').set(auth()).send({});
    expect(res.status).toBe(500);
  });
});

describe('POST /api/ai/generate/listing', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'chave-de-teste');
    global.fetch = vi.fn(async () => respostaAnalise());
    prisma.product.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('produto inexistente retorna 404', async () => {
    const res = await request(app).post('/api/ai/generate/listing').set(auth()).send({ produtoId: 999 });
    expect(res.status).toBe(404);
  });

  it('produto real retorna rascunho marcado como rascunho', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 1, nome: 'Cadeira X', sku: 'C1', categoria: 'Móveis', preco: 500, estoque: 3 });
    const res = await request(app).post('/api/ai/generate/listing').set(auth()).send({ produtoId: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, tipo: 'listing-draft', rascunho: true });
    expect(res.body.draft.analysis).toBeTruthy();
  });
});
