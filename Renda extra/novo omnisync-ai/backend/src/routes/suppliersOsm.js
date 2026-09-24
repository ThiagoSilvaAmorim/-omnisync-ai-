// backend/src/routes/suppliersOsm.js
// Base local de fornecedores públicos (OpenStreetMap).
// GET  /api/suppliers?q=&uf=&cidade=  → só banco (ILIKE), sem chamada externa.
// POST /api/suppliers/import-osm      → Nominatim + Overpass → upsert por osmId.
// GET  /api/suppliers/cidades?uf=     → cidades distintas já importadas.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { importarFornecedoresOsm } from '../services/osm.js';

const router = Router();
const MAX_RESULTADOS = 200;

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

function paraPublico(s) {
  return {
    id: s.id,
    osmId: s.osmId,
    nome: s.nome,
    categoria: s.categoria,
    endereco: s.endereco,
    cidade: s.cidade,
    uf: s.uf,
    telefone: s.telefone,
    site: s.site,
    lat: s.lat,
    lng: s.lng,
    fonte: s.fonte,
    createdAt: s.createdAt,
  };
}

router.use(requireAuth);

// GET /api/suppliers?q=&uf=&cidade= — busca local no banco.
router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const uf = String(req.query.uf || '').trim().toUpperCase();
  const cidade = String(req.query.cidade || '').trim();

  const where = {};
  if (uf) where.uf = uf;
  if (cidade) where.cidade = { equals: cidade, mode: 'insensitive' };
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: 'insensitive' } },
      { endereco: { contains: q, mode: 'insensitive' } },
      { categoria: { contains: q, mode: 'insensitive' } },
    ];
  }

  try {
    const lista = await prisma.supplier.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: MAX_RESULTADOS,
    });
    return res.json({ ok: true, fonte: 'OpenStreetMap', total: lista.length, fornecedores: lista.map(paraPublico) });
  } catch (e) {
    console.error('[SuppliersOSM] Erro ao buscar:', e.message);
    return res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
});

// GET /api/suppliers/cidades?uf=SP — cidades distintas já na base local.
router.get('/cidades', async (req, res) => {
  const uf = String(req.query.uf || '').trim().toUpperCase();
  if (!uf) {
    return res.status(400).json({ code: 'INVALID_UF', message: 'Informe a UF.' });
  }
  try {
    const linhas = await prisma.supplier.groupBy({ by: ['cidade'], where: { uf, cidade: { not: null } }, orderBy: { cidade: 'asc' } });
    const cidades = linhas.map(l => l.cidade).filter(Boolean);
    return res.json({ ok: true, cidades });
  } catch (e) {
    console.error('[SuppliersOSM] Erro ao listar cidades:', e.message);
    return res.status(500).json({ error: 'Erro ao listar cidades' });
  }
});

// POST /api/suppliers/import-osm — importa do OpenStreetMap e faz upsert.
router.post('/import-osm', async (req, res) => {
  const b = req.body || {};
  const uf = String(b.uf || '').trim().toUpperCase();
  const cidade = String(b.cidade || '').trim();
  const categoria = b.categoria ? String(b.categoria).trim() : null;

  if (uf.length !== 2) {
    return res.status(400).json({ code: 'INVALID_UF', message: 'Informe a UF (2 letras).' });
  }
  if (!cidade) {
    return res.status(400).json({ code: 'INVALID_CIDADE', message: 'Informe a cidade.' });
  }

  try {
    const { fornecedores, cacheado } = await importarFornecedoresOsm({ uf, cidade, categoria });

    let novos = 0;
    let atualizados = 0;
    for (const item of fornecedores) {
      const dados = {
        nome: item.nome,
        categoria: item.categoria,
        endereco: item.endereco,
        cidade: item.cidade || cidade,
        uf: item.uf || uf,
        telefone: item.telefone,
        site: item.site,
        lat: item.lat,
        lng: item.lng,
        fonte: 'osm',
      };
      const existente = item.osmId
        ? await prisma.supplier.findUnique({ where: { osmId: item.osmId } })
        : null;
      if (existente) {
        await prisma.supplier.update({ where: { id: existente.id }, data: dados });
        atualizados += 1;
      } else {
        await prisma.supplier.create({ data: { ...dados, osmId: item.osmId } });
        novos += 1;
      }
    }

    const lista = await prisma.supplier.findMany({
      where: { uf, ...(cidade ? { cidade: { equals: cidade, mode: 'insensitive' } } : {}) },
      orderBy: { nome: 'asc' },
      take: MAX_RESULTADOS,
    });

    return res.json({
      ok: true,
      fonte: 'OpenStreetMap',
      cacheado: !!cacheado,
      novos,
      atualizados,
      encontrados: fornecedores.length,
      mensagem: novos > 0
        ? `${novos} novo(s) fornecedor(es) encontrado(s).`
        : fornecedores.length > 0
          ? 'Fornecedores já estavam na base local.'
          : 'Nenhum fornecedor público encontrado para esse filtro no OpenStreetMap.',
      fornecedores: lista.map(paraPublico),
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
      console.error('[SuppliersOSM] Erro ao importar:', { code, message: e.message });
    }
    return res.status(status).json({
      code,
      message: e.message || 'Não foi possível importar fornecedores do mapa agora.',
    });
  }
});

export default router;
