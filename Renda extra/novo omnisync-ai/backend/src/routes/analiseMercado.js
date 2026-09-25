// backend/src/routes/analiseMercado.js
// Análise de Mercado — SOMENTE API oficial do Mercado Livre (sem scrape).
// POST /api/analise-mercado { termo }               → análise (cache 6h)
// GET  /api/analise-mercado/:id                     → resultado (vendasMes desc, nulls last)
// GET  /api/analise-mercado/posicionamento?termo=&produtoId= → posição nos 50 primeiros
//
// Fonte = catálogo (/products/search): a busca de anúncios responde 403 para a
// credencial, então vendas/preço/reputação/frete não existem e ficam null ("—").

import { Router } from 'express';
import { prisma } from '../prisma/client.js';
import { usuarioDoRequest } from '../auth.js';
import { mlOAuth } from '../services/mlOAuth.js';
import {
  buscarCatalogo,
  detalharProdutos,
  diasDesde,
  extrairMarca,
  primeiraImagem,
  precoCatalogo,
} from '../services/mlCatalogo.js';

const router = Router();

const CACHE_HORAS = 6;
const ITENS_BUSCA = 20;
const ITENS_POSICIONAMENTO = 50;

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  req.empresaId = user.empresaId || 1;
  next();
}

function normalizarTermo(termo) {
  return String(termo ?? '').trim().replace(/\s+/g, ' ');
}

function termoValido(termo) {
  const t = normalizarTermo(termo);
  return t.length >= 2 && t.length <= 80;
}

async function tokenDaEmpresa(req, res) {
  const token = await mlOAuth.getValidAccessToken(req.empresaId);
  if (!token) {
    res.status(401).json({ error: 'Conta do Mercado Livre não conectada' });
    return null;
  }
  return token;
}

function paraPublico(analise) {
  return {
    id: analise.id,
    termo: analise.termo,
    fonte: analise.fonte,
    totalResultados: analise.totalResultados,
    criadaEm: analise.criadaEm,
    expiraEm: analise.expiraEm,
    itens: (analise.itens || []).map(i => ({
      ordem: i.ordem,
      produtoId: i.produtoId,
      nome: i.nome,
      marca: i.marca,
      status: i.status,
      dominio: i.dominio,
      imagemUrl: i.imagemUrl,
      permalink: i.permalink,
      criadoEm: i.criadoEm,
      diasNoAr: i.diasNoAr,
      preco: i.preco,
      vendasMes: i.vendasMes,
      vendasDia: i.vendasDia,
      freteGratis: i.freteGratis,
      reputacao: i.reputacao,
      fotos: i.fotos,
      variacoes: i.variacoes,
    })),
  };
}

function montarItens(resumo, detalhe) {
  const criadoIso = resumo?.date_created || detalhe?.date_created || null;
  const fonteMarca = detalhe || resumo;
  return {
    produtoId: String(resumo?.id || detalhe?.id || ''),
    nome: String(resumo?.name || detalhe?.name || '').trim() || String(resumo?.id || ''),
    marca: extrairMarca(fonteMarca),
    status: resumo?.status || detalhe?.status || null,
    dominio: resumo?.domain_id || detalhe?.domain_id || null,
    imagemUrl: primeiraImagem(detalhe),
    permalink: detalhe?.permalink || null,
    criadoEm: criadoIso ? new Date(criadoIso) : null,
    diasNoAr: diasDesde(criadoIso),
    preco: precoCatalogo(detalhe),
    vendasMes: null,
    vendasDia: null,
    freteGratis: null,
    reputacao: null,
    fotos: Array.isArray(detalhe?.pictures) ? detalhe.pictures.length : Array.isArray(resumo?.pictures) ? resumo.pictures.length : 0,
    variacoes: Array.isArray(detalhe?.children_ids) ? detalhe.children_ids.length : Array.isArray(resumo?.children_ids) ? resumo.children_ids.length : 0,
  };
}

function responderErro(res, e) {
  const status = Number(e?.status) || 500;
  const body = { error: e?.message || 'Falha na análise.' };
  if (e?.code) body.code = e.code;
  return res.status(status).json(body);
}

// GET /posicionamento — ANTES de /:id (senão ":id" captura a rota).
// Em qual posição dos 50 primeiros resultados do catálogo aparece um produto?
router.get('/posicionamento', requireAuth, async (req, res) => {
  const termo = normalizarTermo(req.query?.termo);
  const produtoId = String(req.query?.produtoId || '').trim().toUpperCase();
  if (!termoValido(termo)) {
    return res.status(400).json({ error: 'Informe um termo de busca (2 a 80 caracteres).', code: 'INVALID_TERM' });
  }
  if (!/^MLB[A-Z0-9]+$/.test(produtoId)) {
    return res.status(400).json({ error: 'Informe um ID de produto MLB válido.', code: 'INVALID_PRODUCT_ID' });
  }
  try {
    const token = await tokenDaEmpresa(req, res);
    if (!token) return;
    const { resultados, total } = await buscarCatalogo(token, termo, { limit: ITENS_POSICIONAMENTO });
    const indice = resultados.findIndex(r => String(r?.id || '').toUpperCase() === produtoId);
    const posicao = indice >= 0 ? indice + 1 : null;
    return res.json({
      ok: true,
      termo,
      produtoId,
      encontrado: posicao !== null,
      posicao,
      posicoesVerificadas: resultados.length,
      total,
      fonte: 'catalogo_ml',
    });
  } catch (e) {
    console.error('[AnaliseMercado] Erro no posicionamento:', e.message);
    return responderErro(res, e);
  }
});

// POST / — cria análise do termo (ou devolve cache vigente de até 6h).
router.post('/', requireAuth, async (req, res) => {
  const termo = normalizarTermo(req.body?.termo);
  if (!termoValido(termo)) {
    return res.status(400).json({ error: 'Informe um termo de busca (2 a 80 caracteres).', code: 'INVALID_TERM' });
  }
  const chave = termo.toLowerCase();
  try {
    const cache = await prisma.analiseMercado.findFirst({
      where: { chave, empresaId: req.empresaId, expiraEm: { gt: new Date() } },
      include: { itens: { orderBy: { ordem: 'asc' } } },
      orderBy: { criadaEm: 'desc' },
    });
    if (cache) return res.json({ ok: true, cached: true, analise: paraPublico(cache) });

    const token = await tokenDaEmpresa(req, res);
    if (!token) return;

    const { resultados, total } = await buscarCatalogo(token, termo, { limit: ITENS_BUSCA });
    const detalhes = await detalharProdutos(token, resultados.map(r => r.id));
    const itens = resultados
      .map((r, idx) => ({ ordem: idx + 1, ...montarItens(r, detalhes.get(r.id)) }))
      .filter(i => i.produtoId);

    const criada = await prisma.analiseMercado.create({
      data: {
        termo,
        chave,
        empresaId: req.empresaId,
        fonte: 'catalogo_ml',
        totalResultados: total,
        expiraEm: new Date(Date.now() + CACHE_HORAS * 3600 * 1000),
        itens: { create: itens },
      },
      include: { itens: { orderBy: { ordem: 'asc' } } },
    });
    return res.status(201).json({ ok: true, cached: false, analise: paraPublico(criada) });
  } catch (e) {
    console.error('[AnaliseMercado] Erro ao analisar termo:', e.message);
    return responderErro(res, e);
  }
});

// GET /:id — resultado salvo; itens ordenados por vendasMes desc (sem dado → last).
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const analise = await prisma.analiseMercado.findUnique({
      where: { id },
      include: {
        itens: { orderBy: [{ vendasMes: { sort: 'desc', nulls: 'last' } }, { ordem: 'asc' }] },
      },
    });
    if (!analise || analise.empresaId !== req.empresaId) {
      return res.status(404).json({ error: 'Análise não encontrada' });
    }
    return res.json({ ok: true, analise: paraPublico(analise) });
  } catch (e) {
    console.error('[AnaliseMercado] Erro ao buscar análise:', e.message);
    return responderErro(res, e);
  }
});

export default router;
