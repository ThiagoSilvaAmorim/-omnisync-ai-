// backend/src/routes/products.js
// Rotas para CRUD completo de produtos

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { mlOAuth } from '../services/mlOAuth.js';
import { usuarioDoRequest } from '../auth.js';

const router = Router();

// GET /api/produtos
// Lista produtos com filtros opcionais
router.get('/', async (req, res) => {
  try {
    const { categoria, status, busca, page = 1, limit = 20 } = req.query;
    const where = {};

    if (categoria) where.categoria = categoria;
    if (status) where.status = status;
    if (busca) where.OR = [{ nome: { contains: busca } }, { sku: { contains: busca } }];

    const [produtos, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ produtos, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error('[ProductRoutes] Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// GET /api/produtos/destaque
router.get('/destaque', async (_req, res) => {
  // Retorna produto em destaque (mock ou primeiro ativo)
  const produto = await prisma.product.findFirst({
    where: { status: 'ativo' },
    orderBy: { id: 'asc' },
  });
  res.json(produto || { nome: 'Nenhum produto em destaque', sku: '', preco: 0 });
});

// ---- Busca de Produtos MercadoLivre via backend proxy ----
// Registrada ANTES de /:id, senão ":id" engole "mercadolibre".
function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

router.get('/mercadolibre', requireAuth, async (req, res) => {
  try {
    const { q = 'notebook', limit = 12 } = req.query;
    const accessToken = await mlOAuth.getValidAccessToken(req.empresaId);
    if (!accessToken) {
      return res.status(401).json({ error: 'Conta do Mercado Livre não conectada', mensagem: 'Conecte sua conta na aba de Integrações', code: 'ML_NOT_CONNECTED' });
    }
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const encode = v => encodeURIComponent(v);

    // 1ª tentativa: busca de anúncios (preço/vendas/link). Pode devolver 403
    // para apps sem permissão — daí o fallback para o catálogo oficial.
    let resposta = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encode(q)}&limit=${limit}`, { headers });
    let anuncios = resposta.ok;
    let mlData = null;

    if (anuncios) {
      mlData = await resposta.json();
    } else {
      resposta = await fetch(`https://api.mercadolibre.com/products/search?site_id=MLB&q=${encode(q)}&limit=${limit}`, { headers });
      if (!resposta.ok) {
        const errorBody = await resposta.json().catch(() => ({}));
        console.error('[ML_DEBUG] ML API error:', resposta.status, errorBody.message || errorBody);
        return res.status(resposta.status).json({ error: 'Erro ao buscar produtos no Mercado Livre', mensagem: 'Verifique sua conexão na aba de Integrações.' });
      }
      mlData = await resposta.json();
    }

    let produtos;
    if (anuncios) {
      produtos = (mlData.results || []).map(p => ({
        id: `ml-${p.id}`, nome: p.title, preco: p.price, moeda: 'BRL',
        imagem: p.thumbnail?.replace('http://', 'https://'),
        categoria: p.category_id || 'Mercado Livre', marca: p.seller?.nickname || 'Mercado Livre',
        avaliacao: null, vendidos: Number(p.sold_quantity) || 0, link: p.permalink, origem: 'Mercado Livre',
      }));
    } else {
      // Catálogo oficial do ML: foto real, sem preço/vendas de anúncio.
      produtos = (mlData.results || []).map(p => {
        const marca = (p.attributes || []).find(a => a.id === 'BRAND')?.value_name;
        const imagem = p.pictures?.[0]?.url || null;
        return {
          id: `ml-${p.id}`, nome: p.name, preco: null, moeda: 'BRL',
          imagem: imagem ? imagem.replace('http://', 'https://') : null,
          categoria: p.domain_id || 'Mercado Livre', marca: marca || 'Mercado Livre',
          avaliacao: null, vendidos: 0, link: null, origem: 'Mercado Livre (catálogo)',
        };
      });
    }
    res.json({ produtos, total: mlData.paging?.total || produtos.length, q, fonte: anuncios ? 'anuncios' : 'catalogo' });
  } catch (error) {
    console.error('[ML_DEBUG] ERROR:', error.message);
    res.status(500).json({ error: 'Erro na busca de produtos', mensagem: 'Falha ao buscar produtos no Mercado Livre.' });
  }
});

// GET /api/produtos/:id
router.get('/:id', async (req, res) => {
  try {
    const produto = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
    });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(produto);
  } catch (error) {
    console.error('[ProductRoutes] Erro ao buscar produto:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// POST /api/produtos
router.post('/', async (req, res) => {
  try {
    const { nome, sku, categoria, preco, estoque, status, minimo, fornecedor } = req.body;

    if (!nome || !sku || !categoria) {
      return res.status(400).json({ error: 'Campos nome, sku e categoria são obrigatórios' });
    }

    const produto = await prisma.product.create({
      data: {
        nome,
        sku,
        categoria,
        preco: Number(preco) || 0,
        estoque: Number(estoque) || 0,
        status: status || 'ativo',
        minimo: Number(minimo) || 0,
        fornecedor: fornecedor || '',
      },
    });
    res.status(201).json(produto);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'SKU já cadastrado' });
    }
    console.error('[ProductRoutes] Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// PUT /api/produtos/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, sku, categoria, preco, estoque, status, minimo, fornecedor } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    const produto = await prisma.product.update({
      where: { id },
      data: {
        nome: nome ?? existing.nome,
        sku: sku ?? existing.sku,
        categoria: categoria ?? existing.categoria,
        preco: preco !== undefined ? Number(preco) : existing.preco,
        estoque: estoque !== undefined ? Number(estoque) : existing.estoque,
        status: status ?? existing.status,
        minimo: minimo !== undefined ? Number(minimo) : existing.minimo,
        fornecedor: fornecedor ?? existing.fornecedor,
      },
    });
    res.json(produto);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'SKU já cadastrado' });
    }
    console.error('[ProductRoutes] Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /api/produtos/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    await prisma.product.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('[ProductRoutes] Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// GET /api/produtos/:id/estoque
// Retorna o estoque atual de um produto
router.get('/:id/estoque', async (req, res) => {
  try {
    const produto = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      select: { id: true, nome: true, sku: true, estoque: true, minimo: true },
    });
    if (!produto) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(produto);
  } catch (error) {
    console.error('[ProductRoutes] Erro ao buscar estoque:', error);
    res.status(500).json({ error: 'Erro ao buscar estoque' });
  }
});

// PUT /api/produtos/:id/estoque
// Atualiza a quantidade em estoque de um produto
router.put('/:id/estoque', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { estoque } = req.body;

    if (estoque === undefined || typeof estoque !== 'number') {
      return res.status(400).json({ error: 'Campo estoque (número) é obrigatório' });
    }

    if (estoque < 0) {
      return res.status(400).json({ error: 'Estoque não pode ser negativo' });
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    const produto = await prisma.product.update({
      where: { id },
      data: { estoque },
    });
    res.json(produto);
  } catch (error) {
    console.error('[ProductRoutes] Erro ao atualizar estoque:', error);
    res.status(500).json({ error: 'Erro ao atualizar estoque' });
  }
});

export default router;