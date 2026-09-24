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
      create: vi.fn(),
      update: vi.fn(),
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

describe('GET /api/suppliers (busca local)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/suppliers?q=dist');
    expect(res.status).toBe(401);
  });

  it('busca por nome filtra no banco sem chamada externa', async () => {
    prisma.supplier.findMany.mockResolvedValue([
      { id: 1, osmId: 'node/1', nome: 'Distribuidora Real', cidade: 'Campinas', uf: 'SP', fonte: 'osm' },
    ]);
    const res = await request(app).get('/api/suppliers?q=distribuidora&uf=SP&cidade=Campinas').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, fonte: 'OpenStreetMap', total: 1 });
    expect(res.body.fornecedores[0]).toMatchObject({ nome: 'Distribuidora Real', uf: 'SP', cidade: 'Campinas' });
    expect(prisma.supplier.findMany).toHaveBeenCalledTimes(1);
    const where = prisma.supplier.findMany.mock.calls[0][0].where;
    expect(where.uf).toBe('SP');
    expect(where.cidade).toMatchObject({ equals: 'Campinas', mode: 'insensitive' });
  });

  it('sem filtros retorna a base local (take limitado)', async () => {
    prisma.supplier.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/suppliers').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fornecedores).toEqual([]);
    const opts = prisma.supplier.findMany.mock.calls[0][0];
    expect(opts.take).toBe(200);
  });

  it('cidades distintas por UF', async () => {
    prisma.supplier.groupBy.mockResolvedValue([{ cidade: 'Campinas' }, { cidade: 'Valinhos' }]);
    const res = await request(app).get('/api/suppliers/cidades?uf=SP').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.cidades).toEqual(['Campinas', 'Valinhos']);
  });

  it('cidades sem UF retorna 400', async () => {
    const res = await request(app).get('/api/suppliers/cidades').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_UF');
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
    prisma.supplier.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 9, osmId: 'node/222' });
    prisma.supplier.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    prisma.supplier.update.mockResolvedValue({ id: 9 });
    prisma.supplier.findMany.mockResolvedValue([
      { id: 1, osmId: 'node/111', nome: 'Atacado Central', cidade: 'Campinas', uf: 'SP', fonte: 'osm' },
      { id: 9, osmId: 'node/222', nome: 'Trade Sul', cidade: 'Campinas', uf: 'SP', fonte: 'osm' },
    ]);

    const res = await request(app)
      .post('/api/suppliers/import-osm')
      .set(auth())
      .send({ uf: 'SP', cidade: 'Campinas' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, fonte: 'OpenStreetMap', novos: 1, atualizados: 1, encontrados: 2 });
    expect(importarFornecedoresOsm).toHaveBeenCalledWith({ uf: 'SP', cidade: 'Campinas', categoria: null });
    expect(prisma.supplier.create).toHaveBeenCalledTimes(1);
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
