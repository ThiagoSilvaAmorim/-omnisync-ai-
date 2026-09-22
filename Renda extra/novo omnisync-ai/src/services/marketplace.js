// ============================================
// marketplace.js — produtos reais da internet.
// Usa APIs públicas gratuitas (DummyJSON + Open
// Food Facts) para o "Radar ao vivo". Google
// Shopping não tem API pública gratuita; Mercado
// Livre exige app oficial (fica bloqueado).
// ============================================

const API = 'https://dummyjson.com/products';
const API_OFF = 'https://world.openfoodfacts.org/api/v2/search';

export const CATEGORIAS_INTERNET = [
  { value: 'beauty', label: 'Beleza' },
  { value: 'fragrances', label: 'Perfumes' },
  { value: 'skincare', label: 'Skincare' },
  { value: 'smartphones', label: 'Smartphones' },
  { value: 'laptops', label: 'Notebooks' },
  { value: 'mobile-accessories', label: 'Acessórios' },
  { value: 'mens-watches', label: 'Relógios' },
  { value: 'furniture', label: 'Móveis' },
  { value: 'groceries', label: 'Mercado' },
  { value: 'sports-accessories', label: 'Esportes' },
];

// Mapa de categoria (DummyJSON) -> busca (Open Food Facts).
const CATEGORIA_OFF = {
  beauty: 'cosmetics',
  fragrances: 'perfumes',
  skincare: 'cosmetics',
  groceries: 'food',
};

// Timeout rigoroso por requisição (evita loops/varreduras presas).
const TIMEOUT_MS = 8000;

function authHeaders() {
  try {
    const token = localStorage.getItem('omnisync-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function fetchComTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        ...authHeaders(),
        ...((options.headers) || {}),
      },
    });
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar produtos`);
    return res;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Tempo esgotado na busca (timeout de 8s)');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

// Cache local de 10 minutos por categoria (evita esgotar as APIs gratuitas).
const cacheBuscas = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function lerCache(chave) {
  const item = cacheBuscas.get(chave);
  if (!item) return null;
  if (Date.now() - item.quando > CACHE_TTL_MS) {
    cacheBuscas.delete(chave);
    return null;
  }
  return item.dados;
}

// Busca produtos reais do DummyJSON.
async function buscarDummy(categoria, limit) {
  const url =
    categoria && categoria !== 'todas'
      ? `${API}/category/${categoria}?limit=${limit}`
      : `${API}?limit=${limit}`;
  const res = await fetchComTimeout(url);
  const data = await res.json();
  const lista = Array.isArray(data) ? data : data.products || [];
  return lista.map(p => ({
    id: p.id,
    nome: p.title,
    preco: p.price,
    imagem: p.thumbnail,
    categoria: p.category,
    marca: p.brand,
    avaliacao: p.rating,
    origem: 'DummyJSON',
  }));
}

// Busca produtos REAIS do Open Food Facts (nomes, marcas e fotos reais).
async function buscarOff(categoria, limit) {
  const termo = CATEGORIA_OFF[categoria] || 'food';
  const url = `${API_OFF}?categories_tags=${termo}&fields=product_name,image_url,brands,quantity&page_size=${limit}`;
  const res = await fetchComTimeout(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products || [])
    .filter(p => p.product_name && p.image_url)
    .map((p, i) => ({
      id: `off-${p.code || i}`,
      nome: p.product_name,
      preco: null,
      imagem: p.image_url,
      categoria: categoria,
      marca: p.brands || '—',
      avaliacao: null,
      origem: 'OpenFoodFacts',
    }));
}

// ---------- Mercado Livre (via backend proxy) ----------
// Usa o backend para buscar produtos, que encaminha com o token salvo no banco.
// O backend usa o acesso do mlOAuth (token criptografado em DB).
const VITE_API_URL = import.meta.env.VITE_API_URL || '';

export async function buscarMercadoLivre(termo, limit = 12) {
  const url = `${VITE_API_URL}/produtos/mercadolibre?q=${encodeURIComponent(termo || 'notebook')}&limit=${limit}`;
  const res = await fetchComTimeout(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.mensagem || err.error || `Erro ${res.status} ao buscar no Mercado Livre`);
  }
  const data = await res.json();
  return (data.produtos || []).map(p => ({
    id: p.id,
    nome: p.nome,
    preco: p.preco,
    moeda: p.moeda,
    imagem: p.imagem,
    categoria: p.categoria,
    marca: p.marca,
    avaliacao: p.avaliacao,
    vendidos: p.vendidos,
    link: p.link,
    origem: p.origem,
  }));
}

// Formatação de preço do Radar com moeda explícita (sem conversão inventada).
// - BRL → "R$ X,XX" (sem conversão)
// - USD ou moeda ausente (ex.: DummyJSON) → "US$ X.XX" (moeda original)
// - preço nulo/inválido → "Sem preço"
export function formatPrecoRadar(p) {
  const valor = Number(p?.preco);
  if (p?.preco == null || !Number.isFinite(valor)) return 'Sem preço';
  if (p.moeda === 'BRL') {
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (p.moeda && p.moeda !== 'USD') {
    return `${p.moeda} ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `US$ ${valor.toFixed(2)}`;
}

// Busca e combina as duas fontes (a Open Food Facts entra como complemento).
// Varredura é sempre sob demanda (chamada explícita da tela); nunca em loop.
export async function buscarProdutosInternet(categoria, limit = 8) {
  const chave = `${categoria || 'todas'}:${limit}`;
  const emCache = lerCache(chave);
  if (emCache) return emCache;

  const [dummy, off] = await Promise.allSettled([
    buscarDummy(categoria, limit),
    categoria !== 'todas' ? buscarOff(categoria, limit) : Promise.resolve([]),
  ]);

  const produtosDummy = dummy.status === 'fulfilled' ? dummy.value : [];
  const produtosOff = off.status === 'fulfilled' ? off.value : [];

  if (produtosDummy.length === 0 && produtosOff.length === 0) {
    const motivo = dummy.status === 'rejected' ? dummy.reason?.message : 'fontes indisponíveis';
    throw new Error(`Nenhum produto encontrado na internet (${motivo}).`);
  }

  const combinados = [...produtosDummy, ...produtosOff];
  cacheBuscas.set(chave, { dados: combinados, quando: Date.now() });
  return combinados;
}

