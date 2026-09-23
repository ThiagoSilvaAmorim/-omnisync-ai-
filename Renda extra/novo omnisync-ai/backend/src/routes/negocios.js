// backend/src/routes/negocios.js
// Pipeline de negócios (CRM) com dados reais do banco.
// Estágios são vocabulário fixo do domínio; os registros são reais.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';

const router = Router();

export const ESTAGIOS = ['lead', 'qualificado', 'proposta', 'fechado', 'perdido'];

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  next();
}

function paraPublico(n) {
  if (!n) return null;
  return {
    id: n.id,
    titulo: n.titulo,
    cliente: n.cliente,
    valor: n.valor,
    estagio: n.estagio,
    data: n.data,
  };
}

// GET /api/negocios — lista.
router.get('/', requireAuth, async (_req, res) => {
  try {
    const lista = await prisma.negocio.findMany({ orderBy: { id: 'desc' } });
    return res.json(lista.map(paraPublico));
  } catch (e) {
    console.error('[Negocios] Erro ao listar:', e.message);
    return res.status(500).json({ error: 'Erro ao listar negócios' });
  }
});

// GET /api/negocios/estagios — vocabulário fixo do pipeline.
router.get('/estagios', requireAuth, (_req, res) => {
  return res.json(ESTAGIOS);
});

// POST /api/negocios — cria negócio em lead.
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const titulo = String(b.titulo || '').trim();
  const valor = Number(b.valor);
  if (!titulo) {
    return res.status(400).json({ code: 'INVALID_DEAL', message: 'Informe o título do negócio.' });
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ code: 'INVALID_DEAL', message: 'Informe um valor maior que zero.' });
  }
  try {
    const criado = await prisma.negocio.create({
      data: {
        titulo,
        cliente: String(b.cliente || ''),
        valor,
        estagio: 'lead',
        data: new Date().toISOString().slice(0, 10),
      },
    });
    return res.status(201).json({ ok: true, negocio: paraPublico(criado) });
  } catch (e) {
    console.error('[Negocios] Erro ao criar:', e.message);
    return res.status(500).json({ error: 'Erro ao criar negócio' });
  }
});

// PATCH /api/negocios/:id/estagio — move no pipeline.
router.patch('/:id/estagio', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const estagio = String(req.body?.estagio || '');
  if (!Number.isInteger(id)) {
    return res.status(400).json({ code: 'INVALID_ID', message: 'Identificador inválido.' });
  }
  if (!ESTAGIOS.includes(estagio)) {
    return res.status(400).json({ code: 'INVALID_STAGE', message: 'Estágio inválido.' });
  }
  try {
    const atual = await prisma.negocio.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: 'Negócio não encontrado' });
    if (atual.estagio === estagio) {
      return res.json({ ok: true, negocio: paraPublico(atual), jaEstava: true });
    }
    const atualizado = await prisma.negocio.update({ where: { id }, data: { estagio } });
    return res.json({ ok: true, negocio: paraPublico(atualizado) });
  } catch (e) {
    console.error('[Negocios] Erro ao mover:', e.message);
    return res.status(500).json({ error: 'Erro ao mover negócio' });
  }
});

// DELETE /api/negocios/:id — remove.
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ code: 'INVALID_ID', message: 'Identificador inválido.' });
  }
  try {
    const atual = await prisma.negocio.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: 'Negócio não encontrado' });
    await prisma.negocio.delete({ where: { id } });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[Negocios] Erro ao excluir:', e.message);
    return res.status(500).json({ error: 'Erro ao excluir negócio' });
  }
});

export default router;
