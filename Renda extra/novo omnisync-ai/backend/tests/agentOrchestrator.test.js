import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';
import { executarAgente, listarAgentes } from '../src/services/agentOrchestrator.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    order: { findMany: vi.fn(), findUnique: vi.fn() },
    product: { findMany: vi.fn(), findUnique: vi.fn() },
    fornecedor: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../src/prisma/client.js';

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

function auth() {
  return { Authorization: `Bearer ${tokenValido()}` };
}

function respostaAnalise() {
  return {
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              analysis: 'Ok', recommendations: [], risks: [],
              confidence: 0.7, dataQuality: 'medium',
            }),
          }],
        },
      }],
    }),
  };
}

describe('agentOrchestrator', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'chave-de-teste');
    global.fetch = vi.fn(async () => respostaAnalise());
    prisma.order.findMany.mockResolvedValue([
      { id: 'P1', cliente: 'A', total: 100, status: 'pago' },
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('lista agentes com domínios sem executar nada', () => {
    const agentes = listarAgentes();
    expect(agentes.find(a => a.agente === 'SalesAnalyst').dominio).toBe('sales');
  });

  it('agente desconhecido falha com código explícito', async () => {
    const r = await executarAgente('AgenteInexistente', 'tarefa', {});
    expect(r.status).toBe('failed');
    expect(r.code).toBe('UNKNOWN_AGENT');
  });

  it('agente sem domínio falha sem chamar o Gemini', async () => {
    const r = await executarAgente('SocialPilot', 'postar', {});
    expect(r.status).toBe('failed');
    expect(r.code).toBe('UNSUPPORTED_AGENT');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('SalesAnalyst completa com registro estruturado', async () => {
    const r = await executarAgente('SalesAnalyst', 'resumo', { empresaId: 1 });
    expect(r.status).toBe('completed');
    expect(r.agent).toBe('SalesAnalyst');
    expect(r.source).toBeTruthy();
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.createdAt).toBeTruthy();
  });

  it('inputSummary não contém segredos nem valores', async () => {
    const r = await executarAgente('SalesAnalyst', 'resumo', {
      empresaId: 1,
      payload: { token: 'segredo', pedidos: [1, 2] },
    });
    expect(r.inputSummary).not.toMatch(/segredo|tok/i);
  });

  it('via HTTP sem token retorna 401', async () => {
    const res = await request(app).post('/api/ai/agent/SalesAnalyst').send({});
    expect(res.status).toBe(401);
  });

  it('via HTTP agente desconhecido retorna 400', async () => {
    const res = await request(app).post('/api/ai/agent/Xyz').set(auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UNKNOWN_AGENT');
  });

  it('via HTTP SalesAnalyst retorna registro completed', async () => {
    const res = await request(app).post('/api/ai/agent/SalesAnalyst').set(auth()).send({ task: 'resumo' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.agent).toBe('SalesAnalyst');
  });
});
