// backend/src/auth.js
// Autenticação por token assinado (HMAC-SHA256) + matriz de perfis.
// Perfis oficiais: Diretor, Comercial e Estoquista, com
// normalização dos rótulos legados (Admin, Operador, ...).
// O token tem validade de 12h e é validado a cada requisição
// autenticada via cabeçalho `Authorization: Bearer <token>`.

import crypto from 'node:crypto';

const SEGREDO = process.env.JWT_SECRET || 'omnisync-dev-secret';
const VALIDADE_MS = 12 * 60 * 60 * 1000;

export const PERFIS = ['Diretor', 'Comercial', 'Estoquista'];

const LEGADO_PARA_CANONICO = {
  Admin: 'Diretor',
  Diretor: 'Diretor',
  Operador: 'Comercial',
  Comercial: 'Comercial',
  Estoquista: 'Estoquista',
  Visualizador: 'Comercial',
  Usuario: 'Comercial',
};

export function normalizarPerfil(perfil) {
  if (!perfil) return 'Comercial';
  return LEGADO_PARA_CANONICO[String(perfil).trim()] || 'Comercial';
}

const MATRIZ_ACESSO = {
  Diretor: ['*'],
  Comercial: ['dashboard', 'vendas', 'pedidos', 'clientes', 'marketing', 'publicacoes', 'conteudo-ia', 'calendario', 'relatorios'],
  Estoquista: ['dashboard', 'produtos', 'produto-intel', 'estoque', 'compras', 'fornecedores', 'logistica', 'relatorios'],
};

export function podeAcessar(perfil, modulo) {
  const canonico = normalizarPerfil(perfil);
  const permissoes = MATRIZ_ACESSO[canonico] || [];
  return permissoes.includes('*') || permissoes.includes(modulo);
}

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

// Emite um token no formato payload.assinatura.
export function assinarToken({ email, nome, perfil }) {
  const payload = {
    email,
    nome,
    perfil: normalizarPerfil(perfil),
    exp: Date.now() + VALIDADE_MS,
  };
  const corpo = base64url(payload);
  const assinatura = crypto.createHmac('sha256', SEGREDO).update(corpo).digest('base64url');
  return `${corpo}.${assinatura}`;
}

// Valida assinatura e expiração; retorna o payload ou null.
export function verificarToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const [corpo, assinatura] = token.split('.');
    if (!corpo || !assinatura) return null;
    const esperado = crypto.createHmac('sha256', SEGREDO).update(corpo).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado))) return null;
    const payload = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return { ...payload, perfil: normalizarPerfil(payload.perfil) };
  } catch {
    return null;
  }
}

// Extrai o usuário do cabeçalho Authorization (Bearer).
export function usuarioDoRequest(req) {
  const header = req.headers?.authorization || '';
  const [esquema, token] = header.split(' ');
  if (esquema === 'Bearer' && token) {
    const payload = verificarToken(token);
    if (payload) return payload;
  }
  return null;
}

// Middleware opcional: anexa req.authUser quando há token válido.
// Não bloqueia rotas legadas sem token (compatibilidade com testes e mocks).
export function anexarUsuario(req, _res, next) {
  req.authUser = usuarioDoRequest(req);
  next();
}
