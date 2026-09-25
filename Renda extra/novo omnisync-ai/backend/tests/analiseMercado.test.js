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
    analiseMercado: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma/client.js';
import { urlPublicaMercadoLivre } from '../src/services/mlCatalogo.js';

const PRODUTOS = [
  {
    id: 'MLB111', name: 'Fone A', status: 'active', domain_id: 'MLB-HEADPHONES',
    date_created: '2024-01-01T00:00:00Z', pictures: [], children_ids: [], attributes: [],
  },
  {
    id: 'MLB222', name: 'Fone B', status: 'inactive', domain_id: 'MLB-HEADPHONES',
    date_created: '2025-06-01T00:00:00Z', pictures: [], children_ids: ['MLB2221'], attributes: [],
  },
];

function resposta(ok, status, body) {
  return { ok, status, json: async () => body };
}

function fetchPadrao() {
  return vi.fn(async url => {
    const u = String(url);
    if (u.includes('/products/search')) {
      return resposta(true, 200, { results: PRODUTOS, paging: { total: 10000, limit: 50, offset: 0 } });
    }
    const m = u.match(/\/products\/(MLB\d+)$/);
    if (m) {
      return resposta(true, 200, {
        id: m[1],
        name: `Detalhe ${m[1]}`,
        status: 'active',
        permalink: `https://www.mercadolivre.com.br/produto/${m[1]}`,
        pictures: [{ url: 'https://http2.mlstatic.com/foto.jpg' }],
        attributes: [{ id: 'BRAND', value_name: 'MarcaX' }],
        children_ids: [],
        date_created: '2024-02-02T00:00:00Z',
      });
    }
    return resposta(false, 404, { error: 'not found' });
  });
}

function auth() {
  const token = assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
  return { Authorization: `Bearer ${token}` };
}

function criarMock(data) {
  return {
    id: 11,
    termo: data.termo,
    chave: data.chave,
    empresaId: data.empresaId,
    fonte: data.fonte,
    totalResultados: data.totalResultados,
    criadaEm: new Date(),
    expiraEm: data.expiraEm,
    itens: data.itens.create.map((i, idx) => ({ id: idx + 1, ...i })),
  };
}

describe('analise-mercado (catálogo oficial do ML, sem scrape)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mlOAuth.getValidAccessToken.mockResolvedValue('tok-ml');
    prisma.analiseMercado.findFirst.mockResolvedValue(null);
    global.fetch = fetchPadrao();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).post('/api/analise-mercado').send({ termo: 'fone' });
    expect(res.status).toBe(401);
  });

  it('termo vazio retorna 400 e não consulta a API', async () => {
    const res = await request(app).post('/api/analise-mercado').set(auth()).send({ termo: '  ' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_TERM');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('cria análise com campos não expostos pelo catálogo em null (front mostra "—")', async () => {
    prisma.analiseMercado.create.mockImplementation(async ({ data }) => criarMock(data));
    const res = await request(app).post('/api/analise-mercado').set(auth()).send({ termo: '  fone   bluetooth ' });

    expect(res.status).toBe(201);
    expect(res.body.cached).toBe(false);
    expect(res.body.analise.termo).toBe('fone bluetooth');
    expect(res.body.analise.fonte).toBe('catalogo_ml');
    expect(res.body.analise.itens).toHaveLength(2);

    const item = res.body.analise.itens[0];
    expect(item.produtoId).toBe('MLB111');
    expect(item.marca).toBe('MarcaX');
    expect(item.imagemUrl).toBe('https://http2.mlstatic.com/foto.jpg');
    expect(item.permalink).toContain('MLB111');
    expect(Number.isFinite(item.diasNoAr)).toBe(true);
    expect(item.vendasMes).toBeNull();
    expect(item.vendasDia).toBeNull();
    expect(item.preco).toBeNull();
    expect(item.freteGratis).toBeNull();
    expect(item.reputacao).toBeNull();
    // Link clicável: permalink oficial do detalhe quando existe.
    expect(item.urlPublica).toBe('https://www.mercadolivre.com.br/produto/MLB111');

    const chamada = prisma.analiseMercado.create.mock.calls[0][0];
    expect(chamada.data.itens.create).toHaveLength(2);
    expect(chamada.data.chave).toBe('fone bluetooth');
    // Cache de 6h.
    const horas = (chamada.data.expiraEm.getTime() - Date.now()) / 3600000;
    expect(horas).toBeGreaterThan(5.9);
    expect(horas).toBeLessThan(6.1);
    expect(String(global.fetch.mock.calls[0][0])).toContain('/products/search?site_id=MLB&q=fone%20bluetooth&limit=20');
  });

  it('devolve cache vigente sem chamar a API nem criar de novo', async () => {
    prisma.analiseMercado.findFirst.mockResolvedValue({
      id: 5, termo: 'fone', chave: 'fone', empresaId: 1, fonte: 'catalogo_ml',
      totalResultados: 10000, criadaEm: new Date(), expiraEm: new Date(Date.now() + 3600000),
      itens: [{ ordem: 1, produtoId: 'MLB111', nome: 'Fone A', marca: null, status: 'active', dominio: 'MLB-HEADPHONES', imagemUrl: null, permalink: null, criadoEm: null, diasNoAr: 100, preco: null, vendasMes: null, vendasDia: null, freteGratis: null, reputacao: null, fotos: 0, variacoes: 0 }],
    });

    const res = await request(app).post('/api/analise-mercado').set(auth()).send({ termo: 'fone' });

    expect(res.status).toBe(200);
    expect(res.body.cached).toBe(true);
    expect(res.body.analise.itens[0].produtoId).toBe('MLB111');
    expect(prisma.analiseMercado.create).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('GET /:id consulta com vendasMes desc nulls last e devolve a análise', async () => {
    prisma.analiseMercado.findUnique.mockResolvedValue({
      id: 9, termo: 'fone', chave: 'fone', empresaId: 1, fonte: 'catalogo_ml',
      totalResultados: 10000, criadaEm: new Date(), expiraEm: new Date(Date.now() + 3600000),
      itens: [{ ordem: 2, produtoId: 'MLB222', nome: 'Fone B', marca: null, status: 'inactive', dominio: null, imagemUrl: null, permalink: null, criadoEm: null, diasNoAr: 50, preco: null, vendasMes: null, vendasDia: null, freteGratis: null, reputacao: null, fotos: 0, variacoes: 1 }],
    });

    const res = await request(app).get('/api/analise-mercado/9').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.analise.itens[0].produtoId).toBe('MLB222');
    const include = prisma.analiseMercado.findUnique.mock.calls[0][0].include;
    expect(include.itens.orderBy).toEqual([
      { vendasMes: { sort: 'desc', nulls: 'last' } },
      { ordem: 'asc' },
    ]);
  });

  it('GET /:id de outra empresa retorna 404', async () => {
    prisma.analiseMercado.findUnique.mockResolvedValue({
      id: 9, termo: 'fone', chave: 'fone', empresaId: 99, fonte: 'catalogo_ml',
      totalResultados: 0, criadaEm: new Date(), expiraEm: new Date(Date.now() + 3600000), itens: [],
    });
    const res = await request(app).get('/api/analise-mercado/9').set(auth());
    expect(res.status).toBe(404);
  });

  it('GET /:id com ID não numérico retorna 400', async () => {
    const res = await request(app).get('/api/analise-mercado/abc').set(auth());
    expect(res.status).toBe(400);
  });

  it('posicionamento devolve a posição nos 50 primeiros do catálogo', async () => {
    const res = await request(app)
      .get('/api/analise-mercado/posicionamento?termo=fone&produtoId=MLB222')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.encontrado).toBe(true);
    expect(res.body.posicao).toBe(2);
    expect(res.body.posicoesVerificadas).toBe(2);
    expect(res.body.fonte).toBe('catalogo_ml');
    expect(String(global.fetch.mock.calls[0][0])).toContain('limit=50');
  });

  it('posicionamento: produto fora dos 50 primeiros retorna encontrado=false', async () => {
    const res = await request(app)
      .get('/api/analise-mercado/posicionamento?termo=fone&produtoId=MLB999')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.encontrado).toBe(false);
    expect(res.body.posicao).toBeNull();
  });

  it('posicionamento com ID inválido retorna 400 sem consultar a API', async () => {
    const res = await request(app)
      .get('/api/analise-mercado/posicionamento?termo=fone&produtoId=qualquer')
      .set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PRODUCT_ID');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('403 da API do ML vira 502 com código honesto', async () => {
    global.fetch = vi.fn(async () => resposta(false, 403, { message: 'forbidden', error: 'forbidden', status: 403, cause: [] }));
    const res = await request(app).post('/api/analise-mercado').set(auth()).send({ termo: 'fone' });
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('ML_SEARCH_FORBIDDEN');
    expect(prisma.analiseMercado.create).not.toHaveBeenCalled();
  });

  it('sem ML conectado retorna 401', async () => {
    mlOAuth.getValidAccessToken.mockResolvedValue(null);
    const res = await request(app).post('/api/analise-mercado').set(auth()).send({ termo: 'fone' });
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('urlPublica: permalink oficial vence; sem permalink usa a busca oficial do ML', () => {
    expect(urlPublicaMercadoLivre('https://www.mercadolivre.com.br/item/MLB1', 'Fone A'))
      .toBe('https://www.mercadolivre.com.br/item/MLB1');
    // Catálogo devolve permalink vazio: fallback = lista.mercadolivre.com.br/<slug>.
    expect(urlPublicaMercadoLivre('', 'Fone de Ouvido Bluetooth 5.3'))
      .toBe('https://lista.mercadolivre.com.br/fone-de-ouvido-bluetooth-5-3');
    expect(urlPublicaMercadoLivre(null, 'Fone — edição especial!'))
      .toBe('https://lista.mercadolivre.com.br/fone-edicao-especial');
    expect(urlPublicaMercadoLivre(null, null)).toBeNull();
    // Nunca https de fora do Mercado Livre.
    expect(urlPublicaMercadoLivre('javascript:alert(1)', 'Fone')).toContain('lista.mercadolivre.com.br');
  });
});
