import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    negocio: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma/client.js';

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

const NEG = { id: 1, titulo: 'Reposição', cliente: 'Loja A', valor: 1000, estagio: 'lead', data: '2026-09-01' };

describe('pipeline de negócios real', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/negocios');
    expect(res.status).toBe(401);
  });

  it('lista negócios do banco', async () => {
    prisma.negocio.findMany.mockResolvedValue([NEG]);
    const res = await request(app).get('/api/negocios').set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ titulo: 'Reposição' });
  });

  it('cria negócio sempre em lead', async () => {
    prisma.negocio.create.mockImplementation(async ({ data }) => ({ id: 2, ...data }));
    const res = await request(app)
      .post('/api/negocios')
      .set(auth())
      .send({ titulo: 'Novo', cliente: 'B', valor: 500, estagio: 'fechado' });
    expect(res.status).toBe(201);
    expect(res.body.negocio.estagio).toBe('lead');
  });

  it('criar sem título ou valor inválido retorna 400', async () => {
    const r1 = await request(app).post('/api/negocios').set(auth()).send({ titulo: ' ', valor: 10 });
    expect(r1.status).toBe(400);
    const r2 = await request(app).post('/api/negocios').set(auth()).send({ titulo: 'X', valor: 0 });
    expect(r2.status).toBe(400);
    expect(prisma.negocio.create).not.toHaveBeenCalled();
  });

  it('move estágio válido e rejeita inválido', async () => {
    prisma.negocio.findUnique.mockResolvedValue(NEG);
    prisma.negocio.update.mockImplementation(async ({ data }) => ({ ...NEG, ...data }));
    const ok = await request(app).patch('/api/negocios/1/estagio').set(auth()).send({ estagio: 'proposta' });
    expect(ok.status).toBe(200);
    expect(ok.body.negocio.estagio).toBe('proposta');
    const ruim = await request(app).patch('/api/negocios/1/estagio').set(auth()).send({ estagio: 'orbita' });
    expect(ruim.status).toBe(400);
  });

  it('negócio inexistente retorna 404', async () => {
    prisma.negocio.findUnique.mockResolvedValue(null);
    const res = await request(app).patch('/api/negocios/999/estagio').set(auth()).send({ estagio: 'lead' });
    expect(res.status).toBe(404);
    expect(prisma.negocio.update).not.toHaveBeenCalled();
  });
});
