import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    meta: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma/client.js';

function auth() {
  const token = assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
  return { Authorization: `Bearer ${token}` };
}

describe('metas reais', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/metas');
    expect(res.status).toBe(401);
  });

  it('lista metas reais', async () => {
    prisma.meta.findMany.mockResolvedValue([{ id: 1, nome: 'Faturamento', meta: 100000, atual: 25000, tipo: 'currency', setor: 'Geral' }]);
    const res = await request(app).get('/api/metas').set(auth());
    expect(res.status).toBe(200);
    expect(res.body[0].nome).toBe('Faturamento');
  });

  it('cria meta com valores válidos', async () => {
    prisma.meta.create.mockImplementation(async ({ data }) => ({ id: 7, ...data }));
    const res = await request(app).post('/api/metas').set(auth()).send({ nome: 'Ticket médio', meta: 350 });
    expect(res.status).toBe(201);
    expect(res.body.meta.atual).toBe(0);
    expect(res.body.meta.tipo).toBe('number');
  });

  it('nome vazio ou valor inválido retorna 400', async () => {
    const r1 = await request(app).post('/api/metas').set(auth()).send({ nome: '  ', meta: 10 });
    expect(r1.status).toBe(400);
    const r2 = await request(app).post('/api/metas').set(auth()).send({ nome: 'X', meta: -5 });
    expect(r2.status).toBe(400);
    expect(prisma.meta.create).not.toHaveBeenCalled();
  });

  it('exclui meta existente', async () => {
    prisma.meta.findUnique.mockResolvedValue({ id: 7, nome: 'X', meta: 1, atual: 0, tipo: 'number', setor: 'Geral' });
    prisma.meta.delete.mockResolvedValue({ id: 7 });
    const res = await request(app).delete('/api/metas/7').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
