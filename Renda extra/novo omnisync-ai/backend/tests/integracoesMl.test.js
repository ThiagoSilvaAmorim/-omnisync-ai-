import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';
import { mlOAuth } from '../src/services/mlOAuth.js';
import { agendarSyncInicial, lerStatusSync } from '../src/services/mlSync.js';

vi.mock('../src/services/mlOAuth.js', () => ({
  mlOAuth: {
    buildAuthUrl: vi.fn(),
    parseState: vi.fn(),
    exchangeCodeForTokens: vi.fn(),
    fetchMlUser: vi.fn(),
    saveIntegration: vi.fn(),
    getIntegration: vi.fn(),
    getIntegrationStatus: vi.fn(),
    listarIntegracoes: vi.fn(),
    getValidAccessToken: vi.fn(),
  },
}));

// Só o agendamento é neutralizado; lerStatusSync (função pura) roda de verdade.
vi.mock('../src/services/mlSync.js', async importOriginal => {
  const original = await importOriginal();
  return { ...original, agendarSyncInicial: vi.fn() };
});

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    contaIntegracao: { findMany: vi.fn() },
  },
}));

import { prisma } from '../src/prisma/client.js';

function auth() {
  const token = assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
  return { Authorization: `Bearer ${token}` };
}

const CONTA_ATIVA = {
  id: 7,
  provedor: 'mercadolivre',
  empresaId: 1,
  mlUserId: '238610309',
  ativo: true,
  createdAt: new Date('2026-01-10T12:00:00Z'),
  updatedAt: new Date('2026-02-01T12:00:00Z'),
  metadados: {
    syncStatus: 'rodando',
    syncTotal: 40,
    syncFeitos: 20,
    syncErro: null,
    syncIniciadoEm: '2026-02-01T12:00:00Z',
  },
};

describe('/api/integracoes/ml (tela /integrations)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mlOAuth.buildAuthUrl.mockReturnValue({
      url: 'https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=123',
      state: 'state-1',
    });
    mlOAuth.parseState.mockReturnValue({ empresaId: 1, userId: 1, codeVerifier: 'verifier' });
    mlOAuth.exchangeCodeForTokens.mockResolvedValue({
      access_token: 'at', refresh_token: 'rt', expires_in: 3600, user_id: 238610309,
    });
    mlOAuth.fetchMlUser.mockResolvedValue({ id: 238610309, nickname: 'AMBR2052460' });
    mlOAuth.saveIntegration.mockResolvedValue({});
    prisma.contaIntegracao.findMany.mockResolvedValue([]);
  });

  it('authorize redireciona 302 para a autorização do Mercado Livre', async () => {
    const res = await request(app).get('/api/integracoes/ml/authorize');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://auth.mercadolivre.com.br/authorization');
    expect(res.headers.location).toContain('client_id=');
    expect(mlOAuth.buildAuthUrl).toHaveBeenCalledWith({ empresaId: 1, userId: 1, retorno: '/integrations' });
  });

  it('authorize aceita empresaId na query', async () => {
    await request(app).get('/api/integracoes/ml/authorize?empresaId=2');
    expect(mlOAuth.buildAuthUrl).toHaveBeenCalledWith({ empresaId: 2, userId: 2, retorno: '/integrations' });
  });

  it('callback com erro do ML volta para /integrations com a mensagem', async () => {
    const res = await request(app).get('/api/integracoes/ml/callback?error=access_denied&error_description=Negado');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/integrations?error=');
    expect(decodeURIComponent(res.headers.location)).toContain('Negado');
    expect(mlOAuth.saveIntegration).not.toHaveBeenCalled();
  });

  it('callback sem code/state não troca token e volta com erro', async () => {
    const res = await request(app).get('/api/integracoes/ml/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/integrations?error=');
    expect(mlOAuth.exchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it('callback válido salva o vínculo, agenda o sync inicial e volta conectado', async () => {
    const res = await request(app).get('/api/integracoes/ml/callback?code=abc&state=xyz');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/integrations?connected=mercadolivre`);
    expect(mlOAuth.exchangeCodeForTokens).toHaveBeenCalledWith({
      code: 'abc',
      redirectUri: process.env.ML_REDIRECT_URI,
      codeVerifier: 'verifier',
    });
    expect(mlOAuth.saveIntegration).toHaveBeenCalledTimes(1);
    expect(agendarSyncInicial).toHaveBeenCalledWith(1);
  });

  it('status sem token do sistema retorna 401', async () => {
    const res = await request(app).get('/api/integracoes/ml/status');
    expect(res.status).toBe(401);
  });

  it('status sem conta conectada reporta nao_configurado e sync ocioso', async () => {
    const res = await request(app).get('/api/integracoes/ml/status').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.conectado).toBe(false);
    expect(res.body.status).toBe('nao_configurado');
    expect(res.body.sincronizacao.status).toBe('ocioso');
  });

  it('status com conta ativa expõe seller, data e progresso do sync', async () => {
    prisma.contaIntegracao.findMany.mockResolvedValue([CONTA_ATIVA]);
    mlOAuth.getIntegration.mockReturnValue({ id: 7, ativo: true, mlUserId: '238610309' });
    mlOAuth.getIntegrationStatus.mockReturnValue('conectado');
    mlOAuth.listarIntegracoes.mockReturnValue([{ mlUserId: '238610309', nickname: 'AMBR2052460', ativo: true, status: 'conectado' }]);

    const res = await request(app).get('/api/integracoes/ml/status').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.conectado).toBe(true);
    expect(res.body.status).toBe('conectado');
    expect(res.body.sellerId).toBe('238610309');
    expect(res.body.nickname).toBe('AMBR2052460');
    expect(res.body.criadoEm).toBeTruthy();
    expect(res.body.sincronizacao).toMatchObject({ status: 'rodando', total: 40, feitos: 20 });
    // Nunca vaza segredo/token.
    expect(JSON.stringify(res.body)).not.toContain('segredo');
    expect(JSON.stringify(res.body)).not.toContain('access_token');
  });

  it('lerStatusSync normaliza metadados vazios (0 de 0, sem inventar)', () => {
    expect(lerStatusSync(null)).toMatchObject({ status: 'ocioso', total: 0, feitos: 0, erro: null });
    expect(lerStatusSync({ metadados: {} })).toMatchObject({ status: 'ocioso', total: 0, feitos: 0 });
  });
});
