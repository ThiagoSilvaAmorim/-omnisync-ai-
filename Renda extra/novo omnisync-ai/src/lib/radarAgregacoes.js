// ============================================
// radarAgregacoes.js — agregações puras sobre os
// itens reais do Radar (DummyJSON, OFF, ML).
// Só usa campos presentes nos itens; sem campo,
// o item cai em "Sem informação". Puro e testável.
// ============================================

function rotulo(v) {
  const s = String(v ?? '').trim();
  return s || 'Sem informação';
}

function numeroFinito(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Agrupa por campo (marca, categoria): qtd, preço médio e vendidos totais.
export function agruparPorCampo(itens, campo) {
  const mapa = new Map();
  for (const p of Array.isArray(itens) ? itens : []) {
    const chave = rotulo(p?.[campo]);
    if (!mapa.has(chave)) mapa.set(chave, { chave, qtd: 0, somaPreco: 0, nPreco: 0, vendidosTotal: 0 });
    const g = mapa.get(chave);
    g.qtd += 1;
    const preco = numeroFinito(p?.preco);
    if (preco != null) { g.somaPreco += preco; g.nPreco += 1; }
    const vendidos = numeroFinito(p?.vendidos);
    if (vendidos != null) g.vendidosTotal += vendidos;
  }
  return [...mapa.values()]
    .map(g => ({ chave: g.chave, qtd: g.qtd, precoMedio: g.nPreco > 0 ? g.somaPreco / g.nPreco : null, vendidosTotal: g.vendidosTotal }))
    .sort((a, b) => b.qtd - a.qtd);
}

// Top N por vendidos (só itens com vendidos numérico).
export function topVendidos(itens, n = 5) {
  return (Array.isArray(itens) ? itens : [])
    .filter(p => numeroFinito(p?.vendidos) != null)
    .sort((a, b) => Number(b.vendidos) - Number(a.vendidos))
    .slice(0, n);
}

// Top N por avaliação (só itens com avaliação numérica).
export function topAvaliados(itens, n = 5) {
  return (Array.isArray(itens) ? itens : [])
    .filter(p => numeroFinito(p?.avaliacao) != null)
    .sort((a, b) => Number(b.avaliacao) - Number(a.avaliacao))
    .slice(0, n);
}

// N menores preços (só itens com preço numérico).
export function menorPreco(itens, n = 5) {
  return (Array.isArray(itens) ? itens : [])
    .filter(p => numeroFinito(p?.preco) != null)
    .sort((a, b) => Number(a.preco) - Number(b.preco))
    .slice(0, n);
}
