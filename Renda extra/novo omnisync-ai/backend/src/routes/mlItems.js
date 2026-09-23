// backend/src/routes/mlItems.js
// Escrita no Mercado Livre SEMPRE com aprovação prévia:
// o chamador informa approvalId de solicitação "aprovada" para a ação.
// Sem aprovação válida, nada é executado (403). Leitura de envio
// exige apenas autenticação (sem aprovação).

import { Router } from 'express';
import { usuarioDoRequest } from '../auth.js';
import { approvalEngine } from '../approvalEngine.js';
import { mlOAuth } from '../services/mlOAuth.js';
import {
  publicarAnuncio,
  atualizarPreco,
  atualizarEstoque,
  alterarStatusAnuncio,
  lerEnvio,
} from '../services/mlListings.js';

const router = Router();

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

// Valida aprovação prévia para a ação; retorna 403 sem executar nada.
function exigirAprovacao(approvalId, acao) {
  const ap = approvalId ? approvalEngine.getSolicitacao(approvalId) : null;
  if (!ap || ap.status !== 'aprovada') {
    const e = new Error('Ação exige aprovação prévia.');
    e.code = 'APPROVAL_REQUIRED';
    e.status = 403;
    throw e;
  }
  if (acao && ap.action !== acao) {
    const e = new Error('Aprovação não corresponde a esta ação.');
    e.code = 'APPROVAL_MISMATCH';
    e.status = 403;
    throw e;
  }
  return ap;
}

async function tokenDaEmpresa(req, res) {
  const token = await mlOAuth.getValidAccessToken(req.empresaId);
  if (!token) {
    res.status(401).json({ error: 'Conta do Mercado Livre não conectada' });
    return null;
  }
  return token;
}

function responderErro(res, e) {
  const status = Number(e?.status) || 500;
  const body = { error: e?.message || 'Falha na operação.' };
  if (e?.code) body.code = e.code;
  return res.status(status).json(body);
}

// POST /api/ml/items — criar anúncio (exige approvalId aprovado p/ ml.publish)
router.post('/items', requireAuth, async (req, res) => {
  try {
    const ap = exigirAprovacao(req.body?.approvalId, 'ml.publish');
    const token = await tokenDaEmpresa(req, res);
    if (!token) return;
    const criado = await publicarAnuncio(token, req.body?.item);
    approvalEngine.marcarExecutada(ap.id, { itemId: criado?.id ?? null });
    return res.status(201).json({ ok: true, item: criado });
  } catch (e) {
    return responderErro(res, e);
  }
});

// PUT /api/ml/items/:id/price — alterar preço (exige approvalId p/ ml.price)
router.put('/items/:id/price', requireAuth, async (req, res) => {
  try {
    const ap = exigirAprovacao(req.body?.approvalId, 'ml.price');
    const token = await tokenDaEmpresa(req, res);
    if (!token) return;
    const atualizado = await atualizarPreco(token, req.params.id, req.body?.price);
    approvalEngine.marcarExecutada(ap.id, { itemId: req.params.id });
    return res.json({ ok: true, item: atualizado });
  } catch (e) {
    return responderErro(res, e);
  }
});

// PUT /api/ml/items/:id/stock — alterar estoque (exige approvalId p/ ml.stock)
router.put('/items/:id/stock', requireAuth, async (req, res) => {
  try {
    const ap = exigirAprovacao(req.body?.approvalId, 'ml.stock');
    const token = await tokenDaEmpresa(req, res);
    if (!token) return;
    const atualizado = await atualizarEstoque(token, req.params.id, req.body?.quantity);
    approvalEngine.marcarExecutada(ap.id, { itemId: req.params.id });
    return res.json({ ok: true, item: atualizado });
  } catch (e) {
    return responderErro(res, e);
  }
});

// PUT /api/ml/items/:id/status — pausar/reativar (exige approvalId p/ ml.status)
router.put('/items/:id/status', requireAuth, async (req, res) => {
  try {
    const ap = exigirAprovacao(req.body?.approvalId, 'ml.status');
    const token = await tokenDaEmpresa(req, res);
    if (!token) return;
    const atualizado = await alterarStatusAnuncio(token, req.params.id, req.body?.status);
    approvalEngine.marcarExecutada(ap.id, { itemId: req.params.id });
    return res.json({ ok: true, item: atualizado });
  } catch (e) {
    return responderErro(res, e);
  }
});

// GET /api/ml/shipments/:id — leitura de envio (somente leitura, sem aprovação)
router.get('/shipments/:id', requireAuth, async (req, res) => {
  try {
    const token = await tokenDaEmpresa(req, res);
    if (!token) return;
    const envio = await lerEnvio(token, req.params.id);
    return res.json({ ok: true, envio });
  } catch (e) {
    return responderErro(res, e);
  }
});

export default router;
