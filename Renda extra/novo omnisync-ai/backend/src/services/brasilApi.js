// backend/src/services/brasilApi.js
// BrasilAPI (sem chave) → dados do CNPJ na Receita Federal.
// Cache em memória de 24h por CNPJ; timeout 8s; validação local de
// dígito verificador antes de consultar; 404 → CNPJ não existe.

const BRASILAPI_URL = 'https://brasilapi.com.br/api/cnpj/v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

const cache = new Map();

export function limparCacheBrasilApi() {
  cache.clear();
}

export function erroBrasilApi(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

export function somenteDigitos(cnpj) {
  return String(cnpj || '').replace(/\D/g, '');
}

export function formatarCnpj(cnpj) {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14) return null;
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/** Valida tamanho, não-repetição e os 2 dígitos verificadores. */
export function validarCnpj(cnpj) {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;

  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i += 1) {
    soma += Number(d[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  const dv1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (dv1 !== Number(d[12])) return false;

  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i += 1) {
    soma += Number(d[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  const dv2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return dv2 === Number(d[13]);
}

function mapear(bruto) {
  const logradouro = [bruto.descricao_tipo_de_logradouro, bruto.logradouro]
    .filter(Boolean)
    .join(' ')
    .trim();
  return {
    cnpj: somenteDigitos(bruto.cnpj),
    razaoSocial: bruto.razao_social || null,
    nomeFantasia: bruto.nome_fantasia || null,
    situacaoCadastral: bruto.descricao_situacao_cadastral
      ? String(bruto.descricao_situacao_cadastral).toUpperCase()
      : null,
    abertoEm: bruto.data_inicio_atividade ? new Date(bruto.data_inicio_atividade) : null,
    cnae: bruto.cnae_fiscal ? String(bruto.cnae_fiscal) : null,
    cnaeDescricao: bruto.cnae_fiscal_descricao || null,
    capitalSocial: bruto.capital_social != null ? Number(bruto.capital_social) : null,
    endereco: {
      logradouro: logradouro || null,
      numero: bruto.numero || null,
      bairro: bruto.bairro || null,
      city: bruto.municipio || null,
      uf: bruto.uf || null,
    },
  };
}

/**
 * Consulta o CNPJ na BrasilAPI (cache 24h).
 * Lança erro com `.code`: CNPJ_INVALIDO | CNPJ_NAO_ENCONTRADO |
 * BRASILAPI_TIMEOUT | BRASILAPI_RATE_LIMIT | BRASILAPI_UNAVAILABLE | BRASILAPI_FAILED.
 */
export async function buscarCnpj(cnpj) {
  const digitos = somenteDigitos(cnpj);
  if (!validarCnpj(digitos)) {
    throw erroBrasilApi('CNPJ_INVALIDO', 'CNPJ inválido: confira os 14 dígitos.');
  }

  const hit = cache.get(digitos);
  if (hit && Date.now() - hit.quando < CACHE_TTL_MS) return hit.dados;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let r;
  try {
    r = await fetch(`${BRASILAPI_URL}/${digitos}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    throw erroBrasilApi('BRASILAPI_TIMEOUT', 'A BrasilAPI não respondeu a tempo.');
  } finally {
    clearTimeout(timer);
  }

  if (r.status === 404) {
    throw erroBrasilApi('CNPJ_NAO_ENCONTRADO', 'CNPJ não encontrado na base da Receita.');
  }
  if (r.status === 429) {
    throw erroBrasilApi('BRASILAPI_RATE_LIMIT', 'Muitas consultas de CNPJ. Tente de novo em instantes.');
  }
  if (!r.ok) {
    throw erroBrasilApi('BRASILAPI_FAILED', `BrasilAPI respondeu ${r.status}.`);
  }

  const bruto = await r.json().catch(() => null);
  if (!bruto || typeof bruto !== 'object') {
    throw erroBrasilApi('BRASILAPI_FAILED', 'Resposta inválida da BrasilAPI.');
  }

  const dados = mapear(bruto);
  cache.set(digitos, { quando: Date.now(), dados });
  return dados;
}

/** Descrição real do fornecedor a partir dos dados da Receita. */
export function descreverFornecedor(dados) {
  const partes = [];
  if (dados.razaoSocial) partes.push(dados.razaoSocial);
  else if (dados.nomeFantasia) partes.push(dados.nomeFantasia);
  if (dados.cnaeDescricao) partes.push(dados.cnaeDescricao.toLowerCase());
  if (dados.abertoEm) {
    const ano = dados.abertoEm.getUTCFullYear();
    partes.push(`atividade desde ${ano}`);
  }
  const local = [dados.endereco?.city, dados.endereco?.uf].filter(Boolean).join('/');
  if (local) partes.push(local);
  return partes.length ? `${partes.join(' · ')}.` : null;
}
