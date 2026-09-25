// backend/src/routes/tendencias.js
// Tendências do Mercado Livre — SOMENTE API oficial (sem scrape).
// GET /api/tendencias?categoria=MLB1051&atualizar=1
//
// /trends/MLB[/{categoria}] exige token da conta conectada (403 sem token) e
// devolve [{ keyword, url }] — sem métricas por termo. A busca pública por
// termo (/sites/MLB/search) hoje responde 403 para a credencial: quando
// falha, o termo fica sem produto associado e o link clicável passa a ser a
// própria url oficial da trends. A lista nunca é quebrada por isso.
//
// Cache: varredura completa no máximo 1x por 24h (por categoria). `atualizar=1`
// força nova varredura ignorando o cache.

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { mlOAuth } from '../services/mlOAuth.js';

const router = Router();

const ML_API = 'https://api.mercadolibre.com';
const CACHE_HORAS = 24;
const LIMITE_TERMOS = 20;
const ATRASO_BUSCA_MS = 300;

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

// '' = geral (MLB); senão precisa ser id de categoria MLB123.
function normalizarCategoria(categoria) {
  const c = String(categoria ?? '').trim().toUpperCase();
  if (!c) return '';
  if (!/^MLB\d+$/.test(c)) return null;
  return c;
}

async function buscarTrends(token, categoria) {
  const url = categoria ? `${ML_API}/trends/MLB/${categoria}` : `${ML_API}/trends/MLB`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!r.ok) {
    const e = new Error(`Trends do Mercado Livre respondeu ${r.status}`);
    e.status = 502;
    e.code = 'ML_TRENDS_FAILED';
    throw e;
  }
  const data = await r.json().catch(() => null);
  if (!Array.isArray(data)) return [];
  return data
    .map(t => ({
      termo: String(t?.keyword ?? '').trim(),
      termoUrl: typeof t?.url === 'string' ? t.url : '',
    }))
    .filter(t => t.termo)
    .slice(0, LIMITE_TERMOS);
}

// Busca pública (sem token) do melhor anúncio pro termo. Qualquer falha
// (hoje: 403 para a credencial) vira "sem produto" — nunca derruba a lista.
async function buscarProdutoPorTermo(termo) {
  try {
    const url = `${ML_API}/sites/MLB/search?q=${encodeURIComponent(termo)}&limit=1`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    const it = Array.isArray(data?.results) ? data.results[0] : null;
    if (!it) return null;
    return {
      produtoTitulo: String(it.title ?? '').trim() || null,
      produtoImagem: it.thumbnail || it.secure_thumbnail || null,
      produtoPreco: typeof it.price === 'number' ? it.price : null,
      produtoLink: it.permalink || null,
    };
  } catch {
    return null;
  }
}

function paraPublico(linhas) {
  return {
    atualizadoEm: linhas[0]?.atualizadoEm || null,
    total: linhas.length,
    termos: linhas.map(l => ({
      ordem: l.ordem,
      termo: l.termo,
      termoUrl: l.termoUrl,
      produto: (l.produtoTitulo || l.produtoLink)
        ? {
          titulo: l.produtoTitulo,
          imagem: l.produtoImagem,
          preco: l.produtoPreco,
          link: l.produtoLink,
        }
        : null,
    })),
  };
}

router.get('/', requireAuth, async (req, res) => {
  const categoria = normalizarCategoria(req.query?.categoria);
  if (categoria === null) {
    return res.status(400).json({ error: 'Categoria inválida (use o id MLB123).', code: 'INVALID_CATEGORY' });
  }
  const atualizar = String(req.query?.atualizar ?? '') === '1';

  try {
    const salvas = await prisma.tendencia.findMany({
      where: { categoria },
      orderBy: { ordem: 'asc' },
    });
    const corte = Date.now() - CACHE_HORAS * 3600 * 1000;
    const cacheValido = !atualizar
      && salvas.length > 0
      && salvas.every(s => new Date(s.atualizadoEm).getTime() >= corte);
    if (cacheValido) {
      return res.json({ ok: true, cache: true, categoria: categoria || null, ...paraPublico(salvas) });
    }

    const token = await mlOAuth.getValidAccessToken(req.empresaId);
    if (!token) {
      return res.status(401).json({ error: 'Conta do Mercado Livre não conectada' });
    }

    const trends = await buscarTrends(token, categoria);
    const agora = new Date();
    const linhas = [];
    for (const [idx, t] of trends.entries()) {
      // Nunca em paralelo: respeita o ritmo da API de busca (>= 300ms entre chamadas).
      if (idx > 0) await new Promise(r => setTimeout(r, ATRASO_BUSCA_MS));
      const produto = await buscarProdutoPorTermo(t.termo);
      linhas.push({
        ordem: idx + 1,
        termo: t.termo,
        termoUrl: t.termoUrl,
        atualizadoEm: agora,
        ...(produto || {}),
      });
    }

    await prisma.$transaction([
      prisma.tendencia.deleteMany({ where: { categoria } }),
      ...(linhas.length > 0 ? [prisma.tendencia.createMany({ data: linhas })] : []),
    ]);
    return res.json({ ok: true, cache: false, categoria: categoria || null, ...paraPublico(linhas) });
  } catch (e) {
    console.error('[Tendencias] Erro ao montar lista:', e.message);
    const status = Number(e?.status) || 500;
    const body = { error: e?.message || 'Falha ao buscar tendências.' };
    if (e?.code) body.code = e.code;
    return res.status(status).json(body);
  }
});

export default router;
