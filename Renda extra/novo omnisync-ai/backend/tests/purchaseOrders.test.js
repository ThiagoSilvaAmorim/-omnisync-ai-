import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    purchaseOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

const OC_BASE = { id: 'OC-1', fornecedor: 'Distribuidora', data: '2026-09-22', total: 500, status: 'aguardando_aprovacao' };

describe('ordens de compra (aprovação manual)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sem token retorna 401', async () => {
    const res = await request(app).post('/api/purchase-orders').send({ fornecedor: 'X', total: 10 });
    expect(res.status).toBe(401);
  });

  it('cria rascunho aguardando_aprovacao, sem enviar nada', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue(null);
    prisma.purchaseOrder.create.mockImplementation(async ({ data }) => ({ ...data }));
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(auth())
      .send({ fornecedor: 'Distribuidora', total: 500 });
    expect(res.status).toBe(201);
    expect(res.body.ordem.status).toBe('aguardando_aprovacao');
  });

  it('idExterno duplicado retorna a existente sem duplicar', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({ ...OC_BASE, idExterno: 'EXT-1' });
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(auth())
      .send({ fornecedor: 'X', total: 10, idExterno: 'EXT-1' });
    expect(res.status).toBe(200);
    expect(res.body.jaExistia).toBe(true);
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('total inválido retorna 400', async () => {
    const res = await request(app)
      .post('/api/purchase-orders')
      .set(auth())
      .send({ fornecedor: 'X', total: 0 });
    expect(res.status).toBe(400);
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
  });

  it('aprova somente de aguardando_aprovacao com aprovador', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue(OC_BASE);
    prisma.purchaseOrder.update.mockImplementation(async ({ data }) => ({ ...OC_BASE, ...data }));
    const res = await request(app)
      .post('/api/purchase-orders/OC-1/aprovar')
      .set(auth())
      .send({ aprovador: 'Thiago' });
    expect(res.status).toBe(200);
    expect(res.body.ordem.status).toBe('compra_aprovada');
    expect(res.body.ordem.aprovador).toBe('Thiago');
  });

  it('aprovar sem aprovador retorna 400', async () => {
    const res = await request(app)
      .post('/api/purchase-orders/OC-1/aprovar')
      .set(auth())
      .send({});
    expect(res.status).toBe(400);
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('aprovar fora do estado inicial retorna 409', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({ ...OC_BASE, status: 'compra_aprovada' });
    const res = await request(app)
      .post('/api/purchase-orders/OC-1/aprovar')
      .set(auth())
      .send({ aprovador: 'T' });
    expect(res.status).toBe(409);
  });

  it('rejeitar exige motivo e cancela', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue(OC_BASE);
    prisma.purchaseOrder.update.mockImplementation(async ({ data }) => ({ ...OC_BASE, ...data }));
    const semMotivo = await request(app)
      .post('/api/purchase-orders/OC-1/rejeitar')
      .set(auth())
      .send({});
    expect(semMotivo.status).toBe(400);
    const res = await request(app)
      .post('/api/purchase-orders/OC-1/rejeitar')
      .set(auth())
      .send({ motivo: 'Preço acima do teto' });
    expect(res.status).toBe(200);
    expect(res.body.ordem.status).toBe('cancelado');
  });

  it('rastreio idempotente: mesmo código não regrava', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({ ...OC_BASE, rastreio: 'BR123' });
    const res = await request(app)
      .patch('/api/purchase-orders/OC-1/rastreio')
      .set(auth())
      .send({ codigo: 'BR123' });
    expect(res.status).toBe(200);
    expect(res.body.jaExistia).toBe(true);
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('rastreio em ordem cancelada retorna 409', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({ ...OC_BASE, status: 'cancelado' });
    const res = await request(app)
      .patch('/api/purchase-orders/OC-1/rastreio')
      .set(auth())
      .send({ codigo: 'BR999' });
    expect(res.status).toBe(409);
  });

  it('receber move enviado_ao_fornecedor para recebido', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({ ...OC_BASE, status: 'enviado_ao_fornecedor' });
    prisma.purchaseOrder.update.mockImplementation(async ({ data }) => ({ ...OC_BASE, ...data }));
    const res = await request(app).post('/api/purchase-orders/OC-1/receber').set(auth()).send({});
    expect(res.status).toBe(200);
    expect(res.body.ordem.status).toBe('recebido');
  });

  it('receber rascunho retorna 409 sem mexer no banco', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue(OC_BASE);
    const res = await request(app).post('/api/purchase-orders/OC-1/receber').set(auth()).send({});
    expect(res.status).toBe(409);
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('enviar move compra_aprovada para enviado_ao_fornecedor', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue({ ...OC_BASE, status: 'compra_aprovada' });
    prisma.purchaseOrder.update.mockImplementation(async ({ data }) => ({ ...OC_BASE, ...data }));
    const res = await request(app).post('/api/purchase-orders/OC-1/enviar').set(auth()).send({});
    expect(res.status).toBe(200);
    expect(res.body.ordem.status).toBe('enviado_ao_fornecedor');
  });

  it('enviar rascunho retorna 409 sem mexer no banco', async () => {
    prisma.purchaseOrder.findUnique.mockResolvedValue(OC_BASE);
    const res = await request(app).post('/api/purchase-orders/OC-1/enviar').set(auth()).send({});
    expect(res.status).toBe(409);
    expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
  });
});
