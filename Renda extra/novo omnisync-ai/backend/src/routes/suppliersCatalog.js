// backend/src/routes/suppliersCatalog.js
// Catálogo de fornecedores (tela /fornecedores).
// GET  /api/suppliers?q=&uf=&niche=&page=&limit= → { items, total }
// GET  /api/suppliers/niches                     → { niches }
// GET  /api/suppliers/:slug                      → fornecedor + produtos
// GET  /api/suppliers/cidades?uf=                → { cidades }  (legado UI antiga)
// POST /api/suppliers/import-osm                 → Nominatim + Overpass (base própria)

import { Router } from 'express';
import { z } from 'zod';
import { lookup } from 'node:dns/promises';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { importarFornecedoresOsm } from '../services/osm.js';
import { buscarCnpj, formatarCnpj, descreverFornecedor } from '../services/brasilApi.js';

const router = Router();
const LIMITE_PADRAO = 24;
const LIMITE_MAXIMO = 48;

const ufsValidas = new Set([
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]);

const queryCatalogoSchema = z.object({
  q: z.string().trim().max(120).optional().default(''),
  uf: z.string().trim().transform(v => v.toUpperCase()).refine(v => v === '' || ufsValidas.has(v), 'UF inválida').optional().default(''),
  niche: z.string().trim().max(60).optional().default(''),
  cidade: z.string().trim().max(80).optional().default(''),
  order: z.enum(['', 'score', 'nome']).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(LIMITE_MAXIMO).optional().default(LIMITE_PADRAO),
});

const queryCidadesSchema = z.object({
  uf: z.string().trim().transform(v => v.toUpperCase()).refine(v => v === '' || ufsValidas.has(v), 'UF inválida').optional().default(''),
});

const bodyImportSchema = z.object({
  uf: z.string().trim().transform(v => v.toUpperCase()).refine(v => ufsValidas.has(v), 'UF inválida (2 letras).'),
  cidade: z.string().trim().min(1, 'Informe a cidade.').max(80),
  categoria: z.string().trim().max(60).optional(),
});

const bodyCriaSchema = z.object({
  cnpj: z.string().trim().min(1, 'Informe o CNPJ.').max(20),
  niche: z.string().trim().max(60).optional().nullable(),
  siteUrl: z.string().trim().max(200).optional().nullable(),
  acceptsDropshipping: z.boolean().optional(),
  marketplaces: z.array(z.string().trim().max(40)).max(5).optional(),
});

// ---- Catálogo mostra só quem é de REVENDA ----
// Critérios com dados reais do banco: tem produto no catálogo,
// vende em marketplace (ML/Shopee/TikTok) ou é atacado (wholesale).
// Ex.: McKinsey/contabilidade (importados do OSM) ficam fora da lista.
// fonte=cnpj: cadastro manual com CNPJ da Receita é decisão do usuário
// (aparece mesmo ainda sem produtos, senão o cadastro novo ficaria invisível).
const filtroRevenda = {
  OR: [
    { products: { some: {} } },
    { marketplaces: { isEmpty: false } },
    { niche: 'wholesale' },
    { fonte: 'cnpj' },
  ],
};

// Mapeia erros do serviço BrasilAPI para status HTTP honestos.
const STATUS_ERRO_CNPJ = {
  CNPJ_INVALIDO: 400,
  CNPJ_NAO_ENCONTRADO: 404,
  CNPJ_DUPLICADO: 409,
  BRASILAPI_RATE_LIMIT: 429,
  BRASILAPI_TIMEOUT: 504,
  BRASILAPI_UNAVAILABLE: 502,
  BRASILAPI_FAILED: 502,
};

function responderErroCnpj(res, e, contexto) {
  const status = STATUS_ERRO_CNPJ[e.code] || 500;
  if (status >= 500) {
    console.error(`[SuppliersCatalog] ${contexto}:`, e.code || 'SEM_CODE', e.message);
  }
  return res.status(status).json({
    code: e.code || 'ERRO_CNPJ',
    message: e.message || 'Erro ao consultar o CNPJ.',
  });
}

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

function slugify(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function slugUnico(base, excluirId = null) {
  const raiz = slugify(base) || 'fornecedor';
  let candidato = raiz;
  let n = 2;
  for (;;) {
    const existente = await prisma.supplier.findUnique({ where: { slug: candidato }, select: { id: true } });
    if (!existente || existente.id === excluirId) return candidato;
    candidato = `${raiz}-${n}`;
    n += 1;
  }
}

// ---- Site do fornecedor: só expõe URL normalizada cujo domínio está vivo ----
// (evita clique em domínio morto: "não foi possível encontrar o servidor").
function normalizarSite(raw) {
  if (!raw) return null;
  const c = String(raw).trim();
  if (!c || /\s/.test(c)) return null;
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(c) ? c : `https://${c}`;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const TTL_SITE_MS = 30 * 60 * 1000;
const cacheSites = new Map();

async function siteVivo(raw) {
  const url = normalizarSite(raw);
  if (!url) return null;
  const host = new URL(url).hostname;
  const agora = Date.now();
  const hit = cacheSites.get(host);
  if (hit && hit.expira > agora) return hit.vivo ? url : null;
  let vivo = false;
  try {
    await lookup(host);
    vivo = true;
  } catch {
    vivo = false;
  }
  cacheSites.set(host, { vivo, expira: agora + TTL_SITE_MS });
  return vivo ? url : null;
}

// ---- Score de qualidade calculado só com dados REAIS do banco ----
// Critérios expostos no card (tooltip) — nada de nota inventada.
function calcularScore(s, siteNoAr) {
  const criterios = [
    { label: 'Site no ar', pontos: siteNoAr ? 30 : 0, max: 30 },
    { label: 'Aceita dropshipping', pontos: s.acceptsDropshipping ? 15 : 0, max: 15 },
    { label: 'Produtos no catálogo', pontos: s.productCount > 0 ? 15 : 0, max: 15 },
    { label: 'Logotipo', pontos: s.logoUrl ? 10 : 0, max: 10 },
    { label: 'Telefone', pontos: s.telefone ? 10 : 0, max: 10 },
    { label: 'Endereço/geolocalização', pontos: s.endereco || (s.lat != null && s.lng != null) ? 10 : 0, max: 10 },
    { label: 'Marketplaces', pontos: Array.isArray(s.marketplaces) && s.marketplaces.length > 0 ? 10 : 0, max: 10 },
  ];
  return { score: criterios.reduce((acc, c) => acc + c.pontos, 0), criterios };
}

async function paraPublico(s) {
  const site = await siteVivo(s.siteUrl);
  const { score, criterios } = calcularScore(s, Boolean(site));
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    logoUrl: s.logoUrl,
    coverImages: s.coverImages,
    uf: s.uf,
    city: s.city,
    niche: s.niche,
    siteUrl: site,
    productCount: s.productCount,
    marketplaces: s.marketplaces,
    acceptsDropshipping: s.acceptsDropshipping,
    score,
    scoreCriterios: criterios,
    // Dados reais da Receita (BrasilAPI) — cadastro por CNPJ.
    fonte: s.fonte,
    endereco: s.endereco || null,
    cnpj: formatarCnpj(s.cnpj),
    cnpjVerificado: Boolean(s.cnpj),
    razaoSocial: s.razaoSocial || null,
    situacaoCadastral: s.situacaoCadastral || null,
    abertoEm: s.abertoEm || null,
    cnae: s.cnae || null,
    cnaeDescricao: s.cnaeDescricao || null,
    capitalSocial: s.capitalSocial ?? null,
    descricao: s.cnpj
      ? descreverFornecedor({
        razaoSocial: s.razaoSocial,
        nomeFantasia: s.name,
        cnaeDescricao: s.cnaeDescricao,
        abertoEm: s.abertoEm,
        endereco: { city: s.city, uf: s.uf },
      })
      : null,
  };
}

function paraPublicoProduto(p) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    imageUrl: p.imageUrl,
    costPrice: p.costPrice,
    niche: p.niche,
    supplier: p.supplier ? { slug: p.supplier.slug, name: p.supplier.name, uf: p.supplier.uf, city: p.supplier.city } : null,
  };
}

router.use(requireAuth);

// GET /api/suppliers/niches — lista distinta de nichos do catálogo.
router.get('/niches', async (_req, res) => {
  try {
    const linhas = await prisma.supplier.findMany({
      where: { niche: { not: null }, ...filtroRevenda },
      distinct: ['niche'],
      orderBy: { niche: 'asc' },
      select: { niche: true },
    });
    return res.json({ niches: linhas.map(l => l.niche).filter(Boolean) });
  } catch (e) {
    console.error('[SuppliersCatalog] Erro ao listar niches:', e.message);
    return res.status(500).json({ error: 'Erro ao listar nichos' });
  }
});

// GET /api/suppliers/cidades?uf=SP — cidades distintas com contagem (filtro + ranking).
router.get('/cidades', async (req, res) => {
  const parsed = queryCidadesSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_UF', message: parsed.error.issues[0]?.message || 'UF inválida.' });
  }
  try {
    const where = { ...filtroRevenda, ...(parsed.data.uf ? { uf: parsed.data.uf } : {}) };
    const linhas = await prisma.supplier.groupBy({ by: ['city'], where, orderBy: { city: 'asc' }, _count: { _all: true } });
    const cidades = linhas
      .filter(l => l.city)
      .map(l => ({ city: l.city, total: l._count._all }))
      .sort((a, b) => b.total - a.total || a.city.localeCompare(b.city));
    return res.json({ ok: true, cidades });
  } catch (e) {
    console.error('[SuppliersCatalog] Erro ao listar cidades:', e.message);
    return res.status(500).json({ error: 'Erro ao listar cidades' });
  }
});

// GET /api/suppliers?q=&uf=&niche=&cidade=&order=&page=&limit= — busca no banco (sem chave externa).
router.get('/', async (req, res) => {
  const parsed = queryCatalogoSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ code: 'INVALID_QUERY', message: parsed.error.issues[0]?.message || 'Parâmetros inválidos.' });
  }
  const { q, uf, niche, cidade, order, page, limit } = parsed.data;

  // filtroRevenda via AND para não colidir com o OR da busca textual (q).
  const where = { acceptsDropshipping: true, AND: [filtroRevenda] };
  if (uf) where.uf = uf;
  if (niche) where.niche = { equals: niche, mode: 'insensitive' };
  if (cidade) where.city = { equals: cidade, mode: 'insensitive' };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { niche: { contains: q, mode: 'insensitive' } },
    ];
  }

  try {
    // order=score: o ranking é calculado em memória (score depende de dados
    // combinados do fornecedor) — paginação por fatiamento do conjunto completo.
    if (order === 'score') {
      const todos = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, take: 500 });
      const publicos = await Promise.all(todos.map(paraPublico));
      publicos.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
      const items = publicos.slice((page - 1) * limit, page * limit);
      return res.json({ items, total: publicos.length, page, limit });
    }

    const [itens, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);
    return res.json({ items: await Promise.all(itens.map(paraPublico)), total, page, limit });
  } catch (e) {
    console.error('[SuppliersCatalog] Erro ao buscar:', e.message);
    return res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
});

// GET /api/suppliers/cnpj/:cnpj — preview dos dados reais da Receita
// (BrasilAPI) antes de criar o fornecedor. Não grava nada.
router.get('/cnpj/:cnpj', async (req, res) => {
  try {
    const dados = await buscarCnpj(req.params.cnpj);
    const existente = await prisma.supplier.findUnique({
      where: { cnpj: dados.cnpj },
      select: { slug: true, name: true },
    });
    return res.json({
      ok: true,
      dados: { ...dados, cnpj: formatarCnpj(dados.cnpj) },
      descricao: descreverFornecedor(dados),
      jaCadastrado: existente ? { slug: existente.slug, name: existente.name } : null,
    });
  } catch (e) {
    return responderErroCnpj(res, e, 'Preview de CNPJ');
  }
});

// GET /api/suppliers/:slug — detalhe do fornecedor com o catálogo dele.
router.get('/:slug', async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  if (!slug || slug.length > 140) {
    return res.status(400).json({ code: 'INVALID_SLUG', message: 'Slug inválido.' });
  }
  try {
    const fornecedor = await prisma.supplier.findUnique({
      where: { slug },
      include: { products: { orderBy: { name: 'asc' } } },
    });
    if (!fornecedor || !fornecedor.acceptsDropshipping) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }
    return res.json({ fornecedor: await paraPublico(fornecedor), produtos: fornecedor.products.map(paraPublicoProduto) });
  } catch (e) {
    console.error('[SuppliersCatalog] Erro ao buscar fornecedor:', e.message);
    return res.status(500).json({ error: 'Erro ao buscar fornecedor' });
  }
});

// POST /api/suppliers — cadastra fornecedor a partir de CNPJ real
// (Receita via BrasilAPI): nome fantasia/razão social, endereço e
// fonte='cnpj'. CNPJ repetido → 409.
router.post('/', async (req, res) => {
  const parsed = bodyCriaSchema.safeParse(req.body || {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({ code: 'INVALID_BODY', message: issue?.message || 'Parâmetros inválidos.' });
  }

  try {
    const dados = await buscarCnpj(parsed.data.cnpj);

    const existente = await prisma.supplier.findUnique({
      where: { cnpj: dados.cnpj },
      select: { slug: true, name: true },
    });
    if (existente) {
      return res.status(409).json({
        code: 'CNPJ_DUPLICADO',
        message: `CNPJ já cadastrado como "${existente.name}".`,
        slug: existente.slug,
      });
    }

    const uf = dados.endereco?.uf || null;
    const city = dados.endereco?.city || null;
    if (!uf || !city || !ufsValidas.has(uf)) {
      return res.status(422).json({
        code: 'CNPJ_SEM_ENDERECO',
        message: 'O cadastro da Receita não tem município/UF completo para este CNPJ.',
      });
    }

    const nome = String(dados.nomeFantasia || dados.razaoSocial || 'Fornecedor sem nome').trim();
    const partesEndereco = [
      [dados.endereco.logradouro, dados.endereco.numero].filter(Boolean).join(', '),
      dados.endereco.bairro,
    ].filter(Boolean).join(' - ');

    const slug = await slugUnico(nome);
    const linha = await prisma.supplier.create({
      data: {
        name: nome,
        slug,
        uf,
        city,
        endereco: partesEndereco || null,
        siteUrl: parsed.data.siteUrl || null,
        niche: parsed.data.niche || null,
        acceptsDropshipping: parsed.data.acceptsDropshipping ?? true,
        marketplaces: parsed.data.marketplaces || [],
        fonte: 'cnpj',
        cnpj: dados.cnpj,
        razaoSocial: dados.razaoSocial,
        situacaoCadastral: dados.situacaoCadastral,
        abertoEm: dados.abertoEm,
        cnae: dados.cnae,
        cnaeDescricao: dados.cnaeDescricao,
        capitalSocial: dados.capitalSocial,
      },
    });

    return res.status(201).json({ ok: true, fornecedor: await paraPublico(linha) });
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ code: 'CNPJ_DUPLICADO', message: 'CNPJ já cadastrado.' });
    }
    return responderErroCnpj(res, e, 'Criação por CNPJ');
  }
});

// POST /api/suppliers/import-osm — importa do OpenStreetMap e faz upsert.
router.post('/import-osm', async (req, res) => {
  const parsed = bodyImportSchema.safeParse(req.body || {});
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const code = issue?.path?.[0] === 'uf' ? 'INVALID_UF' : 'INVALID_CIDADE';
    return res.status(400).json({ code, message: issue?.message || 'Parâmetros inválidos.' });
  }
  const { uf, cidade, categoria = null } = parsed.data;

  try {
    const { fornecedores, cacheado } = await importarFornecedoresOsm({ uf, cidade, categoria });

    let novos = 0;
    let atualizados = 0;
    for (const item of fornecedores) {
      const existente = item.osmId
        ? await prisma.supplier.findUnique({ where: { osmId: item.osmId } })
        : null;
      const nome = item.nome || 'Fornecedor sem nome';
      const dados = {
        name: nome,
        niche: item.categoria || null,
        endereco: item.endereco,
        city: item.cidade || cidade,
        uf: item.uf || uf,
        telefone: item.telefone,
        siteUrl: item.site,
        lat: item.lat,
        lng: item.lng,
        fonte: 'osm',
      };
      if (existente) {
        await prisma.supplier.update({ where: { id: existente.id }, data: dados });
        atualizados += 1;
      } else {
        const slug = await slugUnico(nome);
        await prisma.supplier.create({ data: { ...dados, slug, osmId: item.osmId } });
        novos += 1;
      }
    }

    const where = { uf, ...(cidade ? { city: { equals: cidade, mode: 'insensitive' } } : {}) };
    const [lista, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, take: LIMITE_MAXIMO * 5 }),
      prisma.supplier.count({ where }),
    ]);

    return res.json({
      ok: true,
      fonte: 'OpenStreetMap',
      cacheado: !!cacheado,
      novos,
      atualizados,
      encontrados: fornecedores.length,
      total,
      mensagem: novos > 0
        ? `${novos} novo(s) fornecedor(es) encontrado(s).`
        : fornecedores.length > 0
          ? 'Fornecedores já estavam na base local.'
          : 'Nenhum fornecedor público encontrado para esse filtro no OpenStreetMap.',
      items: await Promise.all(lista.map(paraPublico)),
    });
  } catch (e) {
    const code = e.code || 'OSM_IMPORT_FAILED';
    const mapa = {
      OSM_TIMEOUT: 504,
      OSM_RATE_LIMIT: 429,
      OSM_UNAVAILABLE: 502,
      CITY_NOT_FOUND: 422,
    };
    const status = mapa[code] || 502;
    if (status >= 500) {
      console.error('[SuppliersCatalog] Erro ao importar:', { code, message: e.message });
    }
    return res.status(status).json({
      code,
      message: e.message || 'Não foi possível importar fornecedores do mapa agora.',
    });
  }
});

export default router;
