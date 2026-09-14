import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// ============================================
// Testes de API (supertest). Exigem o banco
// Neon PostgreSQL populado (ver PROGRESS.md,
// FASE 1) e respeitam o contrato paginado
// de GET /api/produtos.
// ============================================

describe('API — Health', () => {
  it('retorna status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('API — Produtos', () => {
  it('lista produtos (contrato paginado)', async () => {
    const res = await request(app).get('/api/produtos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('produtos');
    expect(res.body).toHaveProperty('total');
    expect(res.body.produtos.length).toBeGreaterThan(0);
    expect(res.body.produtos[0]).toHaveProperty('nome');
    expect(res.body.produtos[0]).toHaveProperty('sku');
  });

  it('filtra por categoria', async () => {
    const res = await request(app).get('/api/produtos?categoria=Marcenaria');
    expect(res.status).toBe(200);
    expect(res.body.produtos.length).toBeGreaterThan(0);
    expect(res.body.produtos.every(p => p.categoria === 'Marcenaria')).toBe(true);
  });

  it('retorna 404 para produto inexistente', async () => {
    const res = await request(app).get('/api/produtos/999999');
    expect(res.status).toBe(404);
  });

  it('cria um produto', async () => {
    const novo = {
      nome: 'Produto Teste',
      sku: 'TST-999',
      categoria: 'Testes',
      preco: 10.5,
      estoque: 5,
      status: 'ativo',
    };
    const res = await request(app).post('/api/produtos').send(novo);
    expect(res.status).toBe(201);
    expect(res.body.sku).toBe('TST-999');

    // limpeza
    await request(app).delete(`/api/produtos/${res.body.id}`);
  });
});

describe('API — Pedidos', () => {
  it('lista pedidos', async () => {
    const res = await request(app).get('/api/pedidos');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('filtra por status', async () => {
    const res = await request(app).get('/api/pedidos?status=entregue');
    expect(res.status).toBe(200);
    expect(res.body.every(p => p.status === 'entregue')).toBe(true);
  });
});

describe('API — Clientes', () => {
  it('lista clientes', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('email');
  });
});

describe('API — Estoque (KPIs reais do Neon)', () => {
  it('retorna KPIs de estoque', async () => {
    const res = await request(app).get('/api/estoque/kpis');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('atual');
    expect(res.body).toHaveProperty('critico');
    expect(res.body).toHaveProperty('capitalParado');
  });

  it('retorna previsão de 60 dias', async () => {
    const res = await request(app).get('/api/estoque/previsao');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('total');
  });

  it('retorna faixas de estoque parado', async () => {
    const res = await request(app).get('/api/estoque/parado');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('API — Fiscal e Transações (Neon)', () => {
  it('lista notas fiscais', async () => {
    const res = await request(app).get('/api/fiscal');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('lista compras', async () => {
    const res = await request(app).get('/api/compras');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('monta transações de pedidos e compras', async () => {
    const res = await request(app).get('/api/transacoes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('API — Auth (token assinado)', () => {
  it('emite token com perfil Diretor no login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@omnisync.ai', senha: '123456' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.perfil).toBe('Diretor');
  });

  it('aceita o e-mail do diretor', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 't.bruno000@gmail.com', senha: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.user.perfil).toBe('Diretor');
    expect(res.body.user.nome).toBe('Thiago Amorim');
  });

  it('valida o token em /api/auth/me', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@omnisync.ai', senha: '123456' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.perfil).toBe('Diretor');
  });

  it('rejeita token inválido em /api/auth/me', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalido');
    expect(res.status).toBe(401);
  });
});

describe('API — Cupons (Ofertas)', () => {
  it('lista cupons', async () => {
    const res = await request(app).get('/api/cupons');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('cria, atualiza e exclui um cupom', async () => {
    const criado = await request(app).post('/api/cupons').send({ codigo: 'TESTE15', tipo: 'percentual', valor: 15 });
    expect(criado.status).toBe(201);
    expect(criado.body.codigo).toBe('TESTE15');

    const atualizado = await request(app).put(`/api/cupons/${criado.body.id}`).send({ ativo: false });
    expect(atualizado.status).toBe(200);
    expect(atualizado.body.ativo).toBe(false);

    const removido = await request(app).delete(`/api/cupons/${criado.body.id}`);
    expect(removido.status).toBe(200);
  });

  it('rejeita código duplicado', async () => {
    const res = await request(app).post('/api/cupons').send({ codigo: 'BEMVINDO10', tipo: 'percentual', valor: 10 });
    expect(res.status).toBe(409);
  });
});

describe('API — Dashboard', () => {
  it('retorna resumo com indicadores', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('faturamento');
    expect(res.body).toHaveProperty('pedidos');
    expect(res.body).toHaveProperty('produtos');
    expect(res.body).toHaveProperty('clientes');
  });
});
