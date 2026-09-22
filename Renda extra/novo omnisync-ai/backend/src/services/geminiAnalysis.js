// backend/src/services/geminiAnalysis.js
// Camada de análise do Gemini sobre dados REAIS do banco.
// O modelo nunca é fonte de dados: recebe contexto sanitizado e
// devolve análise estruturada. Sem dados suficientes, retorna
// INSUFFICIENT_DATA em vez de inventar. A chave fica no servidor.

import { prisma } from '../prisma/client.js';

const GEMINI_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const TIMEOUT_MS = 60000;
const CONTEXTO_MAX_CHARS = 6000;

const CHAVES_SENSIVEIS = [
  'token', 'secret', 'senha', 'password', 'jwt', 'cookie',
  'authorization', 'apikey', 'api_key', 'clientsecret', 'client_secret',
];

function isSensivel(chave) {
  const k = String(chave).toLowerCase().replace(/[_\s-]/g, '');
  return CHAVES_SENSIVEIS.some(s => k.includes(s.replace(/_/g, '')));
}

// Remove segredos do contexto (1 nível + aninhados simples), sem alterar o original.
export function expurgarSegredos(valor) {
  if (Array.isArray(valor)) return valor.map(expurgarSegredos);
  if (valor && typeof valor === 'object') {
    const limpo = {};
    for (const [k, v] of Object.entries(valor)) {
      if (isSensivel(k)) {
        limpo[k] = '[removido]';
      } else {
        limpo[k] = expurgarSegredos(v);
      }
    }
    return limpo;
  }
  return valor;
}

export function insufficient(tipo, detalhe) {
  return {
    ok: false,
    code: 'INSUFFICIENT_DATA',
    message: 'Ainda não há dados suficientes para gerar uma recomendação confiável.',
    tipo,
    detalhe: detalhe || null,
    dataQuality: 'insufficient',
    generatedAt: new Date().toISOString(),
  };
}

function erroChave(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}

function assertChave() {
  if (!process.env.GEMINI_API_KEY) {
    throw erroChave('GEMINI_NOT_CONFIGURED', 503, 'O assistente de IA ainda não está configurado no servidor.');
  }
}

function extrairJson(texto) {
  const cercado = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidato = (cercado ? cercado[1] : texto).trim();
  const inicio = candidato.indexOf('{');
  const fim = candidato.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) return null;
  try {
    return JSON.parse(candidato.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}

function validarAnalise(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (typeof obj.analysis !== 'string' || !obj.analysis.trim()) return null;
  const recommendations = Array.isArray(obj.recommendations) ? obj.recommendations.filter(r => typeof r === 'string') : [];
  const risks = Array.isArray(obj.risks) ? obj.risks.filter(r => typeof r === 'string') : [];
  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.min(1, Math.max(0, confidence));
  const dq = ['high', 'medium', 'low', 'insufficient'].includes(obj.dataQuality) ? obj.dataQuality : 'medium';
  return { analysis: obj.analysis.trim(), recommendations, risks, confidence, dataQuality: dq };
}

async function chamarGemini(prompt, contexto) {
  assertChave();
  const corpo = {
    systemInstruction: { parts: [{ text: prompt }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(contexto).slice(0, CONTEXTO_MAX_CHARS) }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  };
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(
      `${GEMINI_URL_BASE}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctrl.signal }
    );
    if (!r.ok) {
      if (r.status === 429) throw erroChave('GEMINI_RATE_LIMIT', 429, 'Limite de uso do Gemini atingido.');
      if (r.status === 403) throw erroChave('GEMINI_FORBIDDEN', 403, 'Acesso negado ao Gemini.');
      throw erroChave('GEMINI_REQUEST_FAILED', 500, 'Falha ao consultar o Gemini.');
    }
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
    if (!text) throw erroChave('GEMINI_EMPTY_RESPONSE', 500, 'Resposta vazia do Gemini.');
    const validada = validarAnalise(extrairJson(text));
    if (!validada) throw erroChave('GEMINI_INVALID_RESPONSE', 500, 'Resposta inválida do Gemini.');
    return validada;
  } catch (e) {
    if (e?.name === 'AbortError') throw erroChave('GEMINI_TIMEOUT', 504, 'Tempo esgotado ao consultar o Gemini.');
    if (e?.code) throw e;
    throw erroChave('GEMINI_REQUEST_FAILED', 500, 'Falha ao consultar o Gemini.');
  } finally {
    clearTimeout(timeout);
  }
}

const PROMPT_BASE =
  'Você é o analista do OmniSync AI. Analise SOMENTE os dados JSON recebidos. ' +
  'Nunca invente preços, pedidos, margens, fornecedores ou recomendações sem base nos dados. ' +
  'Responda SOMENTE com JSON válido no formato: ' +
  '{"analysis": "texto em português", "recommendations": ["..."], "risks": ["..."], ' +
  '"confidence": 0.0-1.0, "dataQuality": "high|medium|low|insufficient"}.';

function envelope(tipo, source, resultado) {
  return {
    ok: true,
    tipo,
    ...resultado,
    source,
    generatedAt: new Date().toISOString(),
  };
}

function numero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------- Coletas reais (Prisma) ----------

async function dadosDashboard() {
  const [pedidos, produtos] = await Promise.all([
    prisma.order.findMany(),
    prisma.product.findMany({ select: { id: true, estoque: true, minimo: true, preco: true } }),
  ]);
  return { pedidos, produtos };
}

async function dadosVendas() {
  return prisma.order.findMany({ orderBy: { id: 'asc' } });
}

async function dadosEstoque() {
  return prisma.product.findMany();
}

// ---------- Domínios ----------

const analisadores = {
  async dashboard() {
    const { pedidos, produtos } = await dadosDashboard();
    if (pedidos.length === 0 && produtos.length === 0) {
      return insufficient('dashboard', 'sem pedidos e sem produtos');
    }
    const faturamento = pedidos.reduce((a, p) => a + numero(p.total), 0);
    const emRuptura = produtos.filter(p => numero(p.estoque) <= 0).length;
    const contexto = expurgarSegredos({
      pedidos: pedidos.length, faturamento, produtos: produtos.length, emRuptura,
    });
    const r = await chamarGemini(`${PROMPT_BASE} Contexto: resumo operacional da loja.`, contexto);
    return envelope('dashboard', [{ origem: 'banco', tabelas: ['order', 'product'] }], r);
  },

  async sales() {
    const pedidos = await dadosVendas();
    if (pedidos.length === 0) {
      return insufficient('sales', 'zero pedidos');
    }
    const porStatus = {};
    for (const p of pedidos) porStatus[p.status || 'indefinido'] = (porStatus[p.status || 'indefinido'] || 0) + 1;
    const top = [...pedidos].sort((a, b) => numero(b.total) - numero(a.total)).slice(0, 5)
      .map(p => ({ id: p.id, cliente: p.cliente, total: numero(p.total), status: p.status }));
    const comCusto = pedidos.filter(p => numero(p.custoFornecedor) > 0 || numero(p.taxaMarketplace) > 0 || numero(p.frete) > 0);
    const contexto = expurgarSegredos({
      totalPedidos: pedidos.length,
      faturamento: pedidos.reduce((a, p) => a + numero(p.total), 0),
      porStatus, top,
      baseDeCusto: comCusto.length > 0 ? `${comCusto.length} pedido(s) com custo` : 'ausente — não calcular margem',
    });
    const r = await chamarGemini(`${PROMPT_BASE} Contexto: pedidos reais. Sem base de custo, não apresente margem.`, contexto);
    return envelope('sales', [{ origem: 'banco', tabelas: ['order'] }], r);
  },

  async market(payload = {}) {
    const lista = Array.isArray(payload.produtos) ? payload.produtos : [];
    const validos = lista
      .filter(p => p && typeof p.nome === 'string' && p.nome.trim() && Number.isFinite(Number(p.preco)) && typeof p.fonte === 'string')
      .slice(0, 12)
      .map(p => ({
        nome: String(p.nome).slice(0, 120),
        preco: Number(p.preco),
        moeda: p.moeda || 'desconhecida',
        fonte: String(p.fonte).slice(0, 60),
        vendidos: Number.isFinite(Number(p.vendidos)) ? Number(p.vendidos) : null,
        custo: Number.isFinite(Number(p.custo)) ? Number(p.custo) : null,
      }));
    if (validos.length === 0) {
      return insufficient('market', 'nenhum produto válido com nome, preço e fonte');
    }
    const contexto = expurgarSegredos({
      produtos: validos,
      aviso: 'Sem custo de aquisição em nenhum item, margem é indisponível.',
    });
    const r = await chamarGemini(
      `${PROMPT_BASE} Contexto: produtos observados em fontes públicas. Nunca chame de "alta margem" sem custo. Nunca trate como produtos da loja.`,
      contexto
    );
    return envelope('market', [{ origem: 'seleção do usuário', itens: validos.length }], r);
  },

  async supplier(payload = {}) {
    const id = Number(payload.fornecedorId);
    if (!Number.isInteger(id)) {
      return insufficient('supplier', 'fornecedorId inválido');
    }
    const f = await prisma.fornecedor.findFirst({
      where: { id, empresaId: Number(payload.empresaId) || undefined },
    });
    if (!f) {
      return insufficient('supplier', 'fornecedor não encontrado');
    }
    const contexto = expurgarSegredos({
      nome: f.nome, categoria: f.categoria, endereco: f.endereco, telefone: f.telefone,
      site: f.site, avaliacao: f.avaliacao, quantidadeAvaliacoes: f.quantidadeAvaliacoes,
      fonte: f.fonte, verificado: f.verificado, prazoInformado: f.prazoInformado,
      custoNegociado: f.custoNegociado,
    });
    const r = await chamarGemini(
      `${PROMPT_BASE} Contexto: empresa pública ou fornecedor salvo. Nunca declare confiável sem verificação manual. Sugira perguntas de cotação.`,
      contexto
    );
    return envelope('supplier', [{ origem: 'banco', tabelas: ['fornecedor'] }], r);
  },

  async inventory() {
    const produtos = await dadosEstoque();
    if (produtos.length === 0) {
      return insufficient('inventory', 'zero produtos');
    }
    const criticos = produtos
      .filter(p => numero(p.minimo) > 0 && numero(p.estoque) <= numero(p.minimo))
      .slice(0, 10)
      .map(p => ({ nome: p.nome, sku: p.sku, estoque: numero(p.estoque), minimo: numero(p.minimo) }));
    const zerados = produtos.filter(p => numero(p.estoque) <= 0).length;
    const contexto = expurgarSegredos({
      total: produtos.length, zerados, criticos,
      aviso: 'Sem histórico de vendas e prazo de fornecedor, não sugerir quantidades de compra.',
    });
    const r = await chamarGemini(`${PROMPT_BASE} Contexto: estoque real. Não inventar demanda nem quantidades.`, contexto);
    return envelope('inventory', [{ origem: 'banco', tabelas: ['product'] }], r);
  },

  async order(payload = {}) {
    const id = payload.pedidoId != null ? String(payload.pedidoId) : '';
    if (!id) {
      return insufficient('order', 'pedidoId ausente');
    }
    const p = await prisma.order.findUnique({ where: { id } });
    if (!p) {
      const e = new Error('Pedido não encontrado');
      e.code = 'ORDER_NOT_FOUND';
      e.status = 404;
      throw e;
    }
    const contexto = expurgarSegredos({
      id: p.id, cliente: p.cliente, total: numero(p.total), status: p.status,
      temCusto: numero(p.custoFornecedor) > 0 || numero(p.taxaMarketplace) > 0 || numero(p.frete) > 0,
    });
    const r = await chamarGemini(`${PROMPT_BASE} Contexto: pedido real. Sugerir próxima ação manual; nunca cancelar, reembolsar ou enviar mensagens.`, contexto);
    return envelope('order', [{ origem: 'banco', tabelas: ['order'] }], r);
  },
};

export async function analisarDominio(tipo, ctx = {}) {
  const fn = analisadores[tipo];
  if (!fn) {
    const e = new Error('Domínio de análise desconhecido');
    e.code = 'UNKNOWN_DOMAIN';
    e.status = 400;
    throw e;
  }
  return fn(ctx);
}

export async function gerarRascunhoAnuncio(produtoId) {
  const p = await prisma.product.findUnique({ where: { id: Number(produtoId) } });
  if (!p) {
    const e = new Error('Produto não encontrado');
    e.code = 'PRODUCT_NOT_FOUND';
    e.status = 404;
    throw e;
  }
  const atributos = expurgarSegredos({
    nome: p.nome, sku: p.sku, categoria: p.categoria, preco: numero(p.preco), estoque: numero(p.estoque),
  });
  const r = await chamarGemini(
    `${PROMPT_BASE} Tarefa: gerar RASCUNHO de anúncio (título, descrição, palavras-chave) usando SOMENTE os atributos recebidos. ` +
    'Liste em risks os campos ausentes. Nunca invente especificações, certificações ou garantia. ' +
    'Formato da analysis: "RASCUNHO". Nunca publicar ou alterar nada.',
    atributos
  );
  return {
    ok: true,
    tipo: 'listing-draft',
    draft: { analysis: r.analysis, recommendations: r.recommendations, risks: r.risks },
    confidence: r.confidence,
    dataQuality: r.dataQuality,
    source: [{ origem: 'banco', tabelas: ['product'], produtoId: p.id }],
    generatedAt: new Date().toISOString(),
    rascunho: true,
  };
}
