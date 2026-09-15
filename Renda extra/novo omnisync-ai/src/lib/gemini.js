// ============================================
// gemini.js — assistente OmniAdvisor.
// Com VITE_GEMINI_API_KEY: usa o Google Gemini.
// Sem chave: funciona em modo local com respostas
// simuladas (para o app nunca ficar "quebrado").
// ============================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest';
const API_URL = import.meta.env.VITE_API_URL || null;

const SYSTEM_INSTRUCTION =
  'Você é o OmniAdvisor, assistente de IA do OmniSync AI, um sistema de gestão multicanal ' +
  '(vendas, estoque, financeiro, marketing e logística). Você aconselha o usuário com base em ' +
  'dados de negócio, imagens e capturas de tela que ele enviar. Responda em português, de forma ' +
  'clara, objetiva e estruturada (com listas quando fizer sentido).';

export function hasApiKey() {
  return Boolean(API_KEY);
}

// IA disponível: há backend proxy (API_URL) OU chave direta.
// Usado pelos agentes para decidir entre raciocínio real (Gemini)
// e fallback com regras locais.
export function aiDisponivel() {
  return Boolean(API_URL || API_KEY);
}

// ---------- Respostas locais (modo sem chave) ----------
function respostaLocal(texto, temImagem) {
  const t = texto.toLowerCase();

  if (temImagem) {
    return [
      '📷 Modo local (sem chave do Gemini):',
      'Recebi sua imagem, mas a análise visual completa precisa da chave da API.',
      'Enquanto isso, me descreva o que aparece na imagem que eu te oriento com os dados do sistema.',
    ].join('\n\n');
  }

  if (t.includes('estoque')) {
    return [
      'Dados: 32 produtos estão com estoque abaixo do mínimo.',
      'Motivo: giro acima do previsto e reposição atrasada.',
      'Recomendação: gerar ordem de compra para os SKUs críticos e revisar o estoque de segurança.',
      'Impacto estimado: evita perda de ~R$ 8.400 em vendas.',
    ].join('\n\n');
  }

  if (t.includes('preço') || t.includes('preco')) {
    return [
      'Dados: seu preço médio está 5% acima da concorrência em 12 produtos.',
      'Motivo: reajustes recentes acima do mercado.',
      'Recomendação: reduzir até 4% nos produtos com margem acima de 40% para ganhar competitividade.',
      'Impacto estimado: +18% de conversão nesses itens.',
    ].join('\n\n');
  }

  if (t.includes('margem')) {
    return [
      'Dados: margem média caiu de 28,6% para 24,3% nos últimos 30 dias.',
      'Motivo: aumento do frete em 9% e pressão de preço no marketplace.',
      'Recomendação: renegociar frete com o fornecedor e reajustar 12 produtos com margem abaixo de 20%.',
      'Impacto estimado: +R$ 18.700/mês em margem recuperada.',
    ].join('\n\n');
  }

  if (t.includes('cliente') || t.includes('crm')) {
    return [
      'Dados: você tem 10 clientes na carteira, sendo 4 lojas. Receita em pipeline: R$ 84.100.',
      'Recomendação: priorizar os 2 negócios em "proposta" e reativar a Ana Costa (cliente inativa).',
      'Impacto estimado: +R$ 21.100 em vendas próximas.',
    ].join('\n\n');
  }

  if (t.includes('venda')) {
    return [
      'Dados: faturamento de R$ 248.540 no mês, +12,4% vs anterior.',
      'Recomendação: dobrar o investimento no canal Marketplace (maior crescimento) e ativar remarketing.',
      'Impacto estimado: +R$ 30.000/mês.',
    ].join('\n\n');
  }

  if (t.includes('marketing') || t.includes('publica')) {
    return [
      'Recomendação: postar 4x por semana no Instagram (melhor engajamento) e 2 vídeos no TikTok.',
      'Dica: usar os produtos em alta do Radar de Mercado como tema das publicações.',
    ].join('\n\n');
  }

  return [
    'Modo local (sem chave do Gemini): estou funcionando com respostas simuladas.',
    'Posso ajudar com conselhos de estoque, preço, margem, vendas, clientes e marketing.',
    'Dica: configure VITE_GEMINI_API_KEY no .env para ativar a IA completa.',
  ].join('\n\n');
}

/**
 * Chamada real à API do Gemini (usada quando há chave).
 */
async function askGemini(history, images = []) {
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  if (images.length > 0) {
    const imgParts = images.map(img => ({
      inline_data: { mime_type: img.mimeType, data: img.base64 },
    }));
    const last = contents[contents.length - 1];
    if (last && last.role === 'user') {
      last.parts = [...last.parts, ...imgParts];
    } else {
      contents.push({ role: 'user', parts: [...imgParts] });
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Erro ${res.status} ao chamar a API Gemini.`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
  if (!text) throw new Error('Resposta vazia do Gemini. Tente novamente.');
  return text;
}

/**
 * Ponto de entrada do assistente: usa Gemini quando há
 * chave; caso contrário, responde em modo local.
 */
export async function askAssistant(history, images = []) {
  // 1) Se há backend (VITE_API_URL), usa a rota /api/ai — chave segura no servidor.
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
      return data.texto;
    } catch (e) {
      throw new Error(`Falha ao consultar a IA: ${e.message}`);
    }
  }

  // 2) Sem backend, mas com chave: chama o Gemini direto (uso local).
  if (API_KEY) return askGemini(history, images);

  // 3) Modo local (sem chave): respostas simuladas.
  await new Promise(r => setTimeout(r, 500)); // simula "pensando"
  const ultima = history[history.length - 1]?.text || '';
  return respostaLocal(ultima, images.length > 0);
}
