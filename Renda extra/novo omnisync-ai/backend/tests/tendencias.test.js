import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';
import { mlOAuth } from '../src/services/mlOAuth.js';

vi.mock('../src/services/mlOAuth.js', () => ({
  mlOAuth: { getValidAccessToken: vi.fn() },
}));

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    tendencia: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async ops => {
      for (const op of ops) await op;
      return ops;
    }),
  },
}));

import { prisma } from '../src/prisma/client.js';

const TRENDS = [
  { keyword: 'fone bluetooth', url: 'https://lista.mercadolivre.com.br/fone-bluetooth' },
  { keyword: 'smartwatch', url: 'https://lista.mercadolivre.com.br/smartwatch' },
];

function resposta(ok, status, body) {
  return { ok, status, json: async () => body };
}

function auth() {
  const token = assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
  return { Authorization: `Bearer ${token}` };
}

function linhasSalvas() {
  return TRENDS.map((t, i) => ({
    ordem: i + 1,
    termo: t.keyword,
    termoUrl: t.url,
    produtoTitulo: null,
    produtoImagem: null,
    produtoPreco: null,
    produtoLink: null,
    atualizadoEm: new Date(),
  }));
}

describe('tendências ML (API oficial /trends, cache 24h)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mlOAuth.getValidAccessToken.mockResolvedValue('tok-ml');
    prisma.tendencia.findMany.mockResolvedValue([]);
    prisma.tendencia.deleteMany.mockResolvedValue({ count: 0 });
    prisma.tendencia.createMany.mockResolvedValue({ count: TRENDS.length });
    global.fetch = vi.fn(async url => {
      const u = String(url);
      if (u.includes('/trends/MLB')) return resposta(true, 200, TRENDS);
      if (u.includes('/sites/MLB/search')) return resposta(false, 403, { status: 403 });
      return resposta(false, 404, {});
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sem token conectado retorna 401 e não consulta a API', async () => {
    mlOAuth.getValidAccessToken.mockResolvedValue(null);
    const res = await request(app).get('/api/tendencias').set(auth());
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('categoria inválida retorna 400', async () => {
    const res = await request(app).get('/api/tendencias?categoria=celular').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_CATEGORY');
  });

  it('sem cache varre /trends, tolera 403 na busca por termo e guarda a url oficial', async () => {
    const res = await request(app).get('/api/tendencias').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.cache).toBe(false);
    expect(res.body.total).toBe(2);
    expect(res.body.termos[0]).toMatchObject({
      ordem: 1,
      termo: 'fone bluetooth',
      termoUrl: 'https://lista.mercadolivre.com.br/fone-bluetooth',
      produto: null,
    });
    expect(res.body.termos[1].termo).toBe('smartwatch');

    // 1 chamada de trends + 2 buscas de termo (sequenciais, >= 300ms entre elas).
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(prisma.tendencia.deleteMany).toHaveBeenCalledWith({ where: { categoria: '' } });
    expect(prisma.tendencia.createMany).toHaveBeenCalledTimes(1);
  });

  it('respeita ritmo de >= 300ms entre buscas de termo (nunca paralelo)', async () => {
    const inicio = Date.now();
    const res = await request(app).get('/api/tendencias').set(auth());
    const decorrido = Date.now() - inicio;
    expect(res.status).toBe(200);
    expect(decorrido).toBeGreaterThanOrEqual(300);
  });

  it('servindo do cache (24h) não chama a API nem refaz a varredura', async () => {
    prisma.tendencia.findMany.mockResolvedValue(linhasSalvas());
    const res = await request(app).get('/api/tendencias').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.cache).toBe(true);
    expect(res.body.total).toBe(2);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.tendencia.deleteMany).not.toHaveBeenCalled();
  });

  it('atualizar=1 ignora o cache vigente e refaz a varredura', async () => {
    prisma.tendencia.findMany.mockResolvedValue(linhasSalvas());
    const res = await request(app).get('/api/tendencias?atualizar=1').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.cache).toBe(false);
    expect(global.fetch).toHaveBeenCalled();
    expect(prisma.tendencia.deleteMany).toHaveBeenCalled();
  });

  it('produto encontrado na busca vira card com título/preço/link', async () => {
    global.fetch = vi.fn(async url => {
      const u = String(url);
      if (u.includes('/trends/MLB')) return resposta(true, 200, TRENDS);
      if (u.includes('/sites/MLB/search')) {
        return resposta(true, 200, {
          results: [{
            title: 'Fone Bluetooth X',
            thumbnail: 'https://http2.mlstatic.com/foto.jpg',
            price: 199.9,
            permalink: 'https://www.mercadolivre.com.br/anuncio/1',
          }],
        });
      }
      return resposta(false, 404, {});
    });
    const res = await request(app).get('/api/tendencias').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.termos[0].produto).toMatchObject({
      titulo: 'Fone Bluetooth X',
      preco: 199.9,
      link: 'https://www.mercadolivre.com.br/anuncio/1',
    });
  });

  it('falha no /trends vira 502 com código, sem inventar lista', async () => {
    global.fetch = vi.fn(async () => resposta(false, 403, { status: 403 }));
    const res = await request(app).get('/api/tendencias').set(auth());

    expect(res.status).toBe(502);
    expect(res.body.code).toBe('ML_TRENDS_FAILED');
    expect(prisma.tendencia.createMany).not.toHaveBeenCalled();
  });
});
