// ============================================
// googlePlaces — autocomplete de local (Google
// Place Autocomplete, país BR, idioma pt-BR) e
// Text Search de fornecedores (importadoras,
// distribuidoras, exportadoras) por cidade.
// A chave fica só no backend (GOOGLE_PLACES_KEY);
// o front nunca a vê. Cache em memória (5min)
// para não queimar cota a cada tecla.
// Erros saem como { code, message } (padrão
// dos demais serviços: brasilApi, ibge...).
// ============================================

const URL_BASE = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const URL_TEXT_SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const TIMEOUT_MS = 6000;
const TIMEOUT_BUSCA_MS = 8000;

// Só o que o catálogo usa: identificação, contato e geo.
const CAMPOS_FORNECEDOR = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.location',
].join(',');
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
// A API legada vem SEM `types` nos termos — nesse caso a ordem é
// fixa [nome, rua, bairro, cidade, UF, país], então a UF vira o
// primeiro termo de 2 maiúsculas e a cidade é o anterior a ela.
function extrairLocal(prediction) {
  const terms = prediction.terms || [];
  const comTipo = tipo => terms.find(t => (t.types || []).includes(tipo))?.value || null;

  let cidade = comTipo('locality') || comTipo('administrative_area_level_2');
  let estado = comTipo('administrative_area_level_1');

  if (!cidade || !estado) {
    const idxUf = terms.findIndex(t => /^[A-Z]{2}$/.test(t.value || ''));
    if (idxUf > 0) {
      estado = estado || terms[idxUf].value;
      cidade = cidade || terms[idxUf - 1].value;
    }
  }

  return {
    cidade: cidade || prediction.structured_formatting?.main_text || null,
    estado: estado || null,
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

// ============================================
// Text Search — fornecedores de importação e
// exportação por cidade (Places API v1).
// Ex.: "importadora e distribuidora em Campinas SP"
// devolve nome, telefone, site e endereço reais.
// Cache por 5min por consulta; a chave não sai
// do backend.
// ============================================
export async function buscarFornecedoresPlaces({ termo, cidade, uf, chave, limite = 10 } = {}) {
  const chaveUsada = chave ?? chavePlaces();
  const texto = String(termo || '').trim();
  const local = [String(cidade || '').trim(), String(uf || '').trim().toUpperCase()].filter(Boolean).join(' ');

  if (!texto) {
    const e = new Error('Informe o termo de busca (ex.: importadora, distribuidora).');
    e.code = 'TERMO_INVALIDO';
    throw e;
  }
  if (!local) {
    const e = new Error('Informe a cidade para buscar fornecedores.');
    e.code = 'CIDADE_INVALIDA';
    throw e;
  }
  if (!chaveUsada) {
    const e = new Error('Google Places não configurado (falta GOOGLE_PLACES_KEY ou GOOGLE_MAPS_API_KEY).');
    e.code = 'SEM_CHAVE';
    throw e;
  }

  const query = `${texto} em ${local}`;
  const chaveCache = `text:${query.toLowerCase()}|${limite}`;
  const guardado = cache.get(chaveCache);
  if (guardado && guardado.expira > Date.now()) return guardado.valor;

  let res;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_BUSCA_MS);
    try {
      res = await fetch(URL_TEXT_SEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': chaveUsada,
          'X-Goog-FieldMask': CAMPOS_FORNECEDOR,
        },
        body: JSON.stringify({
          textQuery: query,
          languageCode: 'pt-BR',
          regionCode: 'BR',
          maxResultCount: Math.min(Math.max(limite, 1), 20),
        }),
        signal: ctrl.signal,
      });
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

  if (res.status === 429) {
    const e = new Error('Cota do Google Places excedida. Tente mais tarde.');
    e.code = 'PLACES_RATE_LIMIT';
    throw e;
  }
  if (!res.ok || corpo.error) {
    const e = new Error(corpo.error?.message || `Google Places respondeu ${res.status}.`);
    e.code = res.status === 403 ? 'PLACES_NEGADO' : 'PLACES_ERRO';
    throw e;
  }

  const fornecedores = (corpo.places || []).map(p => ({
    placeId: p.id || null,
    nome: p.displayName?.text || null,
    telefone: p.nationalPhoneNumber || null,
    site: p.websiteUri || null,
    endereco: p.formattedAddress || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  })).filter(f => f.nome);

  guardarNoCache(chaveCache, fornecedores);
  return fornecedores;
}
