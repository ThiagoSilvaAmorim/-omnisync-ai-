// backend/src/routes/metas.js
// Metas do negócio com progresso (exclusivo do diretor no frontend).
// Contrato consumido pelo frontend (Metas): GET / lista,
// POST / cria, DELETE /:id exclui.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';

const router = Router();

const TIPOS_VALIDOS = ['number', 'currency', 'percent'];

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  next();
}

// GET /api/metas — lista.
router.get('/', requireAuth, async (_req, res) => {
  try {
    const lista = await prisma.meta.findMany({ orderBy: { id: 'asc' } });
    return res.json(lista);
  } catch (e) {
    console.error('[Metas] Erro ao listar:', e.message);
    return res.status(500).json({ error: 'Erro ao listar metas' });
  }
});

// POST /api/metas — cria.
router.post('/', requireAuth, async (req, res) => {
  const nome = String(req.body?.nome || '').trim();
  const meta = Number(req.body?.meta ?? req.body?.valor);
  const tipo = String(req.body?.tipo || 'number');
  if (!nome) {
    return res.status(400).json({ code: 'INVALID_GOAL', message: 'Informe o nome da meta.' });
  }
  if (!Number.isFinite(meta) || meta <= 0) {
    return res.status(400).json({ code: 'INVALID_GOAL', message: 'Informe um valor válido.' });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ code: 'INVALID_GOAL', message: 'Tipo inválido.' });
  }
  try {
    const criada = await prisma.meta.create({
      data: { nome, meta, atual: Number(req.body?.atual) || 0, tipo, setor: String(req.body?.setor || 'Geral') },
    });
    return res.status(201).json({ ok: true, meta: criada });
  } catch (e) {
    console.error('[Metas] Erro ao criar:', e.message);
    return res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

// DELETE /api/metas/:id — exclui.
router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const atual = await prisma.meta.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: 'Meta não encontrada' });
    await prisma.meta.delete({ where: { id } });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('[Metas] Erro ao excluir:', e.message);
    return res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

export default router;
