// backend/scripts/popular-fotos.mjs
// Popula fotos REAIS sem chave externa:
//  - products.image_url  ← foto do catálogo oficial do Mercado Livre (API com token do projeto)
//  - suppliers.logo_url  ← favicon do próprio site do fornecedor (só se o domínio estiver vivo)
// Uso: node scripts/popular-fotos.mjs   (não imprime chaves/tokens)

import 'dotenv/config';
import { lookup } from 'node:dns/promises';
import { PrismaClient } from '@prisma/client';
import { mlOAuth } from '../src/services/mlOAuth.js';

const prisma = new PrismaClient();
const MAX_FOTO = 64 * 1024;
const delay = ms => new Promise(r => setTimeout(r, ms));

function normalizarSite(raw) {
  if (!raw) return null;
  const c = String(raw).trim();
  if (!c || /\s/.test(c)) return null;
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(c) ? c : `https://${c}`;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('.')) return null;
    return u;
  } catch {
    return null;
  }
}

function siteVivo(raw) {
  const u = normalizarSite(raw);
  if (!u) return null;
  return lookup(u.hostname).then(() => u).catch(() => null);
}

// Sinônimos de busca por nome (só muda a QUERY; a foto continua sendo
// a de um produto real do catálogo ML correspondente ao nome).
const synonym = {
  'fone bluetooth tws': ['fone de ouvido bluetooth', 'headphone bluetooth'],
  'mochila escolar 6 bolsos': ['mochila escolar infantil', 'mochila escola'],
};

function queriesCandidatas(nome) {
  const lista = [nome];
  const semNumeros = nome
    .replace(/\d+\s?(ml|cm|gb|tb|w|m)\b/gi, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (semNumeros && semNumeros !== nome) lista.push(semNumeros);
  const palavras = (semNumeros || nome).split(/\s+/);
  if (palavras.length > 2) {
    const semUltima = palavras.slice(0, -1).join(' ');
    if (!lista.includes(semUltima)) lista.push(semUltima);
  }
  for (const extra of synonym[nome.toLowerCase()] || []) {
    if (!lista.includes(extra)) lista.push(extra);
  }
  return lista;
}

async function buscarFotoCatalogo(token, nome) {
  for (const q of queriesCandidatas(nome)) {
    try {
      const r = await fetch(
        `https://api.mercadolibre.com/products/search?site_id=MLB&q=${encodeURIComponent(q)}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!r.ok) continue;
      const j = await r.json();
      const comFoto = (j.results || []).find(p => p.pictures?.[0]?.url);
      if (comFoto) {
        return { url: comFoto.pictures[0].url.replace('http://', 'https://'), query: q };
      }
    } catch { /* tenta próxima query */ }
    await delay(700);
  }
  return null;
}

async function baixarImagem(absUrl) {
  try {
    const ctrl = AbortSignal.timeout(8000);
    const r = await fetch(absUrl, { signal: ctrl, redirect: 'follow' });
    if (!r.ok) return null;
    const tipo = r.headers.get('content-type') || '';
    if (!tipo.startsWith('image/')) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_FOTO) return null;
    return `data:${tipo.split(';')[0]};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function baixarFavicon(host) {
  const direto = await baixarImagem(`https://${host}/favicon.ico`) || await baixarImagem(`https://${host}/favicon.png`);
  if (direto) return direto;
  // Fallback: <link rel="icon"> declarado na home.
  try {
    const ctrl = AbortSignal.timeout(8000);
    const r = await fetch(`https://${host}/`, { signal: ctrl, redirect: 'follow' });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 200000);
    const m = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)
      || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["']/i);
    if (!m) return null;
    const alvo = new URL(m[1], `https://${host}/`).toString();
    return await baixarImagem(alvo);
  } catch {
    return null;
  }
}

// ---------- 1) Fotos de produtos (catálogo oficial do ML) ----------
async function popularProdutos() {
  const token = await mlOAuth.getValidAccessToken(1);
  if (!token) {
    console.log('[produtos] sem token ML — pulando.');
    return;
  }
  const produtos = await prisma.catalogProduct.findMany({ select: { id: true, name: true, imageUrl: true } });
  const cache = new Map();
  let atualizados = 0;
  let jaTem = 0;

  for (const p of produtos) {
    if (p.imageUrl) { jaTem++; continue; }
    if (cache.has(p.name)) {
      if (cache.get(p.name)) {
        await prisma.catalogProduct.update({ where: { id: p.id }, data: { imageUrl: cache.get(p.name) } });
        atualizados++;
      }
      continue;
    }
    const achado = await buscarFotoCatalogo(token, p.name);
    const url = achado?.url || null;
    cache.set(p.name, url);
    if (url) {
      await prisma.catalogProduct.update({ where: { id: p.id }, data: { imageUrl: url } });
      atualizados++;
      console.log(`[produtos] "${p.name}" -> foto (q="${achado.query}")`);
    } else {
      console.log(`[produtos] "${p.name}" -> sem foto no catálogo (mantém placeholder)`);
    }
    await delay(900);
  }
  console.log(`[produtos] ${atualizados} novos com foto nesta rodada; ${jaTem} já tinham.`);
}

// ---------- 2) Logos de fornecedores (favicon do site próprio) ----------
async function popularLogos() {
  const fornecedores = await prisma.supplier.findMany({
    where: { siteUrl: { not: null } },
    select: { id: true, name: true, siteUrl: true, logoUrl: true },
  });
  let comLogo = 0;
  let semSite = 0;

  for (const f of fornecedores) {
    if (f.logoUrl) { comLogo++; continue; }
    const url = await siteVivo(f.siteUrl);
    if (!url) { semSite++; continue; }
    const favicon = await baixarFavicon(url.hostname);
    if (favicon) {
      await prisma.supplier.update({ where: { id: f.id }, data: { logoUrl: favicon } });
      comLogo++;
      console.log(`[fornecedores] "${f.name}" -> favicon de ${url.hostname}`);
    } else {
      console.log(`[fornecedores] "${f.name}" -> sem favicon (${url.hostname})`);
    }
    await delay(150);
  }
  console.log(`[fornecedores] ${comLogo} com logo; ${semSite} sites mortos ignorados; total com site: ${fornecedores.length}.`);
}

async function main() {
  console.log('=== Popular fotos reais (ML catálogo + favicon) ===');
  await popularProdutos();
  await popularLogos();
}

main()
  .catch(e => { console.error('ERRO:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
