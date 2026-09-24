// backend/src/routes/catalogProducts.js
// Produtos do catálogo de fornecedores (aba Produtos da tela /fornecedores).
// GET /api/products?q=&uf=&niche=&category=&page=&limit= → { items, total, categorias }
// Diferente de /api/produtos (estoque interno, model Product).

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';

const router = Router();
const LIMITE_PADRAO = 24;
const LIMITE_MAXIMO = 48;

const ufsValidas = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

const querySchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  uf: z.string().trim().transform(v => v.toUpperCase()).refine(v => v === '' || ufsValidas.has(v), 'UF inválida').optional().default(''),
  niche: z.string().trim().max(60).optional().default(''),
  category: z.string().trim().max(60).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).optional().default(LIMITE_PADRAO),
});

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

router.use(requireAuth);

// GET /api/products — busca no catálogo, unindo o filtro de UF via fornecedor.
router.get('/', async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_QUERY', message: parsed.error.issues[0]?.message || 'Parâmetros inválidos.' });
  }
  const { q, uf, niche, category, page, limit } = parsed.data;

  const base = { supplier: { acceptsDropshipping: true } };
  if (uf) base.supplier.uf = uf;
  if (niche) base.niche = { equals: niche, mode: 'insensitive' };
  if (q) {
    base.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { niche: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { supplier: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const where = category ? { ...base, category: { equals: category, mode: 'insensitive' } } : base;

  try {
    const [itens, total, agrupadas] = await Promise.all([
      prisma.catalogProduct.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { supplier: { select: { slug: true, name: true, uf: true, city: true } } },
      }),
      prisma.catalogProduct.count({ where }),
      // Categorias do conjunto filtrado (sem o filtro de categoria) p/ o select.
      prisma.catalogProduct.groupBy({
        by: ['category'],
        where: base,
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
    ]);
    const items = itens.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      imageUrl: p.imageUrl,
      costPrice: p.costPrice,
      niche: p.niche,
      category: p.category,
      supplier: { slug: p.supplier.slug, name: p.supplier.name, uf: p.supplier.uf, city: p.supplier.city },
    }));
    const categorias = agrupadas
      .filter(a => a.category)
      .map(a => ({ category: a.category, total: a._count._all }));
    return res.json({ items, total, page, limit, categorias });
  } catch (e) {
    console.error('[CatalogProducts] Erro ao buscar:', e.message);
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

export default router;
