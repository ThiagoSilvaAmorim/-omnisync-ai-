// backend/src/services/mlSync.js
// Sync inicial da conta Mercado Livre → tabela products (upsert por mlItemId).
// Dispara em background após o callback OAuth:
//   1) /users/{seller}/items/search  → todos os ids do seller (50/página)
//   2) /items?ids=...                 → lotes de 20 → upsert em products
// Progresso fica em ContaIntegracao.metadados (syncStatus/syncTotal/...),
// lido pela tela /integrations (barra "Sincronizando X de Y anúncios").
// Nunca inventa dado: 0 anúncios = 0 de 0 e status "ok".

import { prisma } from '../prisma/client.js';
import { mlOAuth } from './mlOAuth.js';

const ML_API = 'https://api.mercadolibre.com';
const LOTE = 20;
const LIMITE_PAGINAS = 100; // teto honesto: 100 × 50 = 5.000 anúncios por varredura

const emAndamento = new Set();

async function contaDaEmpresa(empresaId) {
  const lista = await prisma.contaIntegracao.findMany({
    where: { provedor: 'mercadolivre', empresaId },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  });
  return lista[0] || null;
}

async function gravarSync(empresaId, dados) {
  try {
    const conta = await contaDaEmpresa(empresaId);
    if (!conta) return;
    const metadadosAtuais = conta.metadados && typeof conta.metadados === 'object' ? conta.metadados : {};
    await prisma.contaIntegracao.update({
      where: { id: conta.id },
      data: {
        metadados: {
          ...metadadosAtuais,
          ...dados,
          syncAtualizadoEm: new Date().toISOString(),
        },
      },
    });
  } catch (e) {
    console.error('[mlSync] Erro ao gravar progresso:', e.message);
  }
}

// Status do sync lido de metadados (para GET /api/integracoes/ml/status).
export function lerStatusSync(conta) {
  const m = conta?.metadados && typeof conta.metadados === 'object' ? conta.metadados : {};
  return {
    status: m.syncStatus || 'ocioso',
    total: Number.isFinite(Number(m.syncTotal)) ? Number(m.syncTotal) : 0,
    feitos: Number.isFinite(Number(m.syncFeitos)) ? Number(m.syncFeitos) : 0,
    erro: m.syncErro || null,
    iniciadoEm: m.syncIniciadoEm || null,
    finalizadoEm: m.syncFinalizadoEm || null,
    atualizadoEm: m.syncAtualizadoEm || null,
  };
}

async function mlGet(token, caminho) {
  const r = await fetch(`${ML_API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!r.ok) {
    const e = new Error(`Mercado Livre respondeu ${r.status} em ${caminho.split('?')[0]}`);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

// /items?ids= devolve { code, body } por id (ou o item direto) — aceita os dois.
function extrairItem(entrada) {
  if (!entrada || typeof entrada !== 'object') return null;
  if (entrada.body && typeof entrada.body === 'object') {
    return entrada.code === 200 || entrada.code == null ? entrada.body : null;
  }
  return entrada.id ? entrada : null;
}

async function upsertItem(item, sellerId) {
  const dados = {
    name: String(item.title || item.id || 'Anúncio ML').slice(0, 300),
    imageUrl: item.thumbnail || item.secure_thumbnail || null,
    preco: typeof item.price === 'number' ? item.price : null,
    moeda: item.currency_id || null,
    statusMl: item.status || null,
    vendidos: Number.isFinite(Number(item.sold_quantity)) ? Number(item.sold_quantity) : null,
    permalink: item.permalink || null,
    mlSellerId: String(item.seller_id ?? sellerId),
    sincronizadoEm: new Date(),
  };
  await prisma.catalogProduct.upsert({
    where: { mlItemId: String(item.id) },
    create: { mlItemId: String(item.id), supplierId: null, ...dados },
    update: dados,
  });
}

// Roda fora do ciclo da requisição: o callback redireciona o navegador sem
// esperar o sync terminar; a barra de progresso é atualizada via /status.
export function agendarSyncInicial(empresaId) {
  setImmediate(() => {
    executarSyncInicial(empresaId).catch(e => {
      console.error('[mlSync] Sync inicial falhou:', e.message);
    });
  });
}

export async function executarSyncInicial(empresaId) {
  if (emAndamento.has(empresaId)) return { ok: false, pulado: true };
  emAndamento.add(empresaId);
  try {
    const token = await mlOAuth.getValidAccessToken(empresaId);
    if (!token) {
      await gravarSync(empresaId, { syncStatus: 'erro', syncErro: 'Conta do Mercado Livre não conectada' });
      return { ok: false, erro: 'sem token' };
    }
    const integ = await mlOAuth.getIntegration(empresaId);
    const sellerId = integ?.mlUserId;
    if (!sellerId) {
      await gravarSync(empresaId, { syncStatus: 'erro', syncErro: 'Seller ID indisponível' });
      return { ok: false, erro: 'sem seller' };
    }

    await gravarSync(empresaId, {
      syncStatus: 'rodando',
      syncTotal: 0,
      syncFeitos: 0,
      syncErro: null,
      syncIniciadoEm: new Date().toISOString(),
      syncFinalizadoEm: null,
    });

    // 1) Todos os ids do seller (sequencial, 50 por página).
    const ids = [];
    for (let pagina = 0; pagina < LIMITE_PAGINAS; pagina++) {
      const offset = pagina * 50;
      const dados = await mlGet(token, `/users/${encodeURIComponent(sellerId)}/items/search?limit=50&offset=${offset}`);
      const resultados = Array.isArray(dados?.results) ? dados.results : [];
      ids.push(...resultados.map(String));
      const total = Number(dados?.paging?.total);
      if (resultados.length === 0 || (Number.isFinite(total) && ids.length >= total)) break;
    }
    await gravarSync(empresaId, { syncTotal: ids.length });

    // 2) Lotes de 20 → upsert por mlItemId.
    let feitos = 0;
    for (let i = 0; i < ids.length; i += LOTE) {
      const lote = ids.slice(i, i + LOTE);
      const resp = await mlGet(token, `/items?ids=${lote.map(encodeURIComponent).join(',')}`);
      const entradas = Array.isArray(resp) ? resp : [];
      for (const entrada of entradas) {
        const item = extrairItem(entrada);
        if (item?.id) await upsertItem(item, sellerId);
      }
      feitos += lote.length;
      await gravarSync(empresaId, { syncFeitos: feitos });
      // Mesmo ritmo da API de busca: nunca lotes em paralelo nem colados.
      if (i + LOTE < ids.length) await new Promise(r => setTimeout(r, 300));
    }

    await gravarSync(empresaId, {
      syncStatus: 'ok',
      syncTotal: ids.length,
      syncFeitos: feitos,
      syncFinalizadoEm: new Date().toISOString(),
    });
    return { ok: true, total: ids.length, feitos };
  } catch (e) {
    console.error('[mlSync] Erro no sync inicial:', e.message);
    await gravarSync(empresaId, {
      syncStatus: 'erro',
      syncErro: e.message,
      syncFinalizadoEm: new Date().toISOString(),
    });
    return { ok: false, erro: e.message };
  } finally {
    emAndamento.delete(empresaId);
  }
}
