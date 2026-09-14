import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { emitEvent } from '../eventBus.js';

const router = Router();

async function auditar(type, payload, req) {
  try {
    await emitEvent(type, payload, 'api', { ator: req.authUser?.email || req.body?.usuario?.email || 'sistema' });
  } catch (e) {
    console.error('[Audit] Falha ao registrar evento (sem impacto na operação):', e.message);
  }
}

function calcularLucro({ total, custoFornecedor = 0, taxaMarketplace = 0, frete = 0 }) {
  const lucro = Number(total) - Number(custoFornecedor) - Number(taxaMarketplace) - Number(frete);
  const margem = Number(total) > 0 ? (lucro / Number(total)) * 100 : 0;
  return { lucro: Math.round(lucro * 100) / 100, margem: Math.round(margem * 100) / 100 };
}

// GET /api/pedidos — lista com filtros
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const [pedidos, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ pedidos, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('[OrderRoutes] Erro ao listar pedidos:', error);
    res.status(500).json({ error: 'Erro ao listar pedidos' });
  }
});

// GET /api/pedidos/:id — detalhe com lucro calculado
router.get('/:id', async (req, res) => {
  try {
    const pedido = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

    const { lucro, margem } = calcularLucro({
      total: pedido.total,
      custoFornecedor: pedido.custoFornecedor,
      taxaMarketplace: pedido.taxaMarketplace,
      frete: pedido.frete,
    });

    res.json({ ...pedido, lucro, margem });
  } catch (error) {
    console.error('[OrderRoutes] Erro ao buscar pedido:', error);
    res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
});

// POST /api/pedidos — cria pedido com cálculo de lucro automático
router.post('/', async (req, res) => {
  try {
    const {
      id,
      cliente,
      data,
      total,
      itens,
      status,
      custoFornecedor = 0,
      taxaMarketplace = 0,
      frete = 0,
      origem = 'manual',
    } = req.body;

    if (!id || !cliente) {
      return res.status(400).json({ error: 'Campos id e cliente são obrigatórios' });
    }

    const { lucro, margem } = calcularLucro({ total, custoFornecedor, taxaMarketplace, frete });

    const pedido = await prisma.order.create({
      data: {
        id,
        cliente,
        data: data || new Date().toISOString().slice(0, 10),
        total: Number(total) || 0,
        itens: Number(itens) || 1,
        status: status || 'pendente',
        custoFornecedor: Number(custoFornecedor) || 0,
        taxaMarketplace: Number(taxaMarketplace) || 0,
        frete: Number(frete) || 0,
        lucro,
        origem,
      },
    });

    await auditar('order.created', { id: pedido.id, cliente: pedido.cliente, total: pedido.total, lucro }, req);
    res.status(201).json({ ...pedido, margem });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'ID do pedido já existe' });
    }
    console.error('[OrderRoutes] Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

// PUT /api/pedidos/:id — atualiza e recalcula lucro
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Pedido não encontrado' });

    const {
      cliente,
      data,
      total,
      itens,
      status,
      custoFornecedor,
      taxaMarketplace,
      frete,
      origem,
    } = req.body;

    const dadosAtualizados = {
      cliente: cliente ?? existing.cliente,
      data: data ?? existing.data,
      total: total !== undefined ? Number(total) : existing.total,
      itens: itens !== undefined ? Number(itens) : existing.itens,
      status: status ?? existing.status,
      custoFornecedor: custoFornecedor !== undefined ? Number(custoFornecedor) : existing.custoFornecedor,
      taxaMarketplace: taxaMarketplace !== undefined ? Number(taxaMarketplace) : existing.taxaMarketplace,
      frete: frete !== undefined ? Number(frete) : existing.frete,
      origem: origem ?? existing.origem,
    };

    const { lucro, margem } = calcularLucro({
      total: dadosAtualizados.total,
      custoFornecedor: dadosAtualizados.custoFornecedor,
      taxaMarketplace: dadosAtualizados.taxaMarketplace,
      frete: dadosAtualizados.frete,
    });

    dadosAtualizados.lucro = lucro;

    const pedido = await prisma.order.update({
      where: { id },
      data: dadosAtualizados,
    });

    await auditar('order.updated', { id, antes: { lucro: existing.lucro }, depois: { lucro } }, req);
    res.json({ ...pedido, margem });
  } catch (error) {
    console.error('[OrderRoutes] Erro ao atualizar pedido:', error);
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
});

// DELETE /api/pedidos/:id
router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Pedido não encontrado' });

    await prisma.order.delete({ where: { id: req.params.id } });
    await auditar('order.deleted', { id: req.params.id, cliente: existing.cliente }, req);
    res.json({ ok: true });
  } catch (e) {
    console.error('[OrderRoutes] Erro ao excluir pedido:', e.message);
    res.status(500).json({ error: 'Erro ao excluir pedido' });
  }
});

// POST /api/pedidos/lucro — calcula lucro sem persistir (preview)
router.post('/lucro', (req, res) => {
  const { total, custoFornecedor = 0, taxaMarketplace = 0, frete = 0 } = req.body;
  if (total === undefined) return res.status(400).json({ error: 'Campo total é obrigatório' });
  const { lucro, margem } = calcularLucro({ total, custoFornecedor, taxaMarketplace, frete });
  res.json({ lucro, margem });
});

// GET /api/pedidos/resumo/lucro — KPIs de lucro agregados
router.get('/resumo/lucro', async (_req, res) => {
  try {
    const pedidos = await prisma.order.findMany();
    const totalPedidos = pedidos.length;
    const faturamento = pedidos.reduce((a, p) => a + Number(p.total || 0), 0);
    const custoTotal = pedidos.reduce((a, p) => a + Number(p.custoFornecedor || 0), 0);
    const taxasTotal = pedidos.reduce((a, p) => a + Number(p.taxaMarketplace || 0), 0);
    const freteTotal = pedidos.reduce((a, p) => a + Number(p.frete || 0), 0);
    const lucroTotal = pedidos.reduce((a, p) => a + Number(p.lucro || 0), 0);
    const margemMedia = faturamento > 0 ? (lucroTotal / faturamento) * 100 : 0;

    res.json({
      totalPedidos,
      faturamento: Math.round(faturamento * 100) / 100,
      custoTotal: Math.round(custoTotal * 100) / 100,
      taxasTotal: Math.round(taxasTotal * 100) / 100,
      freteTotal: Math.round(freteTotal * 100) / 100,
      lucroTotal: Math.round(lucroTotal * 100) / 100,
      margemMedia: Math.round(margemMedia * 100) / 100,
    });
  } catch (error) {
    console.error('[OrderRoutes] Erro ao calcular resumo de lucro:', error);
    res.status(500).json({ error: 'Erro ao calcular resumo de lucro' });
  }
});

// ============================================
// FASE 1 — Captura MercadoLivre (LEITURA)
// Endpoint para sincronizar pedidos do ML (sem escrita por enquanto)
// ============================================

// POST /api/pedidos/sync/mercadolivre — busca pedidos no ML
router.post('/sync/mercadolivre', async (req, res) => {
  try {
    const { accessToken, sellerId, since } = req.body;

    if (!accessToken || !sellerId) {
      return res.status(400).json({ error: 'accessToken e sellerId são obrigatórios' });
    }

    // Chama a API real do MercadoLivre para buscar pedidos
    const mlResponse = await fetch('https://api.mercadolibre.com/orders/search', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      // Filtrar por data se fornecida
      // Em produção, seria: ?seller={sellerId}&access_token={accessToken}&date_created_from={since}
    });

    if (!mlResponse.ok) {
      const errorBody = await mlResponse.json();
      console.error('[OrderRoutes] Erro da API ML:', {
        status: mlResponse.status,
        statusText: mlResponse.statusText,
        errorBody,
      });
      return res.status(mlResponse.status).json({
        error: 'Erro ao buscar no Mercado Livre',
        details: errorBody.message || errorBody,
      });
    }

    const mlData = await mlResponse.json();

    // Transformar os dados do ML para o formato interno
    const pedidosML = mlData.results || [];
    const pedidosFormatados = pedidosML.map((pedido) => {
      const items = pedido.items || [];
      const custoTotal = items.reduce((acc, item) => {
        const custoUnitario = item.cost || 0;
        const quantidade = item.quantity || 1;
        return acc + (custoUnitario * quantidade);
      }, 0);

      return {
        id: `ML-${pedido.id}`,
        cliente: pedido.buyer?.nickname || 'Cliente MercadoLivre',
        data: pedido.date_created ? new Date(pedido.date_created).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        total: pedido.price,
        itens: items.length,
        status: pedido.status || 'pending',
        custoFornecedor: custoTotal,
        taxaMarketplace: pedido.categories && categories.includes('MLB') ? pedido.official_service_fee || 0 : 0,
        frete: pedido.shipping_cost || 0,
        origem: 'mercadolivre',
      };
    });

    res.json({
      ok: true,
      mensagem: 'Sincronização concluída',
      pedidos: pedidosFormatados,
      totalEncontrados: mlData.pagination?.total || pedidosML.length,
      dica: 'Use POST /api/pedidos para criar cada pedido com os dados retornados',
    });
  } catch (error) {
    console.error('[OrderRoutes] Erro na sincronização ML:', error);
    res.status(500).json({ error: 'Erro na sincronização com MercadoLivre' });
  }
});

export default router;