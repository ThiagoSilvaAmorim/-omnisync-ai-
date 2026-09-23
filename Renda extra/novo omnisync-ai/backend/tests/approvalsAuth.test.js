import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

describe('aprovações exigem JWT', () => {
  it('GET /api/approvals sem token retorna 401', async () => {
    const res = await request(app).get('/api/approvals');
    expect(res.status).toBe(401);
  });

  it('POST /api/approvals sem token retorna 401', async () => {
    const res = await request(app).post('/api/approvals').send({ agente: 'x', action: 'y' });
    expect(res.status).toBe(401);
  });

  it('POST aprovar sem token retorna 401', async () => {
    const res = await request(app).post('/api/approvals/xxx/aprovar').send({ aprovador: 'T' });
    expect(res.status).toBe(401);
  });

  it('com token, rota responde sem 401', async () => {
    const res = await request(app)
      .get('/api/approvals')
      .set({ Authorization: `Bearer ${tokenValido()}` });
    expect(res.status).not.toBe(401);
  });

  it('com token, histórico responde 200 com lista', async () => {
    const res = await request(app)
      .get('/api/approvals?status=historico')
      .set({ Authorization: `Bearer ${tokenValido()}` });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
