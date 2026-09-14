import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('API — Auth', () => {
  it('faz login com credenciais válidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@omnisync.ai', senha: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.nome).toBe('Carlos Menezes');
  });

  it('rejeita credenciais inválidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', senha: 'errada' });
    expect(res.status).toBe(401);
  });
});

describe('API — Endpoints estáticos', () => {
  it('radar de mercado', async () => {
    const res = await request(app).get('/api/radar-mercado');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('emAlta');
    expect(res.body.emAlta.length).toBeGreaterThan(0);
  });

  it('estoque', async () => {
    const res = await request(app).get('/api/estoque');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('kpis');
    expect(res.body).toHaveProperty('previsao');
  });

  it('agentes', async () => {
    const res = await request(app).get('/api/agentes');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(8);
  });

  it('usuários', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('produto destaque', async () => {
    const res = await request(app).get('/api/produtos/destaque');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sku');
  });
});

describe('API — Marketplaces', () => {
  it('lista marketplaces', async () => {
    const res = await request(app).get('/api/marketplaces');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every(m => m.categoria === 'Marketplace')).toBe(true);
  });

  it('sincroniza marketplace', async () => {
    const res = await request(app).post('/api/marketplaces/ml/sync');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.marketplace).toBe('ml');
  });
});
