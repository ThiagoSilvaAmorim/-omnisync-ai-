// backend/src/services/googlePlaces.js
// Busca pública de empresas via Google Places API (New) — Text Search.
// Usado para descobrir candidatos a fornecedor; resultados públicos NÃO
// são automaticamente fornecedores, distribuidores ou parceiros.
// A chave (GOOGLE_MAPS_API_KEY) fica somente no servidor e nunca é
// registrada em logs, erros ou respostas.

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';

// Cache curto em memória por consulta+cidade (evita chamadas repetidas).
const cacheBuscas = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function lerCache(chave) {
  const item = cacheBuscas.get(chave);
  if (!item) return null;
  if (Date.now() - item.quando > CACHE_TTL_MS) {
    cacheBuscas.delete(chave);
    return null;
  }
  return item.dados;
}

export function assertGooglePlacesConfigured() {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    const error = new Error('Google Places não configurado');
    error.code = 'GOOGLE_PLACES_NOT_CONFIGURED';
    throw error;
  }
}

function mapearPlace(place) {
  return {
    externalId: place.id || null,
    nome: place.displayName?.text || null,
    endereco: place.formattedAddress || null,
    telefone: place.nationalPhoneNumber || null,
    site: place.websiteUri || null,
    mapsUrl: place.googleMapsUri || null,
    avaliacao: Number.isFinite(Number(place.rating)) ? Number(place.rating) : null,
    quantidadeAvaliacoes: Number.isFinite(Number(place.userRatingCount)) ? Number(place.userRatingCount) : 0,
    categoria: place.primaryType || null,
    fonte: 'Google Places',
    verificado: false,
  };
}

export async function searchGooglePlaces({ query, cidade }) {
  assertGooglePlacesConfigured();

  const textQuery = [query, cidade].filter(Boolean).join(' em ');

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.rating',
    'places.userRatingCount',
    'places.primaryType',
  ].join(',');

  const cached = lerCache(`${textQuery}`);
  if (cached) return cached;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10000);

  try {
    const response = await fetch(GOOGLE_PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'pt-BR',
        regionCode: 'BR',
        pageSize: 10,
      }),
      signal: ctrl.signal,
    });

    if (response.status === 429) {
      const error = new Error('Limite do Google Places atingido');
      error.code = 'GOOGLE_PLACES_RATE_LIMIT';
      throw error;
    }

    if (response.status === 401 || response.status === 403) {
      const error = new Error('Google Places recusou a requisição');
      error.code = 'GOOGLE_PLACES_UNAUTHORIZED';
      throw error;
    }

    if (!response.ok) {
      const error = new Error(`Google Places HTTP ${response.status}`);
      error.code = 'GOOGLE_PLACES_REQUEST_FAILED';
      throw error;
    }

    const data = await response.json();
    const fornecedores = (data.places || []).map(mapearPlace);
    cacheBuscas.set(`${textQuery}`, { dados: fornecedores, quando: Date.now() });
    return fornecedores;
  } catch (e) {
    if (e?.name === 'AbortError') {
      const error = new Error('Tempo esgotado na busca pública');
      error.code = 'GOOGLE_PLACES_REQUEST_FAILED';
      throw error;
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export function limparCacheGooglePlaces() {
  cacheBuscas.clear();
}
