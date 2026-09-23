// backend/src/routes/aiAnalysis.js
// Análises do Gemini sobre dados reais (nunca mock).
// Sem dados suficientes → INSUFFICIENT_DATA (HTTP 200, ok:false).
// Nenhuma rota executa ação externa; tudo é leitura + rascunho.

import { Router } from 'express';
import { usuarioDoRequest } from '../auth.js';
import { analisarDominio, gerarRascunhoAnuncio } from '../services/geminiAnalysis.js';
import { executarAgente, listarAgentes } from '../services/agentOrchestrator.js';

const router = Router();

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

function responderErro(res, e) {
  if (e?.code === 'GEMINI_NOT_CONFIGURED') {
    return res.status(503).json({
      code: e.code,
      message: 'O assistente de IA ainda não está configurado no servidor.',
    });
  }
  const status = Number(e?.status) || 500;
  const mensagens = {
    400: 'Requisição inválida.',
    404: 'Recurso não encontrado.',
    429: 'Limite de uso do Gemini atingido.',
    403: 'Acesso negado ao Gemini.',
    504: 'Tempo esgotado ao consultar o Gemini.',
  };
  return res.status(status).json({ error: e?.message || mensagens[status] || 'Falha na análise.' });
}

const DOMINIOS = ['dashboard', 'sales', 'market', 'supplier', 'inventory', 'order'];

// POST /api/ai/analyze/:dominio
router.post('/analyze/:dominio', requireAuth, async (req, res) => {
  try {
    const resultado = await analisarDominio(req.params.dominio, {
      empresaId: req.empresaId,
      ...(req.body || {}),
    });
    return res.json(resultado);
  } catch (e) {
    return responderErro(res, e);
  }
});

// POST /api/ai/generate/listing — rascunho de anúncio, nunca publica.
router.post('/generate/listing', requireAuth, async (req, res) => {
  try {
    const resultado = await gerarRascunhoAnuncio(req.body?.produtoId);
    return res.json(resultado);
  } catch (e) {
    return responderErro(res, e);
  }
});

// Lista os domínios suportados (sem executar nada).
router.get('/analyze', requireAuth, (_req, res) => {
  res.json({ dominios: DOMINIOS });
});

// POST /api/ai/agent/:agente — executa um agente sobre seu domínio de dados.
// Nunca executa ação externa; registra a execução de forma estruturada.
router.post('/agent/:agente', requireAuth, async (req, res) => {
  try {
    const registro = await executarAgente(req.params.agente, req.body?.task, {
      empresaId: req.empresaId,
      payload: req.body?.payload || {},
    });
    if (registro.status === 'failed' && registro.code === 'UNKNOWN_AGENT') {
      return res.status(400).json(registro);
    }
    return res.json(registro);
  } catch (e) {
    return responderErro(res, e);
  }
});

// GET /api/ai/agents — agentes disponíveis e seus domínios.
router.get('/agents', requireAuth, (_req, res) => {
  res.json({ agentes: listarAgentes() });
});

export default router;
export { DOMINIOS };
