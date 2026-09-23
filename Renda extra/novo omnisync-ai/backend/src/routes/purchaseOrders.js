// backend/src/routes/purchaseOrders.js
// Ordens de compra com aprovação manual obrigatória.
// Criação sempre gera rascunho (aguardando_aprovacao); nada é enviado
// ao fornecedor automaticamente e nenhum pagamento é efetuado aqui.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { emitEvent } from '../eventBus.js';
import { mlOAuth } from '../services/mlOAuth.js';
import { lerEnvio } from '../services/mlListings.js';

const router = Router();

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

async function auditar(type, ordem, req) {
  try {
    await emitEvent(type, { ordemId: ordem?.id ?? null, fornecedor: ordem?.fornecedor ?? null, total: ordem?.total ?? null, status: ordem?.status ?? null }, 'api', { entityType: 'purchase_order', entityId: ordem?.id ?? null, metadata: { ator: req.authUser?.email || 'sistema' } });
  } catch (e) {
    console.error('[Audit] Falha ao registrar evento (sem impacto na operação):', e.message);
  }
}

function paraPublico(o) {
  if (!o) return null;
  return {
    id: o.id,
    fornecedor: o.fornecedor,
    data: o.data,
    total: o.total,
    status: o.status,
    pedidoId: o.pedidoId ?? null,
    idExterno: o.idExterno ?? null,
    aprovador: o.aprovador ?? null,
    aprovadoEm: o.aprovadoEm ?? null,
    motivo: o.motivo ?? null,
    rastreio: o.rastreio ?? null,
    mlShipmentId: o.mlShipmentId ?? null,
    mlStatus: o.mlStatus ?? null,
  };
}

// GET /api/purchase-orders — lista.
router.get('/', requireAuth, async (_req, res) => {
  try {
    const lista = await prisma.purchaseOrder.findMany({ orderBy: { id: 'desc' } });
    return res.json(lista.map(paraPublico));
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao listar:', e.message);
    return res.status(500).json({ error: 'Erro ao listar ordens de compra' });
  }
});

// POST /api/purchase-orders — cria rascunho (idempotente por idExterno).
router.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  const fornecedor = String(b.fornecedor || '').trim();
  const total = Number(b.total);
  if (!fornecedor) {
    return res.status(400).json({ code: 'INVALID_ORDER', message: 'Informe o fornecedor.' });
  }
  if (!Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ code: 'INVALID_ORDER', message: 'Informe um total maior que zero.' });
  }
  const idExterno = b.idExterno ? String(b.idExterno) : null;

  try {
    if (idExterno) {
      const existente = await prisma.purchaseOrder.findUnique({ where: { idExterno } });
      if (existente) {
        return res.json({ ok: true, ordem: paraPublico(existente), jaExistia: true });
      }
    }
    const criada = await prisma.purchaseOrder.create({
      data: {
        id: `OC-${Date.now().toString(36)}`,
        fornecedor,
        data: new Date().toISOString().slice(0, 10),
        total,
        status: 'aguardando_aprovacao',
        pedidoId: b.pedidoId ? String(b.pedidoId) : null,
        idExterno,
      },
    });
    await auditar('purchase.created', criada, req);
    return res.status(201).json({ ok: true, ordem: paraPublico(criada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao criar:', e.message);
    return res.status(500).json({ error: 'Erro ao criar ordem de compra' });
  }
});

// POST /api/purchase-orders/:id/aprovar — somente de aguardando_aprovacao.
router.post('/:id/aprovar', requireAuth, async (req, res) => {
  const aprovador = String(req.body?.aprovador || '').trim();
  if (!aprovador) {
    return res.status(400).json({ code: 'INVALID_APPROVAL', message: 'Informe o aprovador.' });
  }
  try {
    const atual = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Ordem de compra não encontrada' });
    if (atual.status !== 'aguardando_aprovacao') {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: `Transição inválida a partir de ${atual.status}.` });
    }
    const atualizada = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'compra_aprovada', aprovador, aprovadoEm: new Date() },
    });
    return res.json({ ok: true, ordem: paraPublico(atualizada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao aprovar:', e.message);
    return res.status(500).json({ error: 'Erro ao aprovar ordem de compra' });
  }
});

// POST /api/purchase-orders/:id/rejeitar — somente de aguardando_aprovacao, com motivo.
router.post('/:id/rejeitar', requireAuth, async (req, res) => {
  const motivo = String(req.body?.motivo || '').trim();
  if (motivo.length < 3) {
    return res.status(400).json({ code: 'INVALID_REJECTION', message: 'Informe o motivo da rejeição.' });
  }
  try {
    const atual = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Ordem de compra não encontrada' });
    if (atual.status !== 'aguardando_aprovacao') {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: `Transição inválida a partir de ${atual.status}.` });
    }
    const atualizada = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'cancelado', motivo },
    });
    return res.json({ ok: true, ordem: paraPublico(atualizada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao rejeitar:', e.message);
    return res.status(500).json({ error: 'Erro ao rejeitar ordem de compra' });
  }
});

// POST /api/purchase-orders/:id/enviar — marca como enviada ao fornecedor.
// Ação manual explícita: somente de compra_aprovada. Não compra, não paga,
// não acessa site de terceiros; apenas registra o envio manual.
router.post('/:id/enviar', requireAuth, async (req, res) => {
  try {
    const atual = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Ordem de compra não encontrada' });
    if (atual.status !== 'compra_aprovada') {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: `Transição inválida a partir de ${atual.status}.` });
    }
    const atualizada = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'enviado_ao_fornecedor' },
    });
    return res.json({ ok: true, ordem: paraPublico(atualizada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao marcar envio:', e.message);
    return res.status(500).json({ error: 'Erro ao marcar envio da ordem' });
  }
});

// POST /api/purchase-orders/:id/receber — confirma recebimento (manual).
// Somente de enviado_ao_fornecedor. Não debita nada automaticamente.
router.post('/:id/receber', requireAuth, async (req, res) => {
  try {
    const atual = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Ordem de compra não encontrada' });
    if (atual.status !== 'enviado_ao_fornecedor') {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: `Transição inválida a partir de ${atual.status}.` });
    }
    const atualizada = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'recebido' },
    });
    await auditar('purchase.received', atualizada, req);
    return res.json({ ok: true, ordem: paraPublico(atualizada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao confirmar recebimento:', e.message);
    return res.status(500).json({ error: 'Erro ao confirmar recebimento' });
  }
});

// PATCH /api/purchase-orders/:id/rastreio — salva código (sem reenviar; idempotente).
router.patch('/:id/rastreio', requireAuth, async (req, res) => {
  const codigo = String(req.body?.codigo || '').trim();
  if (codigo.length < 3) {
    return res.status(400).json({ code: 'INVALID_TRACKING', message: 'Informe o código de rastreio.' });
  }
  try {
    const atual = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Ordem de compra não encontrada' });
    if (atual.status === 'cancelado') {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: 'Ordem cancelada não recebe rastreio.' });
    }
    if (atual.rastreio === codigo) {
      return res.json({ ok: true, ordem: paraPublico(atual), jaExistia: true });
    }
    const atualizada = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { rastreio: codigo },
    });
    return res.json({ ok: true, ordem: paraPublico(atualizada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao salvar rastreio:', e.message);
    return res.status(500).json({ error: 'Erro ao salvar rastreio' });
  }
});

// POST /api/purchase-orders/:id/vincular-envio — conciliação com envio real do ML.
// Lê o envio oficial (somente leitura, sem aprovação) e grava na OC:
// mlShipmentId, mlStatus e rastreio (somente se a OC ainda não tiver um).
// Sem token ML válido, responde 401 sem alterar nada.
router.post('/:id/vincular-envio', requireAuth, async (req, res) => {
  const shipmentId = String(req.body?.shipmentId || '').trim();
  if (!shipmentId) {
    return res.status(400).json({ code: 'INVALID_SHIPMENT', message: 'Informe o identificador do envio.' });
  }
  try {
    const atual = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!atual) return res.status(404).json({ error: 'Ordem de compra não encontrada' });
    if (atual.status === 'cancelado') {
      return res.status(409).json({ code: 'INVALID_TRANSITION', message: 'Ordem cancelada não recebe vínculo de envio.' });
    }
    const token = await mlOAuth.getValidAccessToken(req.empresaId);
    if (!token) {
      return res.status(401).json({ error: 'Conta do Mercado Livre não conectada' });
    }
    let envio;
    try {
      envio = await lerEnvio(token, shipmentId);
    } catch (e) {
      return res.status(502).json({ error: 'Falha ao ler o envio no Mercado Livre', detail: e?.message ?? null });
    }
    const atualizada = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        mlShipmentId: envio?.id ?? shipmentId,
        mlStatus: envio?.status ?? null,
        rastreio: atual.rastreio ?? envio?.trackingNumber ?? null,
      },
    });
    return res.json({ ok: true, ordem: paraPublico(atualizada) });
  } catch (e) {
    console.error('[PurchaseOrders] Erro ao vincular envio:', e.message);
    return res.status(500).json({ error: 'Erro ao vincular envio' });
  }
});

export default router;
