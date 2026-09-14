// backend/src/aiRouter.js
// Roteador de IA com fallback entre provedores gratuitos.
// Ordem padrão: Gemini -> Groq -> OpenRouter. Cada provedor pode ter
// várias chaves separadas por vírgula (rotação automática de contas
// gratuitas quando o uso diário de uma acaba).
// Todas as chaves vivem só no servidor (env). O frontend nunca as vê.

const SYSTEM_INSTRUCTION =
  'Você é o OmniAdvisor, assistente de IA do OmniSync AI, um sistema de gestão multicanal ' +
  '(vendas, estoque, financeiro, marketing e logística). Você aconselha o usuário com base em ' +
  'dados de negócio, imagens e capturas de tela que ele enviar. Responda em português, de forma ' +
  'clara, objetiva e estruturada (com listas quando fizer sentido).';

// Lista de chaves de uma env (suporta "chave1,chave2" para rotação).
function lerChaves(nome) {
  const raw = process.env[nome] || '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const NOME_ENV = { gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY' };

// Cache de chaves do banco (60s) para não consultar o Neon a cada chamada.
let cacheChavesBanco = { quando: 0, porProvedor: {} };
const CACHE_CHAVES_MS = 60 * 1000;

// Chaves do Neon (tabela ProvedorChave, descriptografadas). Falha = lista vazia.
async function lerChavesBanco(provedor) {
  try {
    const agora = Date.now();
    if (agora - cacheChavesBanco.quando > CACHE_CHAVES_MS) {
      const { prisma } = await import('./prisma/client.js');
      const { descriptografar } = await import('./cripto.js');
      const linhas = await prisma.provedorChave.findMany({ where: { ativo: true } });
      const mapa = { gemini: [], groq: [], openrouter: [] };
      for (const l of linhas) {
        if (!mapa[l.provedor]) continue;
        try {
          mapa[l.provedor].push(descriptografar(l.segredo));
        } catch {
          // Chave ilegível (ex: AUTH_SECRET trocado) — ignorada com segurança.
        }
      }
      cacheChavesBanco = { quando: agora, porProvedor: mapa };
    }
    return cacheChavesBanco.porProvedor[provedor] || [];
  } catch {
    return [];
  }
}

// Junta chaves do banco (primeiro = rotação sem redeploy) com as da env.
async function chavesDoProvedor(provedor) {
  const [banco, env] = await Promise.all([
    lerChavesBanco(provedor),
    Promise.resolve(lerChaves(NOME_ENV[provedor] || '')),
  ]);
  return [...banco, ...env];
}

// Estado operacional por provedor (memória do processo): habilitação
// manual, latência da última chamada, falhas e último uso.
const estadoProvedores = {
  gemini: { ativo: true, latenciaMs: null, falhas: 0, ultimoUso: null, ultimoErro: null },
  groq: { ativo: true, latenciaMs: null, falhas: 0, ultimoUso: null, ultimoErro: null },
  openrouter: { ativo: true, latenciaMs: null, falhas: 0, ultimoUso: null, ultimoErro: null },
};

function provedoresDesabilitados() {
  return (process.env.AI_PROVIDER_DISABLED || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
}

export function definirProvedor(nome, ativo) {
  if (!estadoProvedores[nome]) return false;
  estadoProvedores[nome].ativo = !!ativo;
  return true;
}

async function medir(nome, fn) {
  const inicio = Date.now();
  try {
    const resultado = await fn();
    estadoProvedores[nome].latenciaMs = Date.now() - inicio;
    estadoProvedores[nome].ultimoUso = new Date().toISOString();
    estadoProvedores[nome].ultimoErro = null;
    return resultado;
  } catch (e) {
    estadoProvedores[nome].latenciaMs = Date.now() - inicio;
    estadoProvedores[nome].falhas += 1;
    estadoProvedores[nome].ultimoErro = e.message;
    throw e;
  }
}

// Índice round-robin por provedor (memória do processo).
const indices = { gemini: 0, groga: 0, groq: 0, openrouter: 0 };

function proximaChave(provedor, chaves) {
  if (chaves.length === 0) return null;
  const i = indices[provedor] % chaves.length;
  indices[provedor] += 1;
  return chaves[i];
}

function ehErroDeCota(status, texto) {
  if (status === 429) return true;
  return /quota|rate.?limit|insufficient|exceeded|capacity/i.test(texto || '');
}

// ---------- Provedor 1: Gemini (API nativa) ----------
async function chamarGemini(chave, contents, modelo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }, contents }),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = corpo?.error?.message || `Erro ${r.status}`;
    const erro = new Error(msg);
    erro.status = r.status;
    erro.cota = ehErroDeCota(r.status, msg);
    throw erro;
  }
  const texto = corpo?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
  if (!texto) {
    const erro = new Error('Resposta vazia do Gemini.');
    erro.status = 500;
    erro.cota = false;
    throw erro;
  }
  return texto;
}

// ---------- Provedores OpenAI-compatíveis (Groq, OpenRouter) ----------
async function chamarOpenAICompativel({ baseUrl, chave, modelo, messages, nome }) {
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${chave}`,
      ...(nome === 'openrouter' ? { 'HTTP-Referer': 'https://omnisync-ai.vercel.app', 'X-Title': 'OmniSync AI' } : {}),
    },
    body: JSON.stringify({
      model: modelo,
      messages: [{ role: 'system', content: SYSTEM_INSTRUCTION }, ...messages],
    }),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = corpo?.error?.message || `Erro ${r.status}`;
    const erro = new Error(msg);
    erro.status = r.status;
    erro.cota = ehErroDeCota(r.status, msg);
    throw erro;
  }
  const texto = corpo?.choices?.[0]?.message?.content ?? '';
  if (!texto) {
    const erro = new Error(`Resposta vazia (${nome}).`);
    erro.status = 500;
    erro.cota = false;
    throw erro;
  }
  return texto;
}

// Converte o histórico do frontend para mensagens OpenAI.
function paraMensagens(history, images) {
  const messages = (history || []).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.text,
  }));
  if (images.length > 0 && messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages[messages.length - 1].content = [
      { type: 'text', text: messages[messages.length - 1].content },
      ...images.map(img => ({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } })),
    ];
  }
  return messages;
}

// Conteúdo no formato Gemini (mantido do endpoint original).
function paraConteudosGemini(history, images) {
  const contents = (history || []).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
  if (images.length > 0) {
    const imgParts = images.map(img => ({
      inline_data: { mime_type: img.mimeType, data: img.base64 },
    }));
    const last = contents[contents.length - 1];
    if (last && last.role === 'user') last.parts = [...last.parts, ...imgParts];
    else contents.push({ role: 'user', parts: [...imgParts] });
  }
  return contents;
}

// Ordem configurável: AI_PROVIDER_ORDER="groq,gemini,openrouter" (padrão abaixo).
function ordemProvedores() {
  const raw = (process.env.AI_PROVIDER_ORDER || 'gemini,groq,openrouter').toLowerCase();
  const todos = raw.split(',').map(s => s.trim()).filter(Boolean);
  return todos.length ? todos : ['gemini', 'groq', 'openrouter'];
}

export async function provedoresDisponiveis() {
  const modelos = {
    gemini: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    groq: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    openrouter: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
  };
  const desligados = provedoresDesabilitados();
  const lista = [];
  for (const nome of ['gemini', 'groq', 'openrouter']) {
    const total = (await chavesDoProvedor(nome)).length;
    lista.push({
      nome,
      modelo: modelos[nome],
      configurado: total > 0,
      chaves: total,
      ativo: estadoProvedores[nome].ativo && !desligados.includes(nome),
      latenciaMs: estadoProvedores[nome].latenciaMs,
      falhas: estadoProvedores[nome].falhas,
      ultimoUso: estadoProvedores[nome].ultimoUso,
      ultimoErro: estadoProvedores[nome].ultimoErro,
    });
  }
  return { provedores: lista, ordem: ordemProvedores() };
}

// Teste de conexão: chamada mínima ("Responda só: ok") com medição de latência.
export async function testarProvedor(nome) {
  const chave = proximaChave(nome, await chavesDoProvedor(nome));
  if (!chave) {
    const erro = new Error(`Provedor ${nome} sem chave configurada.`);
    erro.status = 503;
    throw erro;
  }
  const mini = [{ role: 'user', text: 'Responda só: ok' }];
  if (nome === 'gemini') {
    const modelo = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const texto = await medir(nome, () => chamarGemini(chave, paraConteudosGemini(mini, []), modelo));
    return { ok: true, provedor: nome, latenciaMs: estadoProvedores[nome].latenciaMs, resposta: texto.slice(0, 120) };
  }
  const cfg = {
    groq: { baseUrl: 'https://api.groq.com/openai/v1', modelo: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', modelo: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free' },
  }[nome];
  if (!cfg) {
    const erro = new Error(`Provedor desconhecido: ${nome}.`);
    erro.status = 400;
    throw erro;
  }
  const texto = await medir(nome, () => chamarOpenAICompativel({ ...cfg, chave, messages: paraMensagens(mini, []), nome }));
  return { ok: true, provedor: nome, latenciaMs: estadoProvedores[nome].latenciaMs, resposta: texto.slice(0, 120) };
}

// Tenta cada provedor em ordem; em erro de cota/limite, avança para o próximo.
// Erros definitivos (ex: 403, chave inválida) também tentam o próximo,
// pois outra conta pode estar válida.
export async function gerarResposta({ history = [], images = [] }) {
  const modeloGemini = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const modeloGroq = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const modeloOpenRouter = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

  const desligados = provedoresDesabilitados();
  const tentativas = [];
  for (const nome of ordemProvedores()) {
    if (!estadoProvedores[nome] || !estadoProvedores[nome].ativo || desligados.includes(nome)) continue;
    try {
      if (nome === 'gemini') {
        const chave = proximaChave('gemini', await chavesDoProvedor('gemini'));
        if (!chave) continue;
        const texto = await medir(nome, () => chamarGemini(chave, paraConteudosGemini(history, images), modeloGemini));
        return { texto, provedor: 'gemini' };
      }
      if (nome === 'groq') {
        const chave = proximaChave('groq', await chavesDoProvedor('groq'));
        if (!chave) continue;
        const texto = await medir(nome, () => chamarOpenAICompativel({
          baseUrl: 'https://api.groq.com/openai/v1',
          chave,
          modelo: modeloGroq,
          messages: paraMensagens(history, images),
          nome: 'groq',
        }));
        return { texto, provedor: 'groq' };
      }
      if (nome === 'openrouter') {
        const chave = proximaChave('openrouter', await chavesDoProvedor('openrouter'));
        if (!chave) continue;
        const texto = await medir(nome, () => chamarOpenAICompativel({
          baseUrl: 'https://openrouter.ai/api/v1',
          chave,
          modelo: modeloOpenRouter,
          messages: paraMensagens(history, images),
          nome: 'openrouter',
        }));
        return { texto, provedor: 'openrouter' };
      }
    } catch (e) {
      tentativas.push(`${nome}: ${e.message}`);
    }
  }

  if (tentativas.length === 0) {
    const erro = new Error('Nenhum provedor de IA configurado (defina GEMINI_API_KEY, GROQ_API_KEY ou OPENROUTER_API_KEY).');
    erro.status = 503;
    throw erro;
  }
  const erro = new Error(`Todos os provedores falharam: ${tentativas.join(' | ')}`);
  erro.status = 502;
  throw erro;
}
