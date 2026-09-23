// backend/src/routes/cupons.js
// Cupons de desconto internos (Promoções): CRUD real sobre o modelo Cupom.
// Contrato consumido pelo frontend (Marketing) e coberto por tests/api.test.js:
// GET / lista, POST / cria (409 em código duplicado),
// PUT /:id atualiza, DELETE /:id exclui.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';

const router = Router();

const TIPOS_VALIDOS = ['percentual', 'fixo'];

function normalizarCodigo(v) {
  return String(v || '').trim().toUpperCase();
}

// GET /api/cupons — lista.
router.get('/', async (_req, res) => {
  try {
    const lista = await prisma.cupom.findMany({ orderBy: { id: 'asc' } });
    return res.json(lista);
  } catch (e) {
    console.error('[Cupons] Erro ao listar:', e.message);
    return res.status(500).json({ error: 'Erro ao listar cupons' });
  }
});

// POST /api/cupons — cria.
router.post('/', async (req, res) => {
  const codigo = normalizarCodigo(req.body?.codigo);
  const tipo = String(req.body?.tipo || 'percentual');
  const valor = Number(req.body?.valor);
  if (!codigo) {
    return res.status(400).json({ code: 'INVALID_COUPON', message: 'Informe o código do cupom.' });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ code: 'INVALID_COUPON', message: 'Tipo deve ser percentual ou fixo.' });
  }
  if (!Number.isFinite(valor) || valor <= 0) {
    return res.status(400).json({ code: 'INVALID_COUPON', message: 'Informe um valor maior que zero.' });
  }
  try {
    const criado = await prisma.cupom.create({
      data: { codigo, tipo, valor, validade: String(req.body?.validade || ''), ativo: req.body?.ativo ?? true },
    });
    return res.status(201).json(criado);
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ code: 'DUPLICATE_COUPON', message: 'Código de cupom já existe.' });
    }
    console.error('[Cupons] Erro ao criar:', e.message);
    return res.status(500).json({ error: 'Erro ao criar cupom' });
  }
});

// PUT /api/cupons/:id — atualiza.
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const atual = await prisma.cupom.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: 'Cupom não encontrado' });
    const data = {};
    if (req.body?.tipo !== undefined) {
      if (!TIPOS_VALIDOS.includes(String(req.body.tipo))) {
        return res.status(400).json({ code: 'INVALID_COUPON', message: 'Tipo deve ser percentual ou fixo.' });
      }
      data.tipo = String(req.body.tipo);
    }
    if (req.body?.valor !== undefined) {
      const valor = Number(req.body.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        return res.status(400).json({ code: 'INVALID_COUPON', message: 'Informe um valor maior que zero.' });
      }
      data.valor = valor;
    }
    if (req.body?.ativo !== undefined) data.ativo = Boolean(req.body.ativo);
    if (req.body?.validade !== undefined) data.validade = String(req.body.validade);
    const atualizado = await prisma.cupom.update({ where: { id }, data });
    return res.json(atualizado);
  } catch (e) {
    console.error('[Cupons] Erro ao atualizar:', e.message);
    return res.status(500).json({ error: 'Erro ao atualizar cupom' });
  }
});

// DELETE /api/cupons/:id — exclui.
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const atual = await prisma.cupom.findUnique({ where: { id } });
    if (!atual) return res.status(404).json({ error: 'Cupom não encontrado' });
    await prisma.cupom.delete({ where: { id } });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error('[Cupons] Erro ao excluir:', e.message);
    return res.status(500).json({ error: 'Erro ao excluir cupom' });
  }
});

export default router;
