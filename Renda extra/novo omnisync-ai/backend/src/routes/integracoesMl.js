// backend/src/routes/integracoesMl.js
// Tela /integrations — Mercado Livre (OAuth + sync inicial) e status.
// GET /api/integracoes/ml/authorize → 302 p/ a autorização do ML (state+PKCE)
// GET /api/integracoes/ml/callback  → troca o code, salva o vínculo,
//                                     dispara o sync inicial e volta p/ /integrations
// GET /api/integracoes/ml/status    → status da conta + progresso do sync
//
// O authorize é navegação do navegador (não envia Authorization): o state
// assinado carrega a empresa (padrão 1, conta única).

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { mlOAuth } from '../services/mlOAuth.js';
import { agendarSyncInicial, lerStatusSync } from '../services/mlSync.js';

const router = Router();

function frontend() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function voltarComErro(res, mensagem) {
  return res.redirect(`${frontend()}/integrations?error=${encodeURIComponent(mensagem)}`);
}

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

// GET /api/integracoes/ml/authorize — o próprio navegador segue o 302.
// O destino pós-callback (/integrations) vai dentro do state; o redirect_uri
// continua o registrado no app do ML (pode ser /auth/ml/callback — daí o
// /auth/ml/callback também honra o `retorno`).
router.get('/authorize', (req, res) => {
  try {
    const empresaId = Number(req.query?.empresaId) || 1;
    const { url } = mlOAuth.buildAuthUrl({ empresaId, userId: empresaId, retorno: '/integrations' });
    return res.redirect(url);
  } catch (error) {
    console.error('[IntegracoesMl] Erro ao montar URL de autorização:', error);
    return voltarComErro(res, 'Erro ao iniciar conexão com Mercado Livre');
  }
});

// GET /api/integracoes/ml/callback — igual ao /auth/ml/callback, porém volta
// para /integrations e agenda o sync inicial dos anúncios.
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) return voltarComErro(res, String(error_description || error));
    if (!code || !state) return voltarComErro(res, 'Parâmetros code e state são obrigatórios');

    const parsedState = mlOAuth.parseState(state);
    if (!parsedState) return voltarComErro(res, 'State inválido');

    const { empresaId, userId, codeVerifier, retorno } = parsedState;
    const destino = typeof retorno === 'string' && retorno.startsWith('/') && !retorno.startsWith('//')
      ? retorno
      : '/integrations';
    const tokens = await mlOAuth.exchangeCodeForTokens({
      code,
      redirectUri: process.env.ML_REDIRECT_URI,
      codeVerifier,
    });
    const mlUser = await mlOAuth.fetchMlUser(tokens.access_token);
    await mlOAuth.saveIntegration({ empresaId, userId, tokens, mlUser });

    agendarSyncInicial(empresaId);
    return res.redirect(`${frontend()}${destino}?connected=mercadolivre`);
  } catch (error) {
    console.error('[IntegracoesMl] Erro no callback:', error);
    return voltarComErro(res, 'Falha ao conectar Mercado Livre');
  }
});

// GET /api/integracoes/ml/status — dados do card ML (sem segredos).
router.get('/status', requireAuth, async (req, res) => {
  try {
    const contas = await prisma.contaIntegracao.findMany({
      where: { provedor: 'mercadolivre', empresaId: req.empresaId },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });
    const conta = contas[0] || null;

    let status = 'nao_configurado';
    let nickname = null;
    if (conta) {
      const integration = conta.ativo ? await mlOAuth.getIntegration(req.empresaId) : null;
      status = integration ? mlOAuth.getIntegrationStatus(integration) : (conta.ativo ? 'nao_configurado' : 'desconectado');
      const sellers = await mlOAuth.listarIntegracoes(req.empresaId);
      nickname = sellers[0]?.nickname ?? null;
    }

    return res.json({
      ok: true,
      empresaId: req.empresaId,
      provedor: 'mercadolivre',
      conectado: status === 'conectado',
      status,
      sellerId: conta?.mlUserId || null,
      nickname,
      criadoEm: conta?.createdAt || null,
      atualizadoEm: conta?.updatedAt || null,
      sincronizacao: lerStatusSync(conta),
    });
  } catch (error) {
    console.error('[IntegracoesMl] Erro no status:', error);
    return res.status(500).json({ error: 'Erro ao buscar status da integração' });
  }
});

export default router;
