// backend/src/routes/suppliers.js
// Fornecedores reais: busca pública (Google Places) + salvamento manual
// + verificação comercial. Resultados públicos nunca nascem verificados;
// sem API oficial do fornecedor, a compra segue com aprovação manual.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { searchGooglePlaces } from '../services/googlePlaces.js';

const router = Router();

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

function paraPublico(f) {
  if (!f) return null;
  return {
    id: f.id,
    externalId: f.externalId,
    nome: f.nome,
    endereco: f.endereco,
    telefone: f.telefone,
    site: f.site,
    mapsUrl: f.mapsUrl,
    avaliacao: f.avaliacao,
    quantidadeAvaliacoes: f.quantidadeAvaliacoes,
    categoria: f.categoria,
    fonte: f.fonte,
    verificado: f.verificado,
    vendeAtacado: f.vendeAtacado,
    aceitaRevenda: f.aceitaRevenda,
    possuiNotaFiscal: f.possuiNotaFiscal,
    possuiApi: f.possuiApi,
    prazoInformado: f.prazoInformado,
    custoNegociado: f.custoNegociado,
    observacao: f.observacao,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

// GET /api/fornecedores/buscar?query=...&cidade=...
router.get('/buscar', requireAuth, async (req, res) => {
  const query = String(req.query.query || '').trim();
  const cidade = String(req.query.cidade || '').trim();

  if (query.length < 3 || cidade.length < 2) {
    return res.status(400).json({
      code: 'INVALID_SEARCH',
      message: 'Informe o tipo de fornecedor e a cidade.',
    });
  }

  try {
    const fornecedores = await searchGooglePlaces({ query, cidade });
    return res.json({ ok: true, fonte: 'Google Places', verificado: false, fornecedores });
  } catch (error) {
    if (error.code === 'GOOGLE_PLACES_NOT_CONFIGURED') {
      return res.status(503).json({
        code: error.code,
        message: 'A busca pública de fornecedores ainda não está configurada.',
      });
    }
    if (error.code === 'GOOGLE_PLACES_RATE_LIMIT') {
      return res.status(429).json({
        code: error.code,
        message: 'Limite temporário de busca atingido. Tente novamente mais tarde.',
      });
    }
    if (error.code === 'GOOGLE_PLACES_UNAUTHORIZED') {
      return res.status(502).json({
        code: error.code,
        message: 'A API Google Places recusou a configuração atual.',
      });
    }
    console.error('Erro Google Places:', { code: error.code, message: error.message });
    return res.status(502).json({
      code: 'GOOGLE_PLACES_REQUEST_FAILED',
      message: 'Não foi possível consultar empresas públicas agora.',
    });
  }
});

// GET /api/fornecedores — lista salva da empresa (substitui o mock estático).
router.get('/', requireAuth, async (req, res) => {
  try {
    const lista = await prisma.fornecedor.findMany({
      where: { empresaId: req.empresaId },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json(lista.map(paraPublico));
  } catch (e) {
    console.error('[Suppliers] Erro ao listar:', e.message);
    return res.status(500).json({ error: 'Erro ao listar fornecedores' });
  }
});

// POST /api/fornecedores — salva empresa manualmente (sempre não verificada).
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const nome = String(b.nome || '').trim();
  if (!nome) {
    return res.status(400).json({ code: 'INVALID_SUPPLIER', message: 'Informe o nome do fornecedor.' });
  }

  const dados = {
    empresaId: req.empresaId,
    externalId: b.externalId ? String(b.externalId) : null,
    nome,
    endereco: b.endereco ? String(b.endereco) : null,
    telefone: b.telefone ? String(b.telefone) : null,
    site: b.site ? String(b.site) : null,
    mapsUrl: b.mapsUrl ? String(b.mapsUrl) : null,
    avaliacao: Number.isFinite(Number(b.avaliacao)) ? Number(b.avaliacao) : null,
    quantidadeAvaliacoes: Number.isFinite(Number(b.quantidadeAvaliacoes)) ? Number(b.quantidadeAvaliacoes) : 0,
    categoria: b.categoria ? String(b.categoria) : null,
    fonte: b.fonte ? String(b.fonte) : 'Manual',
    // Nunca aceitar verificado=true do frontend: toda entrada nasce não verificada.
    verificado: false,
    vendeAtacado: typeof b.vendeAtacado === 'boolean' ? b.vendeAtacado : null,
    aceitaRevenda: typeof b.aceitaRevenda === 'boolean' ? b.aceitaRevenda : null,
    possuiNotaFiscal: typeof b.possuiNotaFiscal === 'boolean' ? b.possuiNotaFiscal : null,
    possuiApi: typeof b.possuiApi === 'boolean' ? b.possuiApi : null,
    prazoInformado: b.prazoInformado ? String(b.prazoInformado) : null,
    custoNegociado: Number.isFinite(Number(b.custoNegociado)) ? Number(b.custoNegociado) : null,
    observacao: b.observacao ? String(b.observacao) : null,
  };

  try {
    if (dados.externalId) {
      const existente = await prisma.fornecedor.findUnique({
        where: { empresaId_externalId: { empresaId: req.empresaId, externalId: dados.externalId } },
      });
      if (existente) {
        return res.json({ ok: true, fornecedor: paraPublico(existente), jaExistia: true });
      }
    }
    const criado = await prisma.fornecedor.create({ data: dados });
    return res.status(201).json({ ok: true, fornecedor: paraPublico(criado) });
  } catch (e) {
    console.error('[Suppliers] Erro ao salvar:', e.message);
    return res.status(500).json({ error: 'Erro ao salvar fornecedor' });
  }
});

// PATCH /api/fornecedores/:id/verificar — exige dados comerciais reais.
router.patch('/:id/verificar', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ code: 'INVALID_ID', message: 'Identificador inválido.' });
  }
  const b = req.body || {};
  const comercialValido =
    typeof b.vendeAtacado === 'boolean' &&
    typeof b.aceitaRevenda === 'boolean' &&
    typeof b.possuiNotaFiscal === 'boolean' &&
    typeof b.prazoInformado === 'string' &&
    b.prazoInformado.trim().length >= 2;
  if (!comercialValido) {
    return res.status(400).json({
      code: 'INVALID_VERIFICATION',
      message: 'Informe vendeAtacado, aceitaRevenda, possuiNotaFiscal e prazoInformado.',
    });
  }

  try {
    const existente = await prisma.fornecedor.findFirst({ where: { id, empresaId: req.empresaId } });
    if (!existente) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }
    const atualizado = await prisma.fornecedor.update({
      where: { id },
      data: {
        vendeAtacado: b.vendeAtacado,
        aceitaRevenda: b.aceitaRevenda,
        possuiNotaFiscal: b.possuiNotaFiscal,
        possuiApi: typeof b.possuiApi === 'boolean' ? b.possuiApi : existente.possuiApi,
        prazoInformado: b.prazoInformado.trim(),
        custoNegociado: Number.isFinite(Number(b.custoNegociado)) ? Number(b.custoNegociado) : existente.custoNegociado,
        observacao: typeof b.observacao === 'string' ? b.observacao : existente.observacao,
        verificado: true,
      },
    });
    return res.json({ ok: true, fornecedor: paraPublico(atualizado) });
  } catch (e) {
    console.error('[Suppliers] Erro ao verificar:', e.message);
    return res.status(500).json({ error: 'Erro ao verificar fornecedor' });
  }
});

// DELETE /api/fornecedores/:id — somente da própria empresa.
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ code: 'INVALID_ID', message: 'Identificador inválido.' });
  }
  try {
    const apagado = await prisma.fornecedor.deleteMany({ where: { id, empresaId: req.empresaId } });
    if (!apagado.count) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('[Suppliers] Erro ao excluir:', e.message);
    return res.status(500).json({ error: 'Erro ao excluir fornecedor' });
  }
});

export default router;
