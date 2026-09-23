import { prisma } from '../prisma/client.js';
import { emitEvent } from '../eventBus.js';
import { criptografar, descriptografar } from '../cripto.js';
import crypto from 'crypto';

export { prisma };

const ML_AUTH_URL = 'https://auth.mercadolivre.com.br/authorization';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const ML_USER_URL = 'https://api.mercadolibre.com/users/me';

const REQUIRED_ENVS = ['ML_CLIENT_ID', 'ML_CLIENT_SECRET', 'ML_REDIRECT_URI', 'FRONTEND_URL'];

function checkEnv() {
  const missing = REQUIRED_ENVS.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  }
}

function generateState(empresaId, userId, codeVerifier) {
  const payload = { empresaId, userId, ts: Date.now(), nonce: crypto.randomBytes(16).toString('hex'), codeVerifier };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function parseState(state) {
  try {
    const json = Buffer.from(state, 'base64url').toString();
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

function buildAuthUrl({ empresaId, userId, usePKCE = true }) {
  checkEnv();
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = generateState(empresaId, userId, codeVerifier);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ML_CLIENT_ID,
    redirect_uri: process.env.ML_REDIRECT_URI,
    scope: 'read write offline_access',
    state,
  });
  if (usePKCE) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }
  return { url: `${ML_AUTH_URL}?${params.toString()}`, state };
}

async function exchangeCodeForTokens({ code, redirectUri, codeVerifier }) {
  checkEnv();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.ML_CLIENT_ID,
    client_secret: process.env.ML_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
  });
  if (codeVerifier) body.set('code_verifier', codeVerifier);

  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Falha ao trocar code por token');
    err.status = res.status;
    err.mlError = data;
    throw err;
  }
  return data;
}

async function refreshAccessToken(refreshToken) {
  checkEnv();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.ML_CLIENT_ID,
    client_secret: process.env.ML_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Falha ao renovar token');
    err.status = res.status;
    err.mlError = data;
    throw err;
  }
  return data;
}

async function fetchMlUser(accessToken) {
  const res = await fetch(ML_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

function buildTokenPayload(tokens, mlUser) {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    token_type: tokens.token_type,
    scope: tokens.scope,
    user_id: tokens.user_id,
    ml_user: mlUser ? { id: mlUser.id, nickname: mlUser.nickname, email: mlUser.email } : null,
    obtained_at: Date.now(),
  };
}

async function saveIntegration({ empresaId, userId, tokens, mlUser }) {
  const payload = buildTokenPayload(tokens, mlUser);
  const encrypted = criptografar(JSON.stringify(payload));

  // Multi-loja: seller desconhecido não pode salvar (evita linha órfã).
  if (tokens.user_id == null) {
    throw new Error('Resposta do Mercado Livre sem user_id');
  }
  const sellerId = String(tokens.user_id);
  const integration = await prisma.contaIntegracao.upsert({
    where: { provedor_empresaId_mlUserId: { provedor: 'mercadolivre', empresaId, mlUserId: sellerId } },
    update: {
      segredo: encrypted,
      ativo: true,
      updatedAt: new Date(),
    },
    create: {
      provedor: 'mercadolivre',
      empresaId,
      mlUserId: sellerId,
      rotulo: `MercadoLivre - ${mlUser?.nickname || tokens.user_id}`,
      segredo: encrypted,
      ativo: true,
    },
  });

  await emitEvent('ml.integration.saved', { empresaId, userId, mlUserId: tokens.user_id }, 'api', {});
  return integration;
}

// Busca a integração de um seller específico ou, sem mlUserId,
// a mais recentemente atualizada (compatível com conta única).
async function getIntegration(empresaId, mlUserId) {
  let record = null;
  if (mlUserId != null) {
    record = await prisma.contaIntegracao.findUnique({
      where: { provedor_empresaId_mlUserId: { provedor: 'mercadolivre', empresaId, mlUserId: String(mlUserId) } },
    });
  } else {
    const lista = await prisma.contaIntegracao.findMany({
      where: { provedor: 'mercadolivre', empresaId },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });
    record = lista[0] || null;
  }
  if (!record || !record.ativo) return null;
  try {
    const decrypted = JSON.parse(descriptografar(record.segredo));
    const expiresAt = decrypted.obtained_at + (decrypted.expires_in * 1000);
    return {
      id: record.id,
      empresaId: record.empresaId,
      // Necessário: getIntegrationStatus decide por `ativo`; sem ele,
      // toda integração salva era lida como 'desconectado'.
      ativo: record.ativo,
      // Identidade do seller (coluna + fallback do payload criptografado).
      mlUserId: record.mlUserId ?? (decrypted.user_id != null ? String(decrypted.user_id) : null),
      mlUser: decrypted.ml_user,
      accessToken: decrypted.access_token,
      refreshToken: decrypted.refresh_token,
      expiresAt,
      isExpired: Date.now() >= expiresAt - 60000,
      scope: decrypted.scope,
      updatedAt: record.updatedAt,
    };
  } catch {
    return null;
  }
}

async function getValidAccessToken(empresaId, mlUserId) {
  const integration = await getIntegration(empresaId, mlUserId);
  if (!integration) return null;

  if (!integration.isExpired) return integration.accessToken;

  try {
    const tokens = await refreshAccessToken(integration.refreshToken);
    const mlUser = await fetchMlUser(tokens.access_token);
    await saveIntegration({
      empresaId,
      userId: integration.mlUserId,
      tokens,
      mlUser,
    });
    return tokens.access_token;
  } catch (e) {
    await prisma.contaIntegracao.update({
      where: { id: integration.id },
      data: { ativo: false },
    });
    await emitEvent('ml.token.refresh_failed', { empresaId, error: e.message }, 'api', {});
    return null;
  }
}

function getIntegrationStatus(integration) {
  if (!integration) return 'nao_configurado';
  if (!integration.ativo) return 'desconectado';
  if (integration.isExpired) return 'token_expirado';
  return 'conectado';
}

// Lista todas as lojas conectadas da empresa (multi-loja),
// sem expor segredos: só identidade, status e sincronização.
async function listarIntegracoes(empresaId) {
  const registros = await prisma.contaIntegracao.findMany({
    where: { provedor: 'mercadolivre', empresaId },
    orderBy: { updatedAt: 'desc' },
  });
  return registros.map(r => {
    let nickname = null;
    try {
      const dados = JSON.parse(descriptografar(r.segredo));
      nickname = dados?.ml_user?.nickname ?? null;
    } catch {
      nickname = null;
    }
    return {
      mlUserId: r.mlUserId,
      nickname,
      ativo: r.ativo,
      status: r.ativo ? 'conectado' : 'desconectado',
      updatedAt: r.updatedAt,
    };
  });
}

export const mlOAuth = {
  checkEnv,
  generateState,
  parseState,
  generatePKCE,
  buildAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  fetchMlUser,
  saveIntegration,
  getIntegration,
  getValidAccessToken,
  getIntegrationStatus,
  listarIntegracoes,
  ML_AUTH_URL,
  ML_TOKEN_URL,
};