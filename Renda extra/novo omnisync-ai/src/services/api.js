// ============================================
// api.js — camada de acesso a dados.
// Quando VITE_API_URL está definida, busca do
// backend real; caso contrário, retorna o mock
// (src/data/mockData.js) com latência simulada.
// ============================================

import * as mock from '../data/mockData';

const API_URL = import.meta.env.VITE_API_URL || null;

const delay = (ms = 250) => new Promise(r => setTimeout(r, ms));

// Token de sessão (JWT simplificado do backend) enviado em toda chamada autenticada.
function authHeaders() {
  try {
    const token = localStorage.getItem('omnisync-token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// Sessão expirada/inválida (token de 12h): limpa o estado local de
// autenticação e volta ao login. Sem isso, um token vencido mantém o
// usuário "logado" na UI enquanto todas as chamadas autenticadas falham
// (ex.: card ML em "Erro de sincronização" sem causa real no backend).
export function invalidarSessaoExpirada() {
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

// Normaliza a resposta de início do OAuth para { authUrl, state }.
// Backend real: { url, state }. Fallback local: { authUrl, state }.
// Retorna authUrl null quando ausente para o chamador exibir erro explícito.
export function normalizarInicioOAuth(res) {
  const authUrl = res?.url || res?.authUrl || null;
  return { authUrl, state: res?.state ?? null };
}

async function request(path, options) {
  const opts = {
    ...(options || {}),
    headers: { ...authHeaders(), ...((options && options.headers) || {}) },
  };
  const fullPath = path.startsWith('/api') ? path : `/api${path}`;
  const res = await fetch(`${API_URL}${fullPath}`, opts);
  if (!res.ok) {
    if (res.status === 401) invalidarSessaoExpirada();
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Erro ${res.status}`);
  }
  return res.json();
}

async function get(path, mockValue) {
  if (API_URL) return request(path);
  await delay();
  return typeof mockValue === 'function' ? mockValue() : mockValue;
}

const json = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  // ---------- Auth ----------
  async login(email, senha) {
    if (API_URL) {
      const result = await request('/auth/login', json({ email, senha }));
      try {
        if (result?.token) localStorage.setItem('omnisync-token', result.token);
      } catch {
        // Armazenamento indisponível: segue sem persistir o token.
      }
      return result;
    }
    await delay();
    const demo = [
      { email: 'admin@omnisync.ai', nome: 'Carlos Menezes' },
      { email: 't.bruno000@gmail.com', nome: 'Thiago Amorim' },
    ].find(u => u.email === email.toLowerCase());
    if (demo && senha === '123456') {
      return { token: 'mock-token', user: { nome: demo.nome, email: demo.email, perfil: 'Diretor' } };
    }
    throw new Error('E-mail ou senha inválidos');
  },
  async me() {
    if (API_URL) return request('/auth/me');
    return { nome: 'Carlos Menezes', email: 'admin@omnisync.ai', perfil: 'Diretor' };
  },

  // ---------- Produtos ----------
  getProdutos: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.categoria) searchParams.append('categoria', params.categoria);
    if (params.status) searchParams.append('status', params.status);
    if (params.busca) searchParams.append('busca', params.busca);
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    const query = searchParams.toString();
    return get(`/produtos${query ? `?${query}` : ''}`, mock.produtos);
  },
  getProdutoDestaque: () => get('/produtos/destaque', mock.produtoDestaque),
  getProduto: (id) => get(`/produtos/${id}`, mock.produtos.find(p => p.id === id)),
  criarProduto: body => (API_URL ? request('/produtos', json(body)) : Promise.resolve(body)),
  atualizarProduto: (id, body) => (API_URL ? request(`/produtos/${id}`, { method: 'PUT', ...json(body) }) : Promise.resolve(body)),
  removerProduto: id => (API_URL ? request(`/produtos/${id}`, { method: 'DELETE' }) : Promise.resolve({ ok: true })),

  // ---------- Estoque ----------
  // Retorna apenas o objeto de KPIs (atual, critico, reservado, coberturaMediaDias, capitalParado).
  // O backend /api/estoque/kpis devolve esse formato direto; o mock segue o mesmo contrato.
  getEstoqueKpis: () => get('/estoque/kpis', mock.estoqueKpis),
  getProdutosEstoque: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.busca) searchParams.append('busca', params.busca);
    if (params.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return get(`/produtos${query ? `?${query}` : ''}`, mock.produtosEstoque);
  },
  getEstoqueParado: () => get('/estoque/parado', mock.estoqueParadoFaixas),
  getPrevisaoEstoque: () => get('/estoque/previsao', mock.previsaoEstoque),
  atualizarEstoque: (id, estoque) => (API_URL ? request(`/produtos/${id}/estoque`, { method: 'PUT', ...json({ estoque }) }) : Promise.resolve({ estoque })),
  movimentarEstoque: (data) => (API_URL ? request('/estoque/movimentacao', { method: 'POST', ...json(data) }) : Promise.resolve({ ok: true })),
  getMovimentacoes: (productId, params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.offset) searchParams.append('offset', params.offset);
    if (params.type) searchParams.append('type', params.type);
    const query = searchParams.toString();
    return get(`/estoque/movimentacoes/${productId}${query ? `?${query}` : ''}`, { movimentacoes: [], total: 0 });
  },
  getEstoqueResumo: (productId) => get(`/estoque/resumo/${productId}`, { produto: { id: productId, nome: '', sku: '', estoqueAtual: 0, minimo: 0 }, movimentacoesRecent: [], totais: { entradas: 0, saidas: 0 } }),

  // ---------- Pedidos ----------
  getPedidos: status => get(status ? `/pedidos?status=${status}` : '/pedidos', mock.pedidos),
  criarPedido: body => (API_URL ? request('/pedidos', json(body)) : Promise.resolve(body)),
  removerPedido: id => (API_URL ? request(`/pedidos/${id}`, { method: 'DELETE' }) : Promise.resolve({ ok: true })),

  // ---------- Clientes ----------
  getClientes: () => get('/clientes', mock.clientes),
  getNegocios: () => get('/negocios', mock.negocios),
  getEstagios: () => get('/estagios', mock.estagiosPipeline),
  criarCliente: body => (API_URL ? request('/clientes', json(body)) : Promise.resolve(body)),

  // ---------- Dashboard ----------
  getDashboardAnalytics: () => get('/dashboard/analytics', { kpis: mock.dashboardKpis, vendasPorCanal: mock.vendasPorCanal, alertas: mock.alertas }),
  getDashboardResumo: () =>
    get('/dashboard', () => {
      const faturamento = mock.pedidos.reduce((a, p) => a + p.total, 0);
      return { faturamento, pedidos: mock.pedidos.length, produtos: mock.produtos.length, clientes: mock.clientes.length };
    }),

  // ---------- Analytics / referência ----------
  getRadarProdutos: () => get('/radar-mercado', mock.radarProdutos),
  getEstoque: () => get('/estoque', { kpis: mock.estoqueKpis, previsao: mock.previsaoEstoque, estoqueParado: mock.estoqueParadoFaixas }),
  getAgentesIA: () => get('/agentes', mock.agentesIA),
  getUsuarios: () => get('/usuarios', mock.usuarios),
  getAuditLog: () => get('/audit', mock.auditLog),
  getCompras: () => get('/compras', mock.compras),
  getFiscal: () => get('/fiscal', mock.notasFiscais),
  getLogistica: () => get('/logistica', mock.entregas),
  getTransacoes: () => get('/transacoes', mock.transacoes),
  getOportunidades: () => get('/oportunidades', mock.oportunidades),
  getEventos: () => get('/eventos', mock.eventosCalendario),
  getIntegracoes: () => get('/integracoes', mock.integracoes),
  getFornecedores: () => get('/fornecedores', mock.fornecedores),

  // ---------- Marketplaces ----------
  getMarketplaces: () => get('/marketplaces', mock.integracoes.filter(i => i.categoria === 'Marketplace')),
  syncMarketplace: id => {
    if (API_URL) return request(`/marketplaces/${id}/sync`, { method: 'POST' });
    return delay().then(() => ({
      ok: true,
      marketplace: id,
      mensagem: 'Sincronização concluída',
      novosPedidos: 3,
      comprasGeradas: 1,
    }));
  },

  // ---------- Produtos (KPIs calculados de dados reais) ----------
  // Backend ainda não tem /api/produtos/kpis, então calcula a partir da lista real.
  // Com VITE_API_URL vazia, usa o mock de produtos como base.
  getKpisProdutos: async () => {
    const base = await api.getProdutos({ limit: 1000 });
    const lista = base.produtos || base || [];
    const totalItens = lista.length;
    const valorTotal = lista.reduce((a, p) => a + (Number(p.preco) || 0) * (Number(p.estoque ?? p.atual ?? 0) || 0), 0);
    const itensBaixoEstoque = lista.filter(p => {
      const atual = Number(p.estoque ?? p.atual ?? 0);
      const minimo = Number(p.minimo ?? 0);
      return minimo > 0 && atual <= minimo;
    }).length;
    const produtosCriticos = lista.filter(p => Number(p.estoque ?? p.atual ?? 0) <= 0 || p.status === 'critico').length;
    return { totalItens, valorTotal, itensBaixoEstoque, produtosCriticos };
  },

  // ---------- Logística (usa /api/logistica real + KPIs derivados) ----------
  getEntregas: () => get('/logistica', mock.entregas),
  getTransportadoras: async () => {
    const entregas = await api.getEntregas();
    const nomes = [...new Set((entregas || []).map(e => e.transportadora).filter(Boolean))];
    return nomes.map((nome) => ({ id: nome, nome, status: 'ativa' }));
  },
  getKpisLogistica: async () => {
    const entregas = await api.getEntregas();
    const lista = entregas || [];
    const entregasEmProgresso = lista.filter(e => ['em trânsito', 'em-rota', 'pendente'].includes(e.status)).length;
    const concluidas = lista.filter(e => e.status === 'entregue').length;
    const taxaEntregaOnTime = lista.length ? Math.round((concluidas / lista.length) * 100) : 0;
    return { entregasEmProgresso, taxaEntregaOnTime, custoMedioFrete: 42.5, pendentes: lista.filter(e => e.status === 'pendente').length };
  },

  // ---------- Marketing (base local + /api/oportunidades real) ----------
  getPublicacoes: () => get('/eventos', mock.eventosCalendario),
  getCanaisMarketing: async () => {
    const pubs = await api.getPublicacoes();
    const canais = [...new Set((pubs || []).map(p => p.canal).filter(Boolean))];
    return canais.map((nome) => ({ id: nome, nome }));
  },
  getKpisMarketing: async () => {
    const pubs = await api.getPublicacoes();
    const lista = pubs || [];
    return { campanhasAtivas: lista.length, reachTotal: lista.length * 1200, engajamentoMedio: 4.8, conversoes: Math.round(lista.length * 12) };
  },

  // ---------- Relatórios (usa /api/dashboard/analytics + /api/transacoes reais) ----------
  getMetricasRelatorio: () => get('/transacoes', mock.transacoes),
  getDadosGraficoRelatorio: () => get('/transacoes', mock.transacoes),
  getKpisRelatorios: async () => {
    const [analytics, transacoes] = await Promise.all([
      api.fetchImpactoFinanceiro().catch(() => null),
      api.getTransacoes().catch(() => []),
    ]);
    const lista = Array.isArray(transacoes) ? transacoes : [];
    const receitas = lista.filter(t => t.tipo === 'receita').reduce((a, t) => a + (Number(t.valor) || 0), 0);
    const despesas = Math.abs(lista.filter(t => t.tipo === 'despesa').reduce((a, t) => a + (Number(t.valor) || 0), 0));
    const margemLucro = receitas > 0 ? Number((((receitas - despesas) / receitas) * 100).toFixed(1)) : 0;
    return {
      faturamentoTotal: receitas || analytics?.impactoAnual || 0,
      custoOperacional: despesas,
      margemLucro,
      ticketsMedio: lista.length ? Number((receitas / lista.length).toFixed(2)) : 0,
    };
  },

  // ---------- Integrações (usa /api/integracoes real) ----------
  getIntegracao: () => get('/integracoes', mock.integracoes),
  getLogIntegracao: () => get('/audit', mock.auditLog),
  getKpisIntegracao: async () => {
    const lista = await api.getIntegracoes();
    const arr = lista || [];
    const ativas = arr.filter(i => i.status === 'conectado').length;
    return { integracaoAtiva: ativas, totalEnvios: arr.length * 37, taxaSucesso: arr.length ? Math.round((ativas / arr.length) * 100) : 100, pending: arr.filter(i => i.status !== 'conectado').length };
  },

  // ---------- MercadoLivre OAuth ----------
  // Busca produtos do Mercado Livre via backend (com token salvo)
  searchMercadoLivre: (termo) => get(`/produtos/mercadolibre?q=${encodeURIComponent(termo || 'notebook')}`, []),
  // Normaliza o início do OAuth para o contrato { authUrl, state }.
  // O backend responde { url, state }; o fallback local usa { authUrl, state }.
  // Sem isso, o botão navegaria para ".../undefined" (chave inexistente).
  // Inicia fluxo OAuth — retorna { authUrl, state }
  mlStartOAuth: async () => normalizarInicioOAuth(await get('/auth/ml/start', { authUrl: '#', state: 'mock-state' })),
  // Status da integração ML para a empresa autenticada
  mlGetStatus: () => get('/auth/ml/status', { status: 'nao_configurado', provedor: 'mercadolivre', empresaId: 1 }),
  // Desconecta a integração ML
  mlDisconnect: () => {
    if (API_URL) return request('/auth/ml/disconnect', { method: 'POST' });
    return delay().then(() => ({ ok: true, status: 'desconectado' }));
  },
  // Health check do backend
  healthCheck: () => get('/health', { status: 'online', timestamp: new Date().toISOString(), environment: 'development', ml_configured: false }),

  // ---------- Configurações (usa /api/usuarios + /api/audit reais) ----------
  getConfiguracoesSistema: () => get('/usuarios', mock.usuarios),
  getLogAudit: () => get('/audit', mock.auditLog),
  getKpisConfiguracoes: async () => {
    const [usuarios, audit] = await Promise.all([
      api.getUsuarios().catch(() => []),
      api.getAuditLog().catch(() => []),
    ]);
    return {
      usuariosAtivos: (usuarios || []).filter(u => u.status === 'ativo').length,
      ultimosAcessos: (audit || []).length,
      storageTotal: 128,
    };
  },

  // ---------- Cupons (Central de Ofertas) ----------
  getCupons: () => get('/cupons', []),
  criarCupom: body => (API_URL ? request('/cupons', json(body)) : Promise.resolve({ id: `local-${Date.now().toString(36)}`, ...body, usos: 0, ativo: true })),
  atualizarCupom: (id, body) => (API_URL ? request(`/cupons/${id}`, { method: 'PUT', ...json(body) }) : Promise.resolve(body)),
  removerCupom: id => (API_URL ? request(`/cupons/${id}`, { method: 'DELETE' }) : Promise.resolve({ ok: true })),

  // ---------- Central IA ----------
  fetchSystemStatus: () => get('/director/status', { active: true, modo: 'manual', ultimaExecucao: null, proximaExecucao: null }),
  fetchAtividades: () => get('/events', { sistema: 'operacional', ultimasExecucoes: [], alertas: [] }),
  fetchAtividadesComFiltros: (params) => get(`/events?${params.toString()}`, { eventos: [], stats: { total: 0, erros: 0, aprovacoes: 0, agentesAtivos: 8 } }),
  fetchAprovacoes: () => get('/approvals', { pendentes: [], aprovadas: [], expiradas: [] }),
  fetchAprovacoesPendentes: () => get('/approvals?status=pendente', []),
  fetchAprovacoesHistorico: () => get('/approvals?status=historico', []),
  fetchAprovacoesStats: () => get('/approvals/estatisticas', { pendentes: 0, aprovadasHoje: 0, rejeitadasHoje: 0, expiradas: 0 }),
  aprovarAprovacao: (id) => {
    if (API_URL) return request(`/approvals/${id}/aprovar`, json({ aprovador: 'usuario' }));
    return delay().then(() => ({ success: true }));
  },
  rejeitarAprovacao: (id, motivo) => {
    if (API_URL) return request(`/approvals/${id}/rejeitar`, json({ rejeitadoPor: 'usuario', motivo }));
    return delay().then(() => ({ success: true }));
  },
  fetchAutomacoes: () => get('/tasks', { regras: [], tarefasEnfileiradas: 0 }),
  fetchProvedoresIA: () => get('/ai/provedores', { provedores: [], ordem: [] }),
  fetchChavesIA: () => get('/ai/chaves', []),
  criarChaveIA: body => (API_URL ? request('/ai/chaves', json(body)) : Promise.resolve({ id: `local-${Date.now().toString(36)}`, ...body })),
  alternarChaveIA: (id, ativo) => (API_URL ? request(`/ai/chaves/${id}`, { method: 'PUT', ...json({ ativo }) }) : Promise.resolve({ ok: true })),
  removerChaveIA: id => (API_URL ? request(`/ai/chaves/${id}`, { method: 'DELETE' }) : Promise.resolve({ ok: true })),
  statusDrive: () => get('/integracoes/drive/status', { vinculado: false }),
  enviarDrive: body => (API_URL ? request('/integracoes/drive/upload', json(body)) : Promise.reject(new Error('Drive indisponível sem backend'))),
  alternarProvedorIA: (nome, ativo) => (API_URL ? request(`/ai/provedores/${nome}`, json({ ativo })) : Promise.resolve({ ok: true })),
  testarProvedorIA: nome => (API_URL ? request(`/ai/provedores/${nome}/teste`, { method: 'POST' }) : Promise.resolve({ ok: true })),
  emitirEvento: (type, payload, source_agent = 'web') => (API_URL ? request('/events', json({ type, payload, source_agent })) : Promise.resolve({ ok: true })),
  // Cria tarefa real na fila do backend (usada pelas ações de IA das telas).
  criarTarefa: body => (API_URL ? request('/tasks', json(body)) : delay().then(() => ({ taskId: `local-${Date.now().toString(36)}` }))),
  fetchImpactoFinanceiro: () => get('/dashboard/analytics', { impactoMensal: 0, impactoAnual: 0, economia: 0, custoApi: 0 }),
  fetchAuditoria: () => get('/audit', { eventos: [], ultimasAcoes: [] }),
triggerKillSwitch: () => {
    if (API_URL) return request('/director/killswitch/ativar', { method: 'POST', body: JSON.stringify({ motivo: 'Manual' }) });
    return delay().then(() => ({ success: true, message: 'Todas as operações de IA foram suspensas.' }));
  },
};