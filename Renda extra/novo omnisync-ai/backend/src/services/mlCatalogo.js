// backend/src/services/mlCatalogo.js
// Catálogo oficial do Mercado Livre (API /products/search + /products/{id}).
// Com a credencial do vendedor a busca de ANÚNCIOS (/sites/MLB/search)
// responde 403, então a Análise de Mercado usa o catálogo: ele expõe nome,
// status, data de criação, fotos, variações e marca — mas NÃO vendas,
// preço, reputação ou frete (esses campos ficam null e o front exibe "—").

const ML_API = 'https://api.mercadolibre.com';

const atraso = ms => new Promise(r => setTimeout(r, ms));

async function mlGet(token, caminho) {
  return fetch(`${ML_API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
}

// 429 = rate limit da API: uma nova tentativa após 1,2s.
async function mlGetComRetry(token, caminho) {
  let r = await mlGet(token, caminho);
  if (r.status === 429) {
    await atraso(1200);
    r = await mlGet(token, caminho);
  }
  return r;
}

/** Busca produtos do catálogo por termo (limit ≤ 50 aceito). */
export async function buscarCatalogo(token, termo, { limit = 20 } = {}) {
  const url = `/products/search?site_id=MLB&q=${encodeURIComponent(termo)}&limit=${limit}`;
  const r = await mlGetComRetry(token, url);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`Busca do catálogo do Mercado Livre falhou (HTTP ${r.status}).`);
    e.status = 502;
    e.code = r.status === 403 ? 'ML_SEARCH_FORBIDDEN' : 'ML_SEARCH_FAILED';
    throw e;
  }
  return {
    resultados: Array.isArray(body.results) ? body.results : [],
    total: Number(body.paging?.total) || 0,
  };
}

/** Detalhes em lote (fotos/permalink/marca vêm só do detalhe). Pools pequenos + pausa entre lotes. */
export async function detalharProdutos(token, ids, { concorrencia = 4 } = {}) {
  const detalhes = new Map();
  for (let i = 0; i < ids.length; i += concorrencia) {
    const lote = ids.slice(i, i + concorrencia);
    const resolvidos = await Promise.all(lote.map(async id => {
      try {
        const r = await mlGetComRetry(token, `/products/${id}`);
        return [id, r.ok ? await r.json() : null];
      } catch {
        return [id, null];
      }
    }));
    for (const [id, detalhe] of resolvidos) if (detalhe) detalhes.set(id, detalhe);
    if (i + concorrencia < ids.length) await atraso(700);
  }
  return detalhes;
}

/** Dias entre a data ISO e hoje; null quando ausente/inválida. */
export function diasDesde(dataIso) {
  if (!dataIso) return null;
  const t = Date.parse(dataIso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function extrairMarca(produto) {
  const attrs = produto?.attributes;
  if (!Array.isArray(attrs)) return null;
  const marca = attrs.find(a => a?.id === 'BRAND');
  const valor = marca?.value_name;
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/** URL da primeira foto com url válido; null quando a API não devolve imagem. */
export function primeiraImagem(produto) {
  const fotos = produto?.pictures;
  if (!Array.isArray(fotos)) return null;
  const comUrl = fotos.find(p => p && typeof p.url === 'string' && p.url);
  return comUrl ? comUrl.url : null;
}

/** Preço só quando o catálogo devolve buy_box_winner com price numérico; senão null. */
export function precoCatalogo(produto) {
  const preco = produto?.buy_box_winner?.price;
  return Number.isFinite(preco) ? preco : null;
}
