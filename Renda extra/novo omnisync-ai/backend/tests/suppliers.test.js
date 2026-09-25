import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    fornecedor: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    supplier: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      groupBy: vi.fn(),
    },
    catalogProduct: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock('../src/services/osm.js', () => ({
  importarFornecedoresOsm: vi.fn(),
  limparCacheOsm: vi.fn(),
  importacaoRecente: vi.fn(() => null),
}));

import { prisma } from '../src/prisma/client.js';
import { importarFornecedoresOsm } from '../src/services/osm.js';

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

describe('GET /api/suppliers (catálogo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/suppliers?q=dist');
    expect(res.status).toBe(401);
  });

  it('busca por nome filtra no banco sem chamada externa', async () => {
    prisma.supplier.findMany.mockResolvedValue([
      { id: 'u1', slug: 'distribuidora-real', name: 'Distribuidora Real', city: 'Campinas', uf: 'SP', acceptsDropshipping: true },
    ]);
    prisma.supplier.count.mockResolvedValue(1);
    const res = await request(app).get('/api/suppliers?q=distribuidora&uf=SP&niche=wholesale&page=1&limit=24').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(24);
    expect(res.body.items[0]).toMatchObject({ name: 'Distribuidora Real', uf: 'SP', city: 'Campinas' });
    expect(prisma.supplier.findMany).toHaveBeenCalledTimes(1);
    const opts = prisma.supplier.findMany.mock.calls[0][0];
    expect(opts.where.acceptsDropshipping).toBe(true);
    expect(opts.where.uf).toBe('SP');
    expect(opts.where.niche).toMatchObject({ equals: 'wholesale', mode: 'insensitive' });
    // Só fornecedores de revenda: produtos, marketplaces ou atacado (AND não
    // colide com o OR da busca textual).
    expect(opts.where.AND).toEqual([{
      OR: [
        { products: { some: {} } },
        { marketplaces: { isEmpty: false } },
        { niche: 'wholesale' },
      ],
    }]);
    expect(opts.skip).toBe(0);
    expect(opts.take).toBe(24);
  });

  it('paginação calcula skip/take a partir da página', async () => {
    prisma.supplier.findMany.mockResolvedValue([]);
    prisma.supplier.count.mockResolvedValue(60);
    const res = await request(app).get('/api/suppliers?page=3&limit=24').set(auth());
    expect(res.status).toBe(200);
    const opts = prisma.supplier.findMany.mock.calls[0][0];
    expect(opts.skip).toBe(48);
    expect(opts.take).toBe(24);
  });

  it('limit acima do máximo retorna 400', async () => {
    const res = await request(app).get('/api/suppliers?limit=500').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_QUERY');
    expect(prisma.supplier.findMany).not.toHaveBeenCalled();
  });

  it('UF inválida retorna 400', async () => {
    const res = await request(app).get('/api/suppliers?uf=XX').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_QUERY');
  });

  it('niches distintos do catálogo', async () => {
    prisma.supplier.findMany.mockResolvedValue([{ niche: 'company' }, { niche: 'trade' }, { niche: 'wholesale' }]);
    const res = await request(app).get('/api/suppliers/niches').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.niches).toEqual(['company', 'trade', 'wholesale']);
    expect(prisma.supplier.findMany.mock.calls[0][0].distinct).toEqual(['niche']);
  });

  it('cidades distintas por UF com contagem', async () => {
    prisma.supplier.groupBy.mockResolvedValue([
      { city: 'Campinas', _count: { _all: 76 } },
      { city: 'Valinhos', _count: { _all: 1 } },
    ]);
    const res = await request(app).get('/api/suppliers/cidades?uf=SP').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.cidades).toEqual([
      { city: 'Campinas', total: 76 },
      { city: 'Valinhos', total: 1 },
    ]);
    const agrup = prisma.supplier.groupBy.mock.calls[0][0];
    expect(agrup.where.uf).toBe('SP');
    expect(agrup.where.OR).toEqual([
      { products: { some: {} } },
      { marketplaces: { isEmpty: false } },
      { niche: 'wholesale' },
    ]);
  });

  it('cidades sem UF retorna todas com contagem', async () => {
    prisma.supplier.groupBy.mockResolvedValue([
      { city: 'São Paulo', _count: { _all: 274 } },
      { city: 'Campinas', _count: { _all: 76 } },
    ]);
    const res = await request(app).get('/api/suppliers/cidades').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.cidades[0]).toEqual({ city: 'São Paulo', total: 274 });
    const agrup = prisma.supplier.groupBy.mock.calls[0][0];
    expect(agrup.where).toHaveProperty('OR');
    expect(agrup.where).not.toHaveProperty('uf');
  });

  it('cidades com UF inválida retorna 400', async () => {
    const res = await request(app).get('/api/suppliers/cidades?uf=XX').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_UF');
  });

  it('filtra por cidade (equals insensível a maiúsculas)', async () => {
    prisma.supplier.findMany.mockResolvedValue([
      { id: 'u1', slug: 'sp-1', name: 'Fornecedor SP', city: 'São Paulo', uf: 'SP', acceptsDropshipping: true },
    ]);
    prisma.supplier.count.mockResolvedValue(1);
    const res = await request(app).get('/api/suppliers?cidade=São Paulo').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    const opts = prisma.supplier.findMany.mock.calls[0][0];
    expect(opts.where.city).toEqual({ equals: 'São Paulo', mode: 'insensitive' });
  });

  it('order=score devolve o ranking ordenado pelo score calculado', async () => {
    prisma.supplier.findMany.mockResolvedValue([
      { id: 'u1', slug: 'completo', name: 'Completo', city: 'Campinas', uf: 'SP', acceptsDropshipping: true, productCount: 5, logoUrl: 'x.png', telefone: '1199', endereco: 'Rua A', marketplaces: ['mercadolivre'], siteUrl: null },
      { id: 'u2', slug: 'basico', name: 'Basico', city: 'Campinas', uf: 'SP', acceptsDropshipping: true, productCount: 0, logoUrl: null, telefone: null, endereco: null, marketplaces: [], siteUrl: null },
    ]);
    const res = await request(app).get('/api/suppliers?order=score&cidade=Campinas').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items[0].slug).toBe('completo');
    expect(res.body.items[0].score).toBeGreaterThan(res.body.items[1].score);
    expect(res.body.items[0].scoreCriterios.length).toBe(7);
    const opts = prisma.supplier.findMany.mock.calls[0][0];
    expect(opts.where.city).toEqual({ equals: 'Campinas', mode: 'insensitive' });
    expect(opts.take).toBe(500);
  });
});

describe('GET /api/suppliers/:slug (detalhe)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna fornecedor com catálogo de produtos', async () => {
    prisma.supplier.findUnique.mockResolvedValue({
      id: 'u1',
      slug: 'atacado-central',
      name: 'Atacado Central',
      coverImages: [],
      marketplaces: ['mercadolivre'],
      acceptsDropshipping: true,
      products: [{ id: 'p1', name: 'Caneca', sku: 'C1', imageUrl: null, costPrice: 10, niche: 'trade', supplierId: 'u1' }],
    });
    const res = await request(app).get('/api/suppliers/atacado-central').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fornecedor).toMatchObject({ slug: 'atacado-central', name: 'Atacado Central' });
    expect(res.body.produtos).toHaveLength(1);
    expect(res.body.produtos[0]).toMatchObject({ name: 'Caneca', sku: 'C1' });
  });

  it('slug inexistente retorna 404', async () => {
    prisma.supplier.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/suppliers/nao-existe').set(auth());
    expect(res.status).toBe(404);
  });

  it('fornecedor que não aceita dropshipping retorna 404 (fora do catálogo)', async () => {
    prisma.supplier.findUnique.mockResolvedValue({ id: 'u2', slug: 'x', acceptsDropshipping: false, products: [] });
    const res = await request(app).get('/api/suppliers/x').set(auth());
    expect(res.status).toBe(404);
  });

  it('slug vazio retorna 400 sem tocar no banco', async () => {
    const res = await request(app).get('/api/suppliers/%20').set(auth());
    expect(res.status).toBe(400);
    expect(prisma.supplier.findUnique).not.toHaveBeenCalled();
  });
});

describe('GET /api/products (catálogo de produtos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.catalogProduct.groupBy.mockResolvedValue([]);
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/products?q=fone');
    expect(res.status).toBe(401);
  });

  it('busca com join do fornecedor para filtro de UF', async () => {
    prisma.catalogProduct.findMany.mockResolvedValue([
      { id: 'p1', name: 'Fone Bluetooth TWS', sku: 'DEMO-FONE-001', imageUrl: null, costPrice: 45.9, niche: 'trade', supplier: { slug: '3g-foods', name: '3G Foods', uf: 'SP', city: 'Campinas' } },
    ]);
    prisma.catalogProduct.count.mockResolvedValue(1);
    const res = await request(app).get('/api/products?q=fone&uf=SP&page=1&limit=24').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({ name: 'Fone Bluetooth TWS', supplier: { slug: '3g-foods' } });
    const opts = prisma.catalogProduct.findMany.mock.calls[0][0];
    expect(opts.where.supplier.acceptsDropshipping).toBe(true);
    expect(opts.where.supplier.uf).toBe('SP');
    expect(opts.where.OR[0]).toMatchObject({ name: { contains: 'fone', mode: 'insensitive' } });
    expect(opts.take).toBe(24);
  });

  it('UF inválida retorna 400', async () => {
    const res = await request(app).get('/api/products?uf=XX').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_QUERY');
    expect(prisma.catalogProduct.findMany).not.toHaveBeenCalled();
  });

  it('vazio retorna items [] e total 0 (sem mock de dados)', async () => {
    prisma.catalogProduct.findMany.mockResolvedValue([]);
    prisma.catalogProduct.count.mockResolvedValue(0);
    const res = await request(app).get('/api/products?q=inexistente').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('fonte=ml lista anúncios do ML sem filtro de fornecedor (supplier nulo)', async () => {
    prisma.catalogProduct.findMany.mockResolvedValue([
      {
        id: 'p9', name: 'Smartwatch X', imageUrl: 'https://http2.mlstatic.com/x.jpg', niche: null, category: 'Eletrônicos',
        mlItemId: 'MLB1234', mlSellerId: '238610309', preco: 199.9, moeda: 'BRL', statusMl: 'active', vendidos: 3,
        permalink: 'https://www.mercadolivre.com.br/anuncio/MLB1234', sincronizadoEm: new Date('2026-09-25T10:00:00Z'),
        supplier: null,
      },
    ]);
    prisma.catalogProduct.count.mockResolvedValue(1);
    const res = await request(app).get('/api/products?fonte=ml').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.fonte).toBe('ml');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      name: 'Smartwatch X',
      mlItemId: 'MLB1234',
      preco: 199.9,
      moeda: 'BRL',
      statusMl: 'active',
      vendidos: 3,
      permalink: 'https://www.mercadolivre.com.br/anuncio/MLB1234',
    });
    const opts = prisma.catalogProduct.findMany.mock.calls[0][0];
    expect(opts.where.mlItemId).toEqual({ not: null });
    expect(opts.where.supplier).toBeUndefined();
    expect(prisma.catalogProduct.groupBy).not.toHaveBeenCalled();
  });

  it('fonte inválida retorna 400 sem tocar no banco', async () => {
    const res = await request(app).get('/api/products?fonte=outra').set(auth());
    expect(res.status).toBe(400);
    expect(prisma.catalogProduct.findMany).not.toHaveBeenCalled();
  });

  it('filtra por categoria real do produto', async () => {
    prisma.catalogProduct.findMany.mockResolvedValue([
      { id: 'p1', name: 'Fone Bluetooth TWS', sku: 'S-FONE', imageUrl: null, costPrice: null, niche: null, category: 'Eletrônicos', supplier: { slug: '3g-foods', name: '3G Foods', uf: 'SP', city: 'Campinas' } },
    ]);
    prisma.catalogProduct.count.mockResolvedValue(1);
    prisma.catalogProduct.groupBy.mockResolvedValue([
      { category: 'Eletrônicos', _count: { _all: 7 } },
      { category: 'Vestuário', _count: { _all: 2 } },
      { category: null, _count: { _all: 0 } },
    ]);
    const res = await request(app).get('/api/products?category=Eletrônicos').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.items[0].category).toBe('Eletrônicos');
    expect(res.body.categorias).toEqual([
      { category: 'Eletrônicos', total: 7 },
      { category: 'Vestuário', total: 2 },
    ]);
    const opts = prisma.catalogProduct.findMany.mock.calls[0][0];
    expect(opts.where.category).toEqual({ equals: 'Eletrônicos', mode: 'insensitive' });
  });
});

describe('POST /api/suppliers/import-osm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).post('/api/suppliers/import-osm').send({ uf: 'SP', cidade: 'Campinas' });
    expect(res.status).toBe(401);
  });

  it('sem cidade retorna 400', async () => {
    const res = await request(app).post('/api/suppliers/import-osm').set(auth()).send({ uf: 'SP' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_CIDADE');
  });

  it('UF inválida retorna 400', async () => {
    const res = await request(app).post('/api/suppliers/import-osm').set(auth()).send({ uf: 'S', cidade: 'Campinas' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_UF');
  });

  it('importa OSM e faz upsert por osmId contando novos', async () => {
    importarFornecedoresOsm.mockResolvedValue({
      cacheado: false,
      fornecedores: [
        {
          osmId: 'node/111',
          nome: 'Atacado Central',
          categoria: 'wholesale',
          endereco: 'Rua A, 100',
          cidade: 'Campinas',
          uf: 'SP',
          telefone: null,
          site: null,
          lat: -22.9,
          lng: -47.06,
          fonte: 'osm',
        },
        {
          osmId: 'node/222',
          nome: 'Trade Sul',
          categoria: 'trade',
          endereco: null,
          cidade: 'Campinas',
          uf: 'SP',
          telefone: null,
          site: null,
          lat: null,
          lng: null,
          fonte: 'osm',
        },
      ],
    });
    prisma.supplier.findUnique.mockImplementation(async ({ where }) => {
      if (where.osmId === 'node/222') return { id: 9, osmId: 'node/222' };
      if (where.osmId) return null;
      return null; // lookup de slug: nenhum slug existe ainda
    });
    prisma.supplier.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    prisma.supplier.update.mockResolvedValue({ id: 9 });
    prisma.supplier.findMany.mockResolvedValue([
      { id: 1, slug: 'atacado-central', name: 'Atacado Central', city: 'Campinas', uf: 'SP', fonte: 'osm' },
      { id: 9, slug: 'trade-sul', name: 'Trade Sul', city: 'Campinas', uf: 'SP', fonte: 'osm' },
    ]);
    prisma.supplier.count.mockResolvedValue(2);

    const res = await request(app)
      .post('/api/suppliers/import-osm')
      .set(auth())
      .send({ uf: 'SP', cidade: 'Campinas' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, fonte: 'OpenStreetMap', novos: 1, atualizados: 1, encontrados: 2 });
    expect(importarFornecedoresOsm).toHaveBeenCalledWith({ uf: 'SP', cidade: 'Campinas', categoria: null });
    expect(prisma.supplier.create).toHaveBeenCalledTimes(1);
    expect(prisma.supplier.create.mock.calls[0][0].data.slug).toBeTruthy();
    expect(prisma.supplier.update).toHaveBeenCalledTimes(1);
    expect(res.body.mensagem).toContain('1 novo');
  });

  it('cidade inexistente no mapa vira 422 com mensagem clara', async () => {
    const err = new Error('Cidade não encontrada no mapa: Foo/SP.');
    err.code = 'CITY_NOT_FOUND';
    importarFornecedoresOsm.mockRejectedValue(err);
    const res = await request(app)
      .post('/api/suppliers/import-osm')
      .set(auth())
      .send({ uf: 'SP', cidade: 'Foo' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('CITY_NOT_FOUND');
    expect(res.body.message).toMatch(/Cidade não encontrada/);
  });

  it('timeout OSM vira 504', async () => {
    const err = new Error('Tempo esgotado ao localizar a cidade no mapa.');
    err.code = 'OSM_TIMEOUT';
    importarFornecedoresOsm.mockRejectedValue(err);
    const res = await request(app)
      .post('/api/suppliers/import-osm')
      .set(auth())
      .send({ uf: 'SP', cidade: 'Campinas' });
    expect(res.status).toBe(504);
    expect(res.body.code).toBe('OSM_TIMEOUT');
  });

  it('rate limit OSM vira 429', async () => {
    const err = new Error('Limite temporário do OpenStreetMap atingido. Aguarde um minuto.');
    err.code = 'OSM_RATE_LIMIT';
    importarFornecedoresOsm.mockRejectedValue(err);
    const res = await request(app)
      .post('/api/suppliers/import-osm')
      .set(auth())
      .send({ uf: 'SP', cidade: 'Campinas' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('OSM_RATE_LIMIT');
  });
});

describe('GET /api/fornecedores/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna o fornecedor da própria empresa', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue({ id: 5, empresaId: 1, nome: 'Real', verificado: false });
    const res = await request(app).get('/api/fornecedores/5').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 5, nome: 'Real' });
    expect(res.body.mapsUrl).toBeUndefined();
  });

  it('fornecedor de outra empresa retorna 404', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);
    const res = await request(app).get('/api/fornecedores/5').set(auth());
    expect(res.status).toBe(404);
  });

  it('id inválido retorna 400 sem tocar no banco', async () => {
    const res = await request(app).get('/api/fornecedores/abc').set(auth());
    expect(res.status).toBe(400);
    expect(prisma.fornecedor.findFirst).not.toHaveBeenCalled();
  });
});

describe('POST /api/fornecedores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem nome retorna 400', async () => {
    const res = await request(app).post('/api/fornecedores').set(auth()).send({ nome: ' ' });
    expect(res.status).toBe(400);
  });

  it('nunca aceita verificado=true do frontend', async () => {
    prisma.fornecedor.findUnique.mockResolvedValue(null);
    prisma.fornecedor.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    const res = await request(app)
      .post('/api/fornecedores')
      .set(auth())
      .send({ nome: 'X', verificado: true });
    expect(res.status).toBe(201);
    expect(res.body.fornecedor.verificado).toBe(false);
    expect(prisma.fornecedor.create.mock.calls[0][0].data.verificado).toBe(false);
  });

  it('fonte padrão é Manual (sem Google Places)', async () => {
    prisma.fornecedor.findUnique.mockResolvedValue(null);
    prisma.fornecedor.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    const res = await request(app).post('/api/fornecedores').set(auth()).send({ nome: 'Y' });
    expect(res.status).toBe(201);
    expect(prisma.fornecedor.create.mock.calls[0][0].data.fonte).toBe('Manual');
  });

  it('externalId repetido retorna o existente sem duplicar', async () => {
    prisma.fornecedor.findUnique.mockResolvedValue({ id: 7, empresaId: 1, nome: 'X', verificado: false });
    const res = await request(app)
      .post('/api/fornecedores')
      .set(auth())
      .send({ externalId: 'node/1', nome: 'X' });
    expect(res.status).toBe(200);
    expect(res.body.jaExistia).toBe(true);
    expect(prisma.fornecedor.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/fornecedores/:id/verificar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const comercial = {
    vendeAtacado: true,
    aceitaRevenda: true,
    possuiNotaFiscal: true,
    prazoInformado: '3 a 5 dias',
  };

  it('sem dados comerciais retorna 400', async () => {
    const res = await request(app).patch('/api/fornecedores/1/verificar').set(auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_VERIFICATION');
  });

  it('marca verificado com dados comerciais', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue({ id: 1, empresaId: 1, verificado: false, historicoVerificacoes: [] });
    prisma.fornecedor.update.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    const res = await request(app).patch('/api/fornecedores/1/verificar').set(auth()).send(comercial);
    expect(res.status).toBe(200);
    expect(res.body.fornecedor.verificado).toBe(true);
    expect(res.body.fornecedor.historicoVerificacoes).toHaveLength(1);
  });

  it('fornecedor de outra empresa retorna 404', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);
    const res = await request(app).patch('/api/fornecedores/999/verificar').set(auth()).send(comercial);
    expect(res.status).toBe(404);
    expect(prisma.fornecedor.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/fornecedores/:id/favorito', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('alterna favorito da própria empresa', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue({ id: 1, empresaId: 1, favorito: false });
    prisma.fornecedor.update.mockImplementation(async ({ data }) => ({ id: 1, favorito: data.favorito }));
    const res = await request(app).patch('/api/fornecedores/1/favorito').set(auth()).send({ favorito: true });
    expect(res.status).toBe(200);
    expect(res.body.fornecedor.favorito).toBe(true);
  });

  it('valor não booleano retorna 400', async () => {
    const res = await request(app).patch('/api/fornecedores/1/favorito').set(auth()).send({ favorito: 'sim' });
    expect(res.status).toBe(400);
  });

  it('fornecedor de outra empresa retorna 404', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);
    const res = await request(app).patch('/api/fornecedores/999/favorito').set(auth()).send({ favorito: true });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/fornecedores/:id/arquivar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('arquiva e restaura da própria empresa', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue({ id: 1, empresaId: 1, arquivado: false });
    prisma.fornecedor.update.mockImplementation(async ({ data }) => ({ id: 1, arquivado: data.arquivado }));
    const arquivou = await request(app).patch('/api/fornecedores/1/arquivar').set(auth()).send({ arquivado: true });
    expect(arquivou.status).toBe(200);
    expect(arquivou.body.fornecedor.arquivado).toBe(true);
    const restaurou = await request(app).patch('/api/fornecedores/1/arquivar').set(auth()).send({ arquivado: false });
    expect(restaurou.status).toBe(200);
    expect(restaurou.body.fornecedor.arquivado).toBe(false);
  });

  it('fornecedor de outra empresa retorna 404', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);
    const res = await request(app).patch('/api/fornecedores/999/arquivar').set(auth()).send({ arquivado: true });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/fornecedores/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fornecedor de outra empresa retorna 404', async () => {
    prisma.fornecedor.deleteMany.mockResolvedValue({ count: 0 });
    const res = await request(app).delete('/api/fornecedores/999').set(auth());
    expect(res.status).toBe(404);
  });

  it('exclui da própria empresa', async () => {
    prisma.fornecedor.deleteMany.mockResolvedValue({ count: 1 });
    const res = await request(app).delete('/api/fornecedores/1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('Google Places removido', () => {
  it('GET /api/fornecedores/buscar não existe mais (cai em :id inválido)', async () => {
    const res = await request(app).get('/api/fornecedores/buscar?query=distribuidor&cidade=sp').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ID');
  });
});
