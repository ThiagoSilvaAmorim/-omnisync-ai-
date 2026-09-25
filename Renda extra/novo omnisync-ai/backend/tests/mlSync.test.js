import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/services/mlOAuth.js', () => ({
  mlOAuth: { getValidAccessToken: vi.fn(), getIntegration: vi.fn() },
}));

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    contaIntegracao: { findMany: vi.fn(), update: vi.fn() },
    catalogProduct: { upsert: vi.fn() },
  },
}));

import { executarSyncInicial, lerStatusSync } from '../src/services/mlSync.js';
import { mlOAuth } from '../src/services/mlOAuth.js';
import { prisma } from '../src/prisma/client.js';

function resposta(ok, status, body) {
  return { ok, status, json: async () => body };
}

const CONTA = { id: 7, metadados: {}, provedor: 'mercadolivre' };

function fetchPadrao(ids) {
  return vi.fn(async url => {
    const u = String(url);
    if (u.includes('/items/search')) {
      return resposta(true, 200, { results: ids, paging: { total: ids.length, limit: 50, offset: 0 } });
    }
    if (u.includes('/items?ids=')) {
      const pedidos = decodeURIComponent(u.split('ids=')[1].split('&')[0]).split(',');
      return resposta(true, 200, pedidos.map(id => ({
        code: 200,
        body: {
          id,
          title: `Anúncio ${id}`,
          price: 100,
          currency_id: 'BRL',
          status: 'active',
          sold_quantity: 3,
          permalink: `https://www.mercadolivre.com.br/anuncio/${id}`,
          thumbnail: `https://http2.mlstatic.com/${id}.jpg`,
          seller_id: 238610309,
        },
      })));
    }
    return resposta(false, 404, {});
  });
}

describe('mlSync — sync inicial ML → products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mlOAuth.getValidAccessToken.mockResolvedValue('tok-ml');
    mlOAuth.getIntegration.mockResolvedValue({ mlUserId: '238610309' });
    prisma.contaIntegracao.findMany.mockResolvedValue([CONTA]);
    prisma.contaIntegracao.update.mockResolvedValue({});
    prisma.catalogProduct.upsert.mockResolvedValue({});
    global.fetch = fetchPadrao(['MLB1', 'MLB2']);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sem token grava erro e não consulta a API', async () => {
    mlOAuth.getValidAccessToken.mockResolvedValue(null);
    const r = await executarSyncInicial(1);
    expect(r.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    const ultima = prisma.contaIntegracao.update.mock.calls.at(-1)[0];
    expect(ultima.data.metadados.syncStatus).toBe('erro');
  });

  it('lista ids do seller, detalha em lotes e faz upsert por mlItemId', async () => {
    const r = await executarSyncInicial(1);

    expect(r).toEqual({ ok: true, total: 2, feitos: 2 });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    expect(prisma.catalogProduct.upsert).toHaveBeenCalledTimes(2);
    const { where, create, update } = prisma.catalogProduct.upsert.mock.calls[0][0];
    expect(where).toEqual({ mlItemId: 'MLB1' });
    expect(create.supplierId).toBeNull();
    expect(create.mlItemId).toBe('MLB1');
    expect(create.preco).toBe(100);
    expect(update.vendidos).toBe(3);
    expect(update.permalink).toContain('MLB1');

    const metadados = prisma.contaIntegracao.update.mock.calls.at(-1)[0].data.metadados;
    expect(metadados.syncStatus).toBe('ok');
    expect(metadados.syncTotal).toBe(2);
    expect(metadados.syncFeitos).toBe(2);
  });

  it('conta zero anúncios termina 0 de 0 (sem inventar)', async () => {
    global.fetch = fetchPadrao([]);
    const r = await executarSyncInicial(1);

    expect(r).toEqual({ ok: true, total: 0, feitos: 0 });
    expect(prisma.catalogProduct.upsert).not.toHaveBeenCalled();
    const metadados = prisma.contaIntegracao.update.mock.calls.at(-1)[0].data.metadados;
    expect(metadados.syncStatus).toBe('ok');
    expect(metadados.syncTotal).toBe(0);
    expect(metadados.syncFeitos).toBe(0);
  });

  it('falha na API do ML vira syncStatus erro com a causa', async () => {
    global.fetch = vi.fn(async () => resposta(false, 503, {}));
    const r = await executarSyncInicial(1);

    expect(r.ok).toBe(false);
    const metadados = prisma.contaIntegracao.update.mock.calls.at(-1)[0].data.metadados;
    expect(metadados.syncStatus).toBe('erro');
    expect(metadados.syncErro).toContain('503');
  });

  it('lerStatusSync lê o progresso gravado em metadados', async () => {
    await executarSyncInicial(1);
    const contaAtualizada = prisma.contaIntegracao.update.mock.calls.at(-1)[0].data.metadados;
    expect(lerStatusSync({ metadados: contaAtualizada })).toMatchObject({
      status: 'ok',
      total: 2,
      feitos: 2,
      erro: null,
    });
  });
});
