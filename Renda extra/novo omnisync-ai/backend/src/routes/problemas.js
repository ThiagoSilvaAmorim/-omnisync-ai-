// backend/src/routes/problemas.js
// Central de B.O.: CRUD real sobre o modelo Problema.
// Fluxo de status: aberto → em andamento → resolvido.
// Contrato consumido pelo frontend (CentralBO).

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';

const router = Router();

const STATUS_VALIDOS = ['aberto', 'em andamento', 'resolvido'];
const PRIORIDADES_VALIDAS = ['alta', 'media', 'baixa'];
const AVANCO = { aberto: 'em andamento', 'em andamento': 'resolvido' };

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  next();
}

function paraPublico(p) {
  if (!p) return null;
  return {
    id: p.id,
    titulo: p.titulo,
    descricao: p.descricao ?? '',
    categoria: p.categoria ?? 'Operacional',
    prioridade: p.prioridade ?? 'media',
    data: p.data ?? '',
    status: p.status ?? 'aberto',
    historico: Array.isArray(p.historico) ? p.historico : [],
  };
}

// GET /api/problemas — lista.
router.get('/', requireAuth, async (_req, res) => {
  try {
    const lista = await prisma.problema.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(lista.map(paraPublico));
  } catch (e) {
    console.error('[Problemas] Erro ao listar:', e.message);
    return res.status(500).json({ error: 'Erro ao listar B.O.s' });
  }
});

// POST /api/problemas — abre B.O. (id gerado pelo cliente ou servidor).
router.post('/', requireAuth, async (req, res) => {
  const titulo = String(req.body?.titulo || '').trim();
  if (!titulo) {
    return res.status(400).json({ code: 'INVALID_BO', message: 'Descreva o problema para abrir o B.O.' });
  }
  const prioridade = String(req.body?.prioridade || 'media');
  if (!PRIORIDADES_VALIDAS.includes(prioridade)) {
    return res.status(400).json({ code: 'INVALID_BO', message: 'Prioridade inválida.' });
  }
  const id = String(req.body?.id || `BO-${Date.now().toString(36)}`).trim();
  try {
    const existente = await prisma.problema.findUnique({ where: { id } });
    if (existente) return res.json({ ok: true, bo: paraPublico(existente), jaExistia: true });
    const criado = await prisma.problema.create({
      data: {
        id,
        titulo,
        descricao: String(req.body?.descricao || 'Sem descrição'),
        categoria: String(req.body?.categoria || 'Operacional'),
        prioridade,
        data: String(req.body?.data || new Date().toLocaleDateString('pt-BR')),
        status: 'aberto',
        historico: [],
      },
    });
    return res.status(201).json({ ok: true, bo: paraPublico(criado) });
  } catch (e) {
    console.error('[Problemas] Erro ao criar:', e.message);
    return res.status(500).json({ error: 'Erro ao abrir B.O.' });
  }
});

// PATCH /api/problemas/:id/avancar — avança um passo no fluxo.
router.patch('/:id/avancar', requireAuth, async (req, res) => {
  try {
    const atual = await prisma.problema.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'B.O. não encontrado' });
    const proximo = AVANCO[atual.status];
    if (!proximo) {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: `B.O. já está ${atual.status}.` });
    }
    const atualizado = await prisma.problema.update({
      where: { id: req.params.id },
      data: { status: proximo },
    });
    return res.json({ ok: true, bo: paraPublico(atualizado) });
  } catch (e) {
    console.error('[Problemas] Erro ao avançar:', e.message);
    return res.status(500).json({ error: 'Erro ao avançar B.O.' });
  }
});

// POST /api/problemas/:id/notas — anexa nota ao histórico.
router.post('/:id/notas', requireAuth, async (req, res) => {
  const texto = String(req.body?.texto || '').trim();
  if (!texto) return res.status(400).json({ code: 'INVALID_NOTE', message: 'Nota vazia.' });
  try {
    const atual = await prisma.problema.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'B.O. não encontrado' });
    const historico = [...(Array.isArray(atual.historico) ? atual.historico : []), { texto, quando: new Date().toLocaleString('pt-BR') }];
    const atualizado = await prisma.problema.update({
      where: { id: req.params.id },
      data: { historico },
    });
    return res.json({ ok: true, bo: paraPublico(atualizado) });
  } catch (e) {
    console.error('[Problemas] Erro ao anexar nota:', e.message);
    return res.status(500).json({ error: 'Erro ao anexar nota' });
  }
});

// DELETE /api/problemas/:id — exclui.
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const atual = await prisma.problema.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'B.O. não encontrado' });
    await prisma.problema.delete({ where: { id: req.params.id } });
    return res.json({ ok: true, id: req.params.id });
  } catch (e) {
    console.error('[Problemas] Erro ao excluir:', e.message);
    return res.status(500).json({ error: 'Erro ao excluir B.O.' });
  }
});

export default router;
