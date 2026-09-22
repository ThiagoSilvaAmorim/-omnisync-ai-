import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import shopeeAuthRoutes from '../src/routes/shopeeAuth.js';
import tiktokShopAuthRoutes from '../src/routes/tiktokShopAuth.js';

function buildApp() {
  const app = express();
  app.use('/api/auth/shopee', shopeeAuthRoutes);
  app.use('/api/auth/tiktok-shop', tiktokShopAuthRoutes);
  return app;
}

const app = buildApp();

describe.each([
  ['shopee', '/api/auth/shopee'],
  ['tiktok-shop', '/api/auth/tiktok-shop'],
])('%s (somente preparação)', (provider, base) => {
  it('status é preparation pending e nunca conectado', async () => {
    const res = await request(app).get(`${base}/status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('configuration_pending');
    expect(res.body.provider).toBe(provider);
    expect(res.body.conta).toBeNull();
  });

  it.each(['start', 'callback', 'orders', 'products', 'inventory'])(
    'GET %s responde 501 sem dados',
    async (rota) => {
      const res = await request(app).get(`${base}/${rota}`);
      expect(res.status).toBe(501);
      expect(res.body.status).toBe('configuration_pending');
    }
  );

  it('POST disconnect responde 501 sem desconectar nada real', async () => {
    const res = await request(app).post(`${base}/disconnect`);
    expect(res.status).toBe(501);
    expect(res.body.status).toBe('configuration_pending');
  });

  it('respostas não contêm segredos', async () => {
    const res = await request(app).get(`${base}/status`);
    expect(JSON.stringify(res.body)).not.toMatch(/token|secret|password|cookie|jwt/i);
  });
});
