// backend/src/services/mlListings.js
// Escrita no Mercado Livre (oficial): criar anúncio, preço, estoque,
// pausar/reativar e leitura de envio. Toda escrita exige aprovação
// prévia ("aprovada") do approvalEngine — nunca executa sozinha.
// Nenhum segredo é registrado em logs ou erros.

const ML_API = 'https://api.mercadolibre.com';

function erroMl(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}

async function chamadaMl(accessToken, method, path, body) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(`${ML_API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (r.status === 401) {
      throw erroMl('ML_UNAUTHORIZED', 401, 'Token do Mercado Livre inválido ou expirado. Reautorize a conta.');
    }
    if (r.status === 404) {
      throw erroMl('ML_NOT_FOUND', 404, 'Recurso não encontrado no Mercado Livre.');
    }
    if (r.status === 429) {
      throw erroMl('ML_RATE_LIMIT', 429, 'Limite do Mercado Livre atingido. Tente mais tarde.');
    }
    if (!r.ok) {
      throw erroMl('ML_REQUEST_FAILED', 502, 'Falha na API do Mercado Livre.');
    }
    return r.json();
  } catch (e) {
    if (e?.name === 'AbortError') throw erroMl('ML_TIMEOUT', 504, 'Tempo esgotado no Mercado Livre.');
    throw e.code ? e : erroMl('ML_REQUEST_FAILED', 502, 'Falha na API do Mercado Livre.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function publicarAnuncio(accessToken, item) {
  if (!item || typeof item.title !== 'string' || !item.title.trim()) {
    throw erroMl('ML_INVALID_ITEM', 400, 'Anúncio precisa de título.');
  }
  if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0) {
    throw erroMl('ML_INVALID_ITEM', 400, 'Anúncio precisa de preço válido maior que zero.');
  }
  return chamadaMl(accessToken, 'POST', '/items', item);
}

export async function atualizarPreco(accessToken, itemId, price) {
  if (!itemId) throw erroMl('ML_INVALID_ITEM', 400, 'Identificador do anúncio obrigatório.');
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
    throw erroMl('ML_INVALID_PRICE', 400, 'Preço deve ser maior que zero.');
  }
  return chamadaMl(accessToken, 'PUT', `/items/${encodeURIComponent(itemId)}`, { price: Number(price) });
}

export async function atualizarEstoque(accessToken, itemId, quantity) {
  if (!itemId) throw erroMl('ML_INVALID_ITEM', 400, 'Identificador do anúncio obrigatório.');
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
    throw erroMl('ML_INVALID_STOCK', 400, 'Estoque deve ser inteiro maior ou igual a zero.');
  }
  return chamadaMl(accessToken, 'PUT', `/items/${encodeURIComponent(itemId)}`, { available_quantity: Number(quantity) });
}

export async function alterarStatusAnuncio(accessToken, itemId, status) {
  if (!itemId) throw erroMl('ML_INVALID_ITEM', 400, 'Identificador do anúncio obrigatório.');
  if (!['paused', 'active'].includes(status)) {
    throw erroMl('ML_INVALID_STATUS', 400, 'Status deve ser paused ou active.');
  }
  return chamadaMl(accessToken, 'PUT', `/items/${encodeURIComponent(itemId)}`, { status });
}

export async function lerEnvio(accessToken, shipmentId) {
  if (!shipmentId) throw erroMl('ML_INVALID_SHIPMENT', 400, 'Identificador do envio obrigatório.');
  const data = await chamadaMl(accessToken, 'GET', `/shipments/${encodeURIComponent(shipmentId)}`);
  return {
    id: data?.id ?? shipmentId,
    status: data?.status ?? null,
    trackingNumber: data?.tracking_number ?? null,
    receiver: data?.receiver_address ? { city: data.receiver_address.city?.name ?? null } : null,
  };
}
