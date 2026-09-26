// ============================================
// googlePlaces — autocomplete de local (Google
// Place Autocomplete, país BR, idioma pt-BR).
// A chave fica só no backend (GOOGLE_PLACES_KEY);
// o front nunca a vê. Cache em memória (5min)
// para não queimar cota a cada tecla.
// Erros saem como { code, message } (padrão
// dos demais serviços: brasilApi, ibge...).
// ============================================

const URL_BASE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const TIMEOUT_MS = 6000;
const TTL_MS = 5 * 60 * 1000;
const LIMITE_CACHE = 200;

const cache = new Map();

const STATUS_ERRO = {
  OVER_QUERY_LIMIT: 'PLACES_RATE_LIMIT',
  REQUEST_DENIED: 'PLACES_NEGADO',
  INVALID_REQUEST: 'PLACES_INVALIDO',
};

export function limparCachePlaces() {
  cache.clear();
}

function guardarNoCache(chave, valor) {
  if (cache.size >= LIMITE_CACHE) {
    const primeira = cache.keys().next().value;
    cache.delete(primeira);
  }
  cache.set(chave, { expira: Date.now() + TTL_MS, valor });
}

// terms da predição: cidade (locality) e estado
// (administrative_area_level_1) para o front mapear a UF.
function extrairLocal(prediction) {
  const terms = prediction.terms || [];
  const achar = tipo => terms.find(t => (t.types || []).includes(tipo))?.value || null;
  return {
    cidade: achar('locality') || achar('administrative_area_level_2') || null,
    estado: achar('administrative_area_level_1'),
  };
}

// Aceita os dois nomes usados no Railway: GOOGLE_PLACES_KEY
// ou GOOGLE_MAPS_API_KEY (mesma chave do Google Cloud).
export function chavePlaces() {
  return process.env.GOOGLE_PLACES_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
}

export async function autocompleteLocal(input, { chave } = {}) {
  const chaveUsada = chave ?? chavePlaces();
  const texto = String(input || '').trim();
  if (texto.length < 3) {
    const e = new Error('Digite ao menos 3 caracteres para buscar um local.');
    e.code = 'INPUT_CURTO';
    throw e;
  }
  if (texto.length > 80) {
    const e = new Error('Busca de local muito longa (máx. 80 caracteres).');
    e.code = 'INPUT_GRANDE';
    throw e;
  }
  if (!chaveUsada) {
    const e = new Error('Google Places não configurado (falta GOOGLE_PLACES_KEY ou GOOGLE_MAPS_API_KEY).');
    e.code = 'SEM_CHAVE';
    throw e;
  }

  const chaveCache = texto.toLowerCase();
  const guardado = cache.get(chaveCache);
  if (guardado && guardado.expira > Date.now()) return guardado.valor;

  const url =
    `${URL_BASE}?input=${encodeURIComponent(texto)}` +
    '&language=pt-BR&components=country:br' +
    `&key=${encodeURIComponent(chaveUsada)}`;

  let res;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    const e = new Error('Sem resposta do Google Places (tempo esgotado).');
    e.code = 'PLACES_TIMEOUT';
    throw e;
  }

  let corpo;
  try {
    corpo = await res.json();
  } catch {
    const e = new Error('Resposta inválida do Google Places.');
    e.code = 'PLACES_INVALIDO';
    throw e;
  }

  const status = corpo.status || 'UNKNOWN';
  if (status === 'ZERO_RESULTS') {
    guardarNoCache(chaveCache, []);
    return [];
  }
  if (status !== 'OK') {
    const e = new Error(
      status === 'OVER_QUERY_LIMIT'
        ? 'Cota do Google Places excedida. Tente mais tarde.'
        : `Google Places respondeu ${status}.`
    );
    e.code = STATUS_ERRO[status] || 'PLACES_ERRO';
    throw e;
  }

  const sugestoes = (corpo.predictions || []).slice(0, 5).map(p => {
    const local = extrairLocal(p);
    return {
      placeId: p.place_id,
      descricao: p.description,
      principal: p.structured_formatting?.main_text || p.description,
      secundario: p.structured_formatting?.secondary_text || null,
      cidade: local.cidade,
      estado: local.estado,
    };
  });

  guardarNoCache(chaveCache, sugestoes);
  return sugestoes;
}
