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
  },
}));

import { prisma } from '../src/prisma/client.js';
import { limparCacheGooglePlaces } from '../src/services/googlePlaces.js';

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

function respostaGoogle(places) {
  return { ok: true, json: async () => ({ places }) };
}

const placeCheio = {
  id: 'g-1',
  displayName: { text: 'Distribuidora Real' },
  formattedAddress: 'Rua A, 100 - São Paulo/SP',
  nationalPhoneNumber: '+55 11 99999-0000',
  websiteUri: 'https://distribuidora.example',
  googleMapsUri: 'https://maps.google.com/?q=x',
  rating: 4.5,
  userRatingCount: 120,
  primaryType: 'distributor',
};

describe('GET /api/fornecedores/buscar', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'chave-de-teste');
    limparCacheGooglePlaces();
    global.fetch = vi.fn(async () => respostaGoogle([placeCheio]));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/fornecedores/buscar?query=abc&cidade=sp');
    expect(res.status).toBe(401);
  });

  it('busca válida retorna empresas públicas não verificadas', async () => {
    const res = await request(app)
      .get('/api/fornecedores/buscar?query=distribuidor&cidade=S%C3%A3o%20Paulo%20SP')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, fonte: 'Google Places', verificado: false });
    expect(res.body.fornecedores).toHaveLength(1);
    expect(res.body.fornecedores[0]).toMatchObject({
      externalId: 'g-1',
      nome: 'Distribuidora Real',
      verificado: false,
      fonte: 'Google Places',
    });
  });

  it('query curta retorna 400', async () => {
    const res = await request(app).get('/api/fornecedores/buscar?query=ab&cidade=sp').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_SEARCH');
  });

  it('cidade ausente retorna 400', async () => {
    const res = await request(app).get('/api/fornecedores/buscar?query=distribuidor').set(auth());
    expect(res.status).toBe(400);
  });

  it('chave ausente retorna 503 estruturado', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
    const res = await request(app)
      .get('/api/fornecedores/buscar?query=distribuidor&cidade=sp')
      .set(auth());
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('GOOGLE_PLACES_NOT_CONFIGURED');
  });

  it.each([401, 403])('Google HTTP %i vira 502 sem vazar chave', async (codigo) => {
    global.fetch = vi.fn(async () => ({ ok: false, status: codigo, json: async () => ({}) }));
    const res = await request(app)
      .get('/api/fornecedores/buscar?query=distribuidor&cidade=sp')
      .set(auth());
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('GOOGLE_PLACES_UNAUTHORIZED');
    expect(JSON.stringify(res.body)).not.toMatch(/chave-de-teste/i);
  });

  it('Google 429 vira 429', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    const res = await request(app)
      .get('/api/fornecedores/buscar?query=distribuidor&cidade=sp')
      .set(auth());
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('GOOGLE_PLACES_RATE_LIMIT');
  });

  it('resposta vazia retorna lista vazia', async () => {
    global.fetch = vi.fn(async () => respostaGoogle([]));
    const res = await request(app)
      .get('/api/fornecedores/buscar?query=xyz&cidade=sp')
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.fornecedores).toEqual([]);
  });

  it('sem telefone/site preserva nulos', async () => {
    global.fetch = vi.fn(async () => respostaGoogle([{ id: 'g-2', displayName: { text: 'Sem Contato' } }]));
    const res = await request(app)
      .get('/api/fornecedores/buscar?query=xyz&cidade=sp')
      .set(auth());
    expect(res.body.fornecedores[0]).toMatchObject({ telefone: null, site: null, verificado: false });
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

  it('externalId repetido retorna o existente sem duplicar', async () => {
    prisma.fornecedor.findUnique.mockResolvedValue({ id: 7, empresaId: 1, nome: 'X', verificado: false });
    const res = await request(app)
      .post('/api/fornecedores')
      .set(auth())
      .send({ externalId: 'g-1', nome: 'X' });
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
    prisma.fornecedor.findFirst.mockResolvedValue({ id: 1, empresaId: 1, verificado: false });
    prisma.fornecedor.update.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    const res = await request(app).patch('/api/fornecedores/1/verificar').set(auth()).send(comercial);
    expect(res.status).toBe(200);
    expect(res.body.fornecedor.verificado).toBe(true);
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
    expect(prisma.fornecedor.update).not.toHaveBeenCalled();
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
