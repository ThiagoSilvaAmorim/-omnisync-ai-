// backend/src/services/osm.js
// OpenStreetMap: Nominatim (geocode da cidade → bbox) + Overpass (POIs).
// Sem chave externa. User-Agent obrigatório; rate-limit 1 req/s no Nominatim;
// cache de importação por uf+cidade (24h).

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'OmniSync/1.0 (contato: suporte@omnisync.local)';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NOMINATIM_MIN_INTERVAL_MS = 1000;
const OVERPASS_TIMEOUT_MS = 25000;
const NOMINATIM_TIMEOUT_MS = 10000;

const cacheImport = new Map();
let ultimaChamadaNominatim = 0;

function erroOsm(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

export function limparCacheOsm() {
  cacheImport.clear();
  ultimaChamadaNominatim = 0;
}

export function importacaoRecente(uf, cidade, categoria) {
  const chave = chaveCache(uf, cidade, categoria);
  const item = cacheImport.get(chave);
  if (!item) return null;
  if (Date.now() - item.quando > CACHE_TTL_MS) {
    cacheImport.delete(chave);
    return null;
  }
  return item;
}

function chaveCache(uf, cidade, categoria) {
  return [uf, cidade, categoria || ''].map(v => String(v).trim().toLowerCase()).join('|');
}

async function aguardarRateLimitNominatim() {
  const espera = ultimaChamadaNominatim + NOMINATIM_MIN_INTERVAL_MS - Date.now();
  if (espera > 0) {
    await new Promise(r => setTimeout(r, espera));
  }
  ultimaChamadaNominatim = Date.now();
}

async function fetchComTimeout(url, options, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, ...((options && options.headers) || {}) } });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw erroOsm('OSM_TIMEOUT', 'Tempo esgotado ao consultar o OpenStreetMap.');
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/** Geocodifica "cidade, UF, Brasil" no Nominatim e retorna boundingbox [s, n, w, e]. */
export async function geocodificarCidade(uf, cidade) {
  await aguardarRateLimitNominatim();
  const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
  const url = `${NOMINATIM_URL}?q=${q}&format=json&limit=1&countrycodes=br`;
  let res;
  try {
    res = await fetchComTimeout(url, {}, NOMINATIM_TIMEOUT_MS);
  } catch (e) {
    if (e.code === 'OSM_TIMEOUT') {
      throw erroOsm('OSM_TIMEOUT', 'Tempo esgotado ao localizar a cidade no mapa.');
    }
    throw erroOsm('OSM_UNAVAILABLE', 'Não foi possível consultar o mapa agora. Tente novamente.');
  }
  if (res.status === 429) {
    throw erroOsm('OSM_RATE_LIMIT', 'Limite temporário do OpenStreetMap atingido. Aguarde um minuto.');
  }
  if (!res.ok) {
    throw erroOsm('OSM_UNAVAILABLE', 'Não foi possível consultar o mapa agora. Tente novamente.');
  }
  const arr = await res.json().catch(() => []);
  const hit = Array.isArray(arr) ? arr[0] : null;
  if (!hit?.boundingbox) {
    throw erroOsm('CITY_NOT_FOUND', `Cidade não encontrada no mapa: ${cidade}/${uf}.`);
  }
  const [south, north, west, east] = hit.boundingbox.map(Number);
  if (![south, north, west, east].every(Number.isFinite)) {
    throw erroOsm('CITY_NOT_FOUND', `Cidade não encontrada no mapa: ${cidade}/${uf}.`);
  }
  return { south, north, west, east };
}

function escaparRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Consulta Overpass no bbox da cidade e mapeia Poi → Supplier-like. */
export async function buscarPoisNaCidade({ uf, cidade, categoria, bbox }) {
  // Overpass bbox: (south,west,north,east) aplicado a cada seletor.
  const bb = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  const nomeRe = escaparRegex(categoria || '');
  const filtrosCategoria = categoria
    ? `node["name"~"${nomeRe}",i]["shop"]${bb};way["name"~"${nomeRe}",i]["shop"]${bb};`
    : '';
  const query = `
[out:json][timeout:25];
(
  node["shop"~"^(wholesale|trade)$"]${bb};
  way["shop"~"^(wholesale|trade)$"]${bb};
  node["office"="company"]${bb};
  way["office"="company"]${bb};
  ${filtrosCategoria}
);
out center tags;`.trim();

  const body = `data=${encodeURIComponent(query)}`;

  let res;
  try {
    res = await fetchComTimeout(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    }, OVERPASS_TIMEOUT_MS);
  } catch (e) {
    if (e.code === 'OSM_TIMEOUT') {
      throw erroOsm('OSM_TIMEOUT', 'Tempo esgotado ao buscar fornecedores no OpenStreetMap.');
    }
    throw erroOsm('OSM_UNAVAILABLE', 'Não foi possível buscar fornecedores no mapa agora.');
  }
  if (res.status === 429) {
    throw erroOsm('OSM_RATE_LIMIT', 'Limite temporário do Overpass atingido. Tente novamente em instantes.');
  }
  if (!res.ok) {
    throw erroOsm('OSM_UNAVAILABLE', 'Não foi possível buscar fornecedores no mapa agora.');
  }
  const data = await res.json().catch(() => ({ elements: [] }));
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const vistos = new Set();
  const fornecedores = [];
  for (const el of elements) {
    const tags = el.tags || {};
    const nome = String(tags.name || '').trim();
    if (!nome) continue;
    const osmId = `${el.type}/${el.id}`;
    if (vistos.has(osmId)) continue;
    vistos.add(osmId);

    const lat = Number.isFinite(Number(el.lat)) ? Number(el.lat) : Number(el.center?.lat);
    const lng = Number.isFinite(Number(el.lon)) ? Number(el.lon) : Number(el.center?.lon);
    const partes = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
    const telefone = tags.phone || tags['contact:phone'] || null;
    const site = tags.website || tags['contact:website'] || null;

    fornecedores.push({
      osmId,
      nome,
      categoria: tags.shop || tags.office || categoria || null,
      endereco: partes || null,
      cidade: tags['addr:city'] || cidade,
      uf: (tags['addr:state'] || uf || '').toUpperCase() || uf,
      telefone,
      site,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      fonte: 'osm',
    });
  }
  return fornecedores;
}

/** Orquestra geocode + overpass e grava o resultado no cache 24h. */
export async function importarFornecedoresOsm({ uf, cidade, categoria }) {
  const cacheado = importacaoRecente(uf, cidade, categoria);
  if (cacheado) return { ...cacheado, cacheado: true };

  const bbox = await geocodificarCidade(uf, cidade);
  const fornecedores = await buscarPoisNaCidade({ uf, cidade, categoria, bbox });
  const payload = { fornecedores, quando: Date.now(), cacheado: false };
  cacheImport.set(chaveCache(uf, cidade, categoria), payload);
  return payload;
}
