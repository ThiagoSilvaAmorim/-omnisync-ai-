// backend/src/routes/mlAuth.js
// Rotas OAuth Mercado Livre

import { Router } from 'express';
import { mlOAuth } from '../services/mlOAuth.js';
import { agendarSyncInicial } from '../services/mlSync.js';
import { usuarioDoRequest } from '../auth.js';

const router = Router();

// Só caminhos internos (o state já nasce sanitizado; aqui é defesa em profundidade).
function destinoRetorno(retorno, padrao) {
  return typeof retorno === 'string' && retorno.startsWith('/') && !retorno.startsWith('//')
    ? retorno
    : padrao;
}

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

// GET /api/auth/ml/start
// Inicia fluxo OAuth Mercado Livre
router.get('/start', requireAuth, (req, res) => {
  try {
    const { url, state } = mlOAuth.buildAuthUrl({ 
      empresaId: req.empresaId, 
      userId: req.empresaId,
      retorno: '/integracoes',
    });
    res.json({ url, state });
  } catch (error) {
    console.error('[MLAuth] Erro ao gerar URL de autorização:', error);
    res.status(500).json({ error: 'Erro ao iniciar conexão com Mercado Livre' });
  }
});

// GET /api/auth/ml/callback
// Callback OAuth Mercado Livre (é o redirect_uri registrado no app do ML;
// por isso /integrations também volta por aqui — o destino vem no state).
router.get('/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { code, state, error, error_description } = req.query;
  const estado = state ? mlOAuth.parseState(state) : null;
  const destino = destinoRetorno(estado?.retorno, '/integracoes');

  try {
    if (error) {
      return res.redirect(`${frontendUrl}${destino}?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Parâmetros code e state são obrigatórios' });
    }

    if (!estado) {
      return res.status(400).json({ error: 'State inválido' });
    }

    const { empresaId, userId, codeVerifier } = estado;

    const tokens = await mlOAuth.exchangeCodeForTokens({
      code,
      redirectUri: process.env.ML_REDIRECT_URI,
      codeVerifier,
    });

    const mlUser = await mlOAuth.fetchMlUser(tokens.access_token);

    await mlOAuth.saveIntegration({
      empresaId,
      userId,
      tokens,
      mlUser,
    });

    // Sync inicial dos anúncios em background (progresso via /integrations).
    agendarSyncInicial(empresaId);

    res.redirect(`${frontendUrl}${destino}?connected=mercadolivre`);
  } catch (error) {
    console.error('[MLAuth] Erro no callback:', error);
    res.redirect(`${frontendUrl}${destino}?error=${encodeURIComponent('Falha ao conectar Mercado Livre')}`);
  }
});

// GET /api/auth/ml/status
// Status da conexão Mercado Livre + lojas da empresa (multi-loja).
// ?mlUserId= opcional: foca uma loja específica.
router.get('/status', requireAuth, async (req, res) => {
  try {
    const mlUserId = req.query.mlUserId != null ? String(req.query.mlUserId) : undefined;
    const integration = await mlOAuth.getIntegration(req.empresaId, mlUserId);
    const status = mlOAuth.getIntegrationStatus(integration);
    const sellers = await mlOAuth.listarIntegracoes(req.empresaId);

    res.json({
      status,
      conta: integration ? {
        id: integration.id,
        mlUserId: integration.mlUserId,
        mlUser: integration.mlUser,
        updatedAt: integration.updatedAt,
      } : null,
      sellers,
    });
  } catch (error) {
    console.error('[MLAuth] Erro ao buscar status:', error);
    res.status(500).json({ error: 'Erro ao buscar status da conexão' });
  }
});

// POST /api/auth/ml/disconnect
// Desconecta conta Mercado Livre (uma loja via mlUserId, ou a atual).
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    const { prisma } = await import('../prisma/client.js');
    const mlUserId = req.body?.mlUserId != null ? String(req.body.mlUserId) : undefined;

    const alvo = mlUserId
      ? await prisma.contaIntegracao.findUnique({
        where: { provedor_empresaId_mlUserId: { provedor: 'mercadolivre', empresaId: req.empresaId, mlUserId } },
      })
      : (await prisma.contaIntegracao.findMany({
        where: { provedor: 'mercadolivre', empresaId: req.empresaId },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      }))[0];

    if (!alvo) {
      return res.status(404).json({ error: 'Integração não encontrada' });
    }
    await prisma.contaIntegracao.update({ where: { id: alvo.id }, data: { ativo: false } });

    res.json({ ok: true, message: 'Conta desconectada' });
  } catch (error) {
    console.error('[MLAuth] Erro ao desconectar:', error);
    res.status(500).json({ error: 'Erro ao desconectar conta' });
  }
});

export default router;