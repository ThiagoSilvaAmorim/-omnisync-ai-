// ============================================
// gemini.js — assistente OmniAdvisor via backend.
// A chave do Gemini fica SOMENTE no servidor
// (process.env.GEMINI_API_KEY). Este módulo nunca
// usa VITE_GEMINI_API_KEY e nunca fabrica respostas
// simuladas: sem backend ou sem chave, lança erro
// explícito para a UI exibir "IA não configurada".
// ============================================

// Leitura preguiçosa para permitir rotação sem rebuild e testes.
const apiUrl = () => import.meta.env.VITE_API_URL || null;

function authHeaders() {
  try {
    const token = localStorage.getItem('omnisync-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// Há backend configurado para o proxy de IA.
// A disponibilidade real é confirmada a cada resposta.
export function aiDisponivel() {
  return Boolean(apiUrl());
}

// Sessão inválida/expirada: limpa o estado local e volta ao login.
// (Mesma regra de services/api.js, duplicada aqui para não puxar
// o bundle de dados para o widget de chat.)
function sessaoExpirada() {
  try {
    localStorage.removeItem('omnisync-token');
    localStorage.removeItem('omnisync-user');
  } catch {
    // Armazenamento indisponível: segue sem limpar.
  }
  if (typeof window !== 'undefined' && window.location && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

/**
 * Ponto de entrada do assistente: chama POST /api/ai do backend
 * com o JWT do usuário. Retorna o texto real do Gemini.
 * Nunca retorna resposta simulada.
 */
export async function askAssistant(history, images = []) {
  const base = apiUrl();
  if (!base) {
    throw new Error('IA não configurada no servidor.');
  }

  let res;
  try {
    res = await fetch(`${base}/api/ai`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, images }),
    });
  } catch (e) {
    throw new Error(`Falha ao consultar a IA: ${e.message}`);
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    sessaoExpirada();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    if (data?.code === 'GEMINI_NOT_CONFIGURED') {
      throw new Error('IA não configurada no servidor.');
    }
    throw new Error(`Falha ao consultar a IA: ${data?.error || `Erro ${res.status}`}`);
  }

  const answer = data?.answer ?? data?.texto ?? '';
  if (!answer) throw new Error('Resposta vazia do Gemini.');
  return answer;
}
