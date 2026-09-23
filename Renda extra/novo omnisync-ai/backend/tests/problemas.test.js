import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    problema: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../src/prisma/client.js';

function auth() {
  const token = assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
  return { Authorization: `Bearer ${token}` };
}

const BO_BASE = { id: 'BO-1', titulo: 'Falha X', descricao: 'd', categoria: 'Operacional', prioridade: 'media', data: '23/09/2026', status: 'aberto', historico: [] };

describe('central de B.O. (problemas reais)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).get('/api/problemas');
    expect(res.status).toBe(401);
  });

  it('lista B.O.s reais', async () => {
    prisma.problema.findMany.mockResolvedValue([BO_BASE]);
    const res = await request(app).get('/api/problemas').set(auth());
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('BO-1');
  });

  it('abre B.O. com status aberto', async () => {
    prisma.problema.findUnique.mockResolvedValue(null);
    prisma.problema.create.mockImplementation(async ({ data }) => ({ ...data, historico: [] }));
    const res = await request(app).post('/api/problemas').set(auth()).send({ id: 'BO-9', titulo: 'Queda de energia', prioridade: 'alta' });
    expect(res.status).toBe(201);
    expect(res.body.bo.status).toBe('aberto');
  });

  it('título vazio retorna 400 sem criar', async () => {
    const res = await request(app).post('/api/problemas').set(auth()).send({ titulo: '  ' });
    expect(res.status).toBe(400);
    expect(prisma.problema.create).not.toHaveBeenCalled();
  });

  it('avança aberto para em andamento', async () => {
    prisma.problema.findUnique.mockResolvedValue(BO_BASE);
    prisma.problema.update.mockImplementation(async ({ data }) => ({ ...BO_BASE, ...data }));
    const res = await request(app).patch('/api/problemas/BO-1/avancar').set(auth()).send({});
    expect(res.status).toBe(200);
    expect(res.body.bo.status).toBe('em andamento');
  });

  it('resolvido não avança (409)', async () => {
    prisma.problema.findUnique.mockResolvedValue({ ...BO_BASE, status: 'resolvido' });
    const res = await request(app).patch('/api/problemas/BO-1/avancar').set(auth()).send({});
    expect(res.status).toBe(409);
    expect(prisma.problema.update).not.toHaveBeenCalled();
  });

  it('anexa nota ao histórico', async () => {
    prisma.problema.findUnique.mockResolvedValue(BO_BASE);
    prisma.problema.update.mockImplementation(async ({ data }) => ({ ...BO_BASE, ...data }));
    const res = await request(app).post('/api/problemas/BO-1/notas').set(auth()).send({ texto: 'Técnico acionado' });
    expect(res.status).toBe(200);
    expect(res.body.bo.historico.length).toBe(1);
    expect(res.body.bo.historico[0].texto).toBe('Técnico acionado');
  });

  it('exclui B.O. existente', async () => {
    prisma.problema.findUnique.mockResolvedValue(BO_BASE);
    prisma.problema.delete.mockResolvedValue(BO_BASE);
    const res = await request(app).delete('/api/problemas/BO-1').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
