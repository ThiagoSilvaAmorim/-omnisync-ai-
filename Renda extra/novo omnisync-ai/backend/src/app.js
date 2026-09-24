import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as data from './data.js';
import { eventBus, emitEvent, EVENT_TYPES } from './eventBus.js';
import { taskQueue, TASK_ACTIONS } from './taskQueue.js';
import { riskEngine } from './riskEngine.js';
import { approvalEngine } from './approvalEngine.js';
import { prisma } from './prisma/client.js';
import { assinarToken, usuarioDoRequest } from './auth.js';
import productRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import supplierRoutes from './routes/suppliers.js';
import supplierOsmRoutes from './routes/suppliersOsm.js';
import ibgeRoutes from './routes/ibge.js';
import mlAuthRoutes from './routes/mlAuth.js';
import mlItemsRoutes from './routes/mlItems.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import negocioRoutes, { ESTAGIOS as negocioEstagios } from './routes/negocios.js';
import shopeeAuthRoutes from './routes/shopeeAuth.js';
import tiktokShopAuthRoutes from './routes/tiktokShopAuth.js';
import aiAnalysisRoutes from './routes/aiAnalysis.js';
import cupomRoutes from './routes/cupons.js';
import problemaRoutes from './routes/problemas.js';
import metaRoutes from './routes/metas.js';

// ============================================
// app.js — Express app com as rotas da API.
// Exportado para testes (supertest); o servidor
// de fato é iniciado em index.js.
// ============================================

const app = express();

// Cabeçalhos de segurança (CSP, X-Frame, etc.). CSP flexível porque a API
// só retorna JSON e o front é servido pelo Vercel.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json());

// Rate limiting: proteção contra abuso (300 req/15min por IP).
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
});

// Rate limit mais rigoroso para o endpoint AI (10 req/min por IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de uso do AI atingido. Tente em um minuto.' },
});

// Cache control middleware - respostas GET são cacheáveis por 1s em dev/prod
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=1, stale-while-revalidate=30');
  }
  next();
});

// ============================================
// Fim do middleware de cache e rate limiting
// ============================================

// Middleware de RBAC — define req.user a partir do token ou sessão.
// Em produção, viria do JWT. Para o protótipo, usamos o perfil do usuário logado.
function requireAuth(perfisPermitidos = []) {
  return async (req, res, next) => {
    try {
      // Simulação: tenta ler usuário do corpo ou usa um usuário "padrão"
      const userData = req.body.usuario || req.query.usuario || { id: 1, nome: 'Admin', perfil: 'Admin', mfaConfigurado: true };
      
      // Verificação de MFA para perfis sensíveis
      if (!userData.mfaConfigurado && perfisPermitidos.includes(userData.perfil)) {
        return res.status(403).json({ error: 'MFA necessário para esta operação' });
      }
      
      req.user = {
        id: userData.id,
        nome: userData.nome,
        email: userData.email,
        perfil: userData.perfil,
        mfaConfigurado: userData.mfaConfigurado || false,
      };
      
      // Verificação de perfil
      if (perfisPermitidos.length > 0 && !perfisPermitidos.includes(req.user.perfil)) {
        return res.status(403).json({ error: 'Permissão negada. Perfis permitidos: ' + perfisPermitidos.join(', ') });
      }
      
      next();
    } catch (err) {
      next(err);
    }
  };
}
// ---------- Fim do middleware RBAC ----------

// Log de requisições (para monitorar a API).
app.use('/api', (req, _res, next) => {
  console.log(`[LOG] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  const metrics = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  res.json(metrics);
});

// Protected routes - require authentication
app.use('/api/protected', requireAuth());

// Rotas de Produtos (CRUD completo + estoque)
app.use('/api/produtos', productRoutes);

// Rotas de Estoque (movimentações)
app.use('/api/estoque', stockRoutes);

// ---------- Pedidos ----------
app.get('/api/pedidos', async (req, res) => {
  const { status } = req.query;
  const pedidos = await prisma.order.findMany({
    where: status ? { status } : {},
    orderBy: { id: 'asc' },
  });
  res.json(pedidos);
});

app.post('/api/pedidos', async (req, res) => {
  const { id, cliente, data, total, itens, status } = req.body;
  if (!id || !cliente) return res.status(400).json({ error: 'Campos id e cliente são obrigatórios' });
  const pedido = await prisma.order.create({
    data: { id, cliente, data: data || new Date().toISOString().slice(0, 10), total: Number(total) || 0, itens: Number(itens) || 1, status: status || 'pendente' },
  });
  res.status(201).json(pedido);
});

app.delete('/api/pedidos/:id', async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Pedido não encontrado' });
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[API] Erro ao excluir pedido:', e.message);
    res.status(500).json({ error: 'Erro ao excluir pedido' });
  }
});

// ---------- Clientes ----------
app.get('/api/clientes', async (req, res) => {
  const clientes = await prisma.customer.findMany({ orderBy: { id: 'asc' } });
  res.json(clientes);
});

app.post('/api/clientes', async (req, res) => {
  const { nome, email, telefone, cidade, status } = req.body;
  if (!nome || !email) return res.status(400).json({ error: 'Campos nome e email são obrigatórios' });
  const cliente = await prisma.customer.create({
    data: { nome, email, telefone: telefone || '', cidade: cidade || '', totalPedidos: 0, totalGasto: 0, status: status || 'novo' },
  });
  res.status(201).json(cliente);
});

app.delete('/api/clientes/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID inválido' });
  const atual = await prisma.customer.findUnique({ where: { id } });
  if (!atual) return res.status(404).json({ error: 'Cliente não encontrado' });
  await prisma.customer.delete({ where: { id } });
  res.json({ ok: true, id });
});

// ---------- Dashboard (resumo) ----------
app.get('/api/dashboard', async (req, res) => {
  const [produtos, pedidos, clientes] = await Promise.all([
    prisma.product.count(),
    prisma.order.findMany(),
    prisma.customer.count(),
  ]);
  const faturamento = Math.round(pedidos.reduce((acc, p) => acc + p.total, 0) * 100) / 100;
  res.json({ faturamento, pedidos: pedidos.length, produtos, clientes });
});

// ---------- Endpoints estáticos (analytics/referência) ----------
const send = payload => (_req, res) => res.json(payload);

app.get('/api/radar-mercado', send(data.radarProdutos));
app.get('/api/estoque', send(data.estoque));
app.get('/api/agentes', send(data.agentesIA));
app.get('/api/usuarios', send(data.usuarios));
app.get('/api/audit', send(data.auditLog));
app.get('/api/compras', async (_req, res) => {
  try {
    const compras = await prisma.purchaseOrder.findMany({ orderBy: { data: 'desc' } });
    res.json(compras);
  } catch (e) {
    console.error('[API] Erro ao listar compras, usando fallback estático:', e.message);
    res.json(data.compras);
  }
});
app.get('/api/fiscal', async (_req, res) => {
  try {
    const notas = await prisma.notaFiscal.findMany({ orderBy: { id: 'desc' } });
    res.json(notas);
  } catch (e) {
    console.error('[API] Erro ao listar notas fiscais, usando fallback estático:', e.message);
    res.json(data.notasFiscais);
  }
});
app.get('/api/logistica', send(data.entregas));
app.get('/api/transacoes', async (_req, res) => {
  try {
    const [pedidos, compras] = await Promise.all([
      prisma.order.findMany({ orderBy: { data: 'desc' } }),
      prisma.purchaseOrder.findMany({ orderBy: { data: 'desc' } }),
    ]);
    const receitas = pedidos.map(p => ({ id: `PED-${p.id}`, tipo: 'receita', descricao: `Venda ${p.id} — ${p.cliente}`, categoria: 'Vendas', data: p.data, valor: Number(p.total) || 0 }));
    const despesas = compras.map(c => ({ id: `OC-${c.id}`, tipo: 'despesa', descricao: `Compra ${c.id} — ${c.fornecedor}`, categoria: 'Compras', data: c.data, valor: -Math.abs(Number(c.total) || 0) }));
    res.json([...receitas, ...despesas]);
  } catch (e) {
    console.error('[API] Erro ao montar transações, usando fallback estático:', e.message);
    res.json(data.transacoes);
  }
});
app.get('/api/oportunidades', send(data.oportunidades));
app.get('/api/eventos', send(data.eventosCalendario));
app.get('/api/integracoes', send(data.integracoes));
// Fornecedores reais: lista salva + verificação manual. Substitui o mock estático.
app.use('/api/fornecedores', supplierRoutes);
// Fornecedores públicos OSM (Nominatim + Overpass) — base local em suppliers.
app.use('/api/suppliers', supplierOsmRoutes);

// Municípios oficiais por UF (IBGE, cache 24h).
app.use('/api/ibge', ibgeRoutes);
// B.O.s reais (router de problemas com auth). Substitui o mock estático.
app.use('/api/negocios', negocioRoutes);
// Estágios são vocabulário fixo do domínio (fonte única no router de negócios).
app.get('/api/estagios', (_req, res) => {
  res.json(negocioEstagios);
});
// ---------- Dashboard analytics (agregados reais do banco) ----------
// Sem período comparável definido: delta sempre null → UI exibe
// "Sem histórico" em vez de percentual inventado. Sem pedidos, os
// totais são zero e a lista de KPIs só inclui lucro quando há base
// de custo real em ao menos um pedido.
app.get('/api/dashboard/analytics', async (_req, res) => {
  try {
    const pedidos = await prisma.order.findMany();
    const faturamento = pedidos.reduce((a, p) => a + (Number(p.total) || 0), 0);
    const ticketMedio = pedidos.length ? faturamento / pedidos.length : 0;
    const comCusto = pedidos.filter(p =>
      Number(p.custoFornecedor) > 0 || Number(p.taxaMarketplace) > 0 || Number(p.frete) > 0
    );
    const kpis = [
      { id: 'faturamento', label: 'Faturamento', value: Math.round(faturamento * 100) / 100, format: 'currency', delta: null },
      { id: 'pedidos', label: 'Pedidos', value: pedidos.length, format: 'number', delta: null },
      { id: 'ticketMedio', label: 'Ticket médio', value: Math.round(ticketMedio * 100) / 100, format: 'currency', delta: null },
    ];
    if (comCusto.length > 0) {
      const lucro = comCusto.reduce((a, p) =>
        a + Number(p.total || 0) - Number(p.custoFornecedor || 0) - Number(p.taxaMarketplace || 0) - Number(p.frete || 0), 0);
      kpis.push({ id: 'lucroEstimado', label: 'Lucro estimado', value: Math.round(lucro * 100) / 100, format: 'currency', delta: null });
    }
    res.json({ kpis, vendasPorCanal: [], alertas: [] });
  } catch (e) {
    console.error('[Analytics] Erro ao agregar:', e.message);
    res.status(500).json({ error: 'Erro ao carregar analytics' });
  }
});

// ---------- Auth (token assinado + perfil) ----------
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body;
  if (email?.toLowerCase() === 'admin@omnisync.ai' && senha === '123456') {
    const user = { nome: 'Carlos Menezes', email: 'admin@omnisync.ai', perfil: 'Diretor' };
    return res.json({ token: assinarToken(user), user });
  }
  if (email?.toLowerCase() === 't.bruno000@gmail.com' && senha === '123456') {
    const user = { nome: 'Thiago Amorim', email: 't.bruno000@gmail.com', perfil: 'Diretor' };
    return res.json({ token: assinarToken(user), user });
  }
  res.status(401).json({ error: 'E-mail ou senha inválidos' });
});

// Retorna o usuário dono do token (usado pelo frontend para validar a sessão).
app.get('/api/auth/me', (req, res) => {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Token inválido ou expirado' });
  res.json({ nome: user.nome, email: user.email, perfil: user.perfil });
});

// ---------- Mercado Livre OAuth ----------
app.use('/api/auth/ml', mlAuthRoutes);

// ---------- Mercado Livre escrita (sempre com aprovação prévia) ----------
app.use('/api/ml', mlItemsRoutes);

// ---------- Ordens de compra (rascunho + aprovação manual, sem envio automático) ----------
app.use('/api/purchase-orders', purchaseOrderRoutes);

// ---------- Análises Gemini sobre dados reais (somente leitura + rascunho) ----------
app.use('/api/ai', aiAnalysisRoutes);

// ---------- Cupons de desconto (Promoções) ----------
app.use('/api/cupons', cupomRoutes);

// ---------- Central de B.O. (problemas operacionais) ----------
app.use('/api/problemas', problemaRoutes);

// ---------- Metas do negócio ----------
app.use('/api/metas', metaRoutes);

// ---------- Shopee / TikTok Shop (somente preparação) ----------
app.use('/api/auth/shopee', shopeeAuthRoutes);
app.use('/api/auth/tiktok-shop', tiktokShopAuthRoutes);

// ---------- Marketplaces (pronto para integração real) ----------
app.get('/api/marketplaces', (_req, res) => {
  res.json(data.integracoes.filter(i => i.categoria === 'Marketplace'));
});

app.post('/api/marketplaces/:id/sync', (req, res) => {
  const { id } = req.params;
  // TODO: substituir por chamada real à API do marketplace (Mercado Livre, Shopee, Amazon...).
  // Simula: importa pedidos novos e gera ordem de compra automática para reposição.
  res.json({
    ok: true,
    marketplace: id,
    mensagem: 'Sincronização concluída',
    novosPedidos: 3,
    comprasGeradas: 1,
    timestamp: new Date().toISOString(),
  });
});

// ---------- Event Bus ----------
app.get('/api/events', (req, res) => {
  const { type, source_agent, correlation_id, since, limit } = req.query;
  const events = eventBus.getEvents({
    type,
    source_agent,
    correlation_id,
    since,
    limit: limit ? Number(limit) : 100,
  });
  res.json(events);
});

app.post('/api/events', async (req, res) => {
  const { type, payload, source_agent, ...options } = req.body;
  if (!type || !source_agent) {
    return res.status(400).json({ error: 'type e source_agent são obrigatórios' });
  }
  const result = await emitEvent(type, payload, source_agent, options);
  res.status(result.duplicated ? 200 : 201).json(result);
});

app.get('/api/events/types', (_req, res) => {
  res.json(EVENT_TYPES);
});

// ---------- Task Queue ----------
app.get('/api/tasks', (req, res) => {
  const { agentId, status, limit } = req.query;
  let tasks;
  if (agentId) tasks = taskQueue.getTasksByAgent(agentId, limit ? Number(limit) : 100);
  else if (status === 'pending') tasks = taskQueue.getPendingTasks(limit ? Number(limit) : 50);
  else if (status === 'dead_letter') tasks = taskQueue.getDeadLetters(limit ? Number(limit) : 100);
  else tasks = taskQueue.queue.slice(-100);
  res.json(tasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const task = taskQueue.getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
  res.json(task);
});

app.post('/api/tasks', (req, res) => {
  const { agentId, action, entityType, entityId, payload, priority, idempotencyKey, maxRetries, correlationId, causationId } = req.body;
  if (!agentId || !action) {
    return res.status(400).json({ error: 'agentId e action são obrigatórios' });
  }
  const result = taskQueue.enqueue({ agentId, action, entityType, entityId, payload, priority, idempotencyKey, maxRetries, correlationId, causationId });
  res.status(result.duplicate ? 200 : 201).json(result);
});

app.post('/api/tasks/:id/retry', (req, res) => {
  const ok = taskQueue.retryTask(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Tarefa não encontrada ou não pode ser retentada' });
  res.json({ ok: true });
});

app.post('/api/tasks/:id/cancel', (req, res) => {
  const ok = taskQueue.cancelTask(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Tarefa não encontrada ou não pode ser cancelada' });
  res.json({ ok: true });
});

app.get('/api/tasks/actions/list', (_req, res) => {
  res.json(TASK_ACTIONS);
});

// ---------- Director IA ----------
import { directorIA } from './directorIA.js';

app.get('/api/director/status', (_req, res) => {
  res.json(directorIA.getSchedulerStatus());
});

app.get('/api/director/historico', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  res.json(directorIA.getHistorico(limit));
});

app.get('/api/director/politicas', (_req, res) => {
  res.json(directorIA.getPoliticas());
});

app.post('/api/director/modo', (req, res) => {
  const { modo } = req.body;
  if (!modo) return res.status(400).json({ error: 'modo é obrigatório' });
  try {
    const result = directorIA.setModoGlobal(modo);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/director/killswitch/ativar', (req, res) => {
  const { motivo } = req.body;
  res.json(directorIA.ativarKillSwitch(motivo));
});

app.post('/api/director/killswitch/desativar', (req, res) => {
  const { motivo } = req.body;
  res.json(directorIA.desativarKillSwitch(motivo));
});

app.post('/api/director/executar-agora', async (_req, res) => {
  const result = await directorIA.executarCiclo();
  res.json(result);
});

app.post('/api/director/politicas', (req, res) => {
  const { chave, config } = req.body;
  if (!chave || !config) return res.status(400).json({ error: 'chave e config são obrigatórios' });
  res.json(directorIA.atualizarPolitica(chave, config));
});

// ---------- Risk Engine ----------
app.post('/api/risk/avaliar', (req, res) => {
  const { agente, action, payload, valorEstimado } = req.body;
  if (!agente || !action) {
    return res.status(400).json({ error: 'agente e action são obrigatórios' });
  }
  const avaliacao = riskEngine.avaliar({ agente, action, payload, valorEstimado: valorEstimado || 0 });
  res.json(avaliacao);
});

app.get('/api/risk/estatisticas', (_req, res) => {
  res.json(riskEngine.getEstatisticas());
});

app.get('/api/risk/historico', (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json(riskEngine.getHistorico(limit));
});

app.post('/api/risk/limites', (req, res) => {
  const { chave, valor } = req.body;
  if (!chave || valor === undefined) {
    return res.status(400).json({ error: 'chave e valor são obrigatórios' });
  }
  const ok = riskEngine.atualizarLimite(chave, valor);
  if (!ok) return res.status(400).json({ error: 'Limite inválido' });
  res.json({ ok: true, limite: chave, valor });
});

// ---------- Approval Engine ----------
// Exige JWT válido (não usa o requireAuth simulado deste arquivo).
function exigirJwt(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  next();
}

app.get('/api/approvals', exigirJwt, (req, res) => {
  const { status, agente, limit } = req.query;
  let approvals;
  if (status === 'pendente') approvals = approvalEngine.getPendentes(limit ? Number(limit) : 100);
  else if (status === 'historico') approvals = approvalEngine.getHistorico(limit ? Number(limit) : 100);
  else if (agente) approvals = approvalEngine.getPorAgente(agente, limit ? Number(limit) : 100);
  else approvals = approvalEngine.approvals.slice(0, 100);
  res.json(approvals);
});

app.get('/api/approvals/:id', exigirJwt, (req, res) => {
  const aprovacao = approvalEngine.getSolicitacao(req.params.id);
  if (!aprovacao) return res.status(404).json({ error: 'Aprovação não encontrada' });
  res.json(aprovacao);
});

app.post('/api/approvals', exigirJwt, (req, res) => {
  const { agente, action, entityType, entityId, payload, valorEstimado, impactoMensal, impactoAnual, risco, confianca, premissas, motivo, prioridade, expiracaoHoras } = req.body;
  if (!agente || !action) {
    return res.status(400).json({ error: 'agente e action são obrigatórios' });
  }
  const solicitacao = approvalEngine.criarSolicitacao({
    agente, action, entityType, entityId, payload,
    valorEstimado: valorEstimado || 0,
    impactoMensal: impactoMensal || 0,
    impactoAnual: impactoAnual || 0,
    risco, confianca, premissas, motivo, prioridade, expiracaoHoras,
  });
  res.status(201).json(solicitacao);
});

app.post('/api/approvals/:id/aprovar', exigirJwt, (req, res) => {
  const { aprovador } = req.body;
  const result = approvalEngine.aprovar(req.params.id, aprovador || 'api');
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/approvals/:id/rejeitar', exigirJwt, (req, res) => {
  const { rejeitadoPor, motivo } = req.body;
  const result = approvalEngine.rejeitar(req.params.id, rejeitadoPor || 'api', motivo);
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/approvals/:id/executar', exigirJwt, (req, res) => {
  const { resultado } = req.body;
  const result = approvalEngine.marcarExecutada(req.params.id, resultado || {});
  if (!result.success) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/approvals/estatisticas', exigirJwt, (_req, res) => {
  res.json(approvalEngine.getEstatisticas());
});

// ---------- Central IA - Novos Endpoints ----------
app.get('/api/impacto-financeiro', (_req, res) => {
  // Calcular impacto financeiro baseado nos dados do sistema
  const produtos = data.produtos || [];
  const pedidos = data.pedidos || [];
  const compras = data.compras || [];
  
  const receitaTotal = pedidos.reduce((a, p) => a + (p.total || 0), 0);
  const custoTotal = compras.reduce((a, c) => a + (c.total || 0), 0);
  const lucroEstimado = receitaTotal - custoTotal;
  const margemMedia = receitaTotal > 0 ? (lucroEstimado / receitaTotal) * 100 : 0;
  
  const porAgente = [
    { agente: 'StockGuard', impacto: Math.round(lucroEstimado * 0.25) },
    { agente: 'CompraGuard', impacto: Math.round(lucroEstimado * 0.30) },
    { agente: 'PriceWatch', impacto: Math.round(lucroEstimado * 0.20) },
    { agente: 'MarketRadar', impacto: Math.round(lucroEstimado * 0.15) },
    { agente: 'SalesAnalyst', impacto: Math.round(lucroEstimado * 0.10) },
  ];
  
  res.json({
    impactoMensal: Math.round(lucroEstimado / 12),
    impactoAnual: Math.round(lucroEstimado),
    economia: Math.round(custoTotal * 0.15),
    custoApi: 150,
    porAgente,
  });
});

app.get('/api/auditoria', (req, res) => {
  const { filtro, limite } = req.query;
  let logs = data.auditLog || [];
  
  if (filtro && filtro !== 'todos') {
    // Filtrar por tipo se necessário
    logs = logs.filter(l => l.acao && l.acao.toLowerCase().includes(filtro.toLowerCase()));
  }
  
  const limit = limite ? Number(limite) : 100;
  res.json(logs.slice(0, limit));
});

app.get('/api/automacoes', (_req, res) => {
  const regras = [
    { id: 1, nome: 'Reposição de Estoque Crítico', agente: 'StockGuard', acao: 'CompraGuard', status: 'ativa', descricao: 'Gera ordem de compra quando estoque < mínimo' },
    { id: 2, nome: 'Ajuste de Preço Competitivo', agente: 'PriceWatch', acao: 'MarketRadar', status: 'ativa', descricao: 'Ajusta preço baseado em concorrência' },
    { id: 3, nome: 'Publicação Automática Social', agente: 'SocialPilot', acao: 'SocialPilot', status: 'pendente', descricao: 'Publica produtos em alta nas redes' },
    { id: 4, nome: 'Alerta Fiscal', agente: 'FiscalGuard', acao: 'DirectorIA', status: 'ativa', descricao: 'Notifica divergências fiscais' },
  ];
  
  res.json({
    regras,
    tarefasEnfileiradas: 3,
    heartbeat: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
});

app.post('/api/limites', (req, res) => {
  const { chave, valor } = req.body;
  if (!chave || valor === undefined) {
    return res.status(400).json({ error: 'chave e valor são obrigatórios' });
  }
  const ok = riskEngine.atualizarLimite(chave, valor);
  if (!ok) return res.status(400).json({ error: 'Limite inválido' });
  res.json({ ok: true, limite: chave, valor });
});

// ---------- Tratamento global de erros ----------
app.use((err, req, res, _next) => {
  console.error("Erro capturado:", err);
  res.status(500).json({ 
    error: 'Erro interno do servidor', 
    details: err.message,
    stack: err.stack 
  });
});

// ---------- Assistente de IA (proxy Gemini) ----------
// O frontend chama este endpoint; a chave fica segura no servidor.
// Leitura preguiçosa para permitir rotação sem restart e testes.
const geminiKey = () => process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

const SYSTEM_INSTRUCTION =
  'Você é o OmniAdvisor, assistente de IA do OmniSync AI, um sistema de gestão multicanal ' +
  '(vendas, estoque, financeiro, marketing e logística). Você aconselha o usuário com base em ' +
  'dados de negócio, imagens e capturas de tela que ele enviar. Responda em português, de forma ' +
  'clara, objetiva e estruturada (com listas quando fizer sentido).';

app.post('/api/ai', aiLimiter, async (req, res) => {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });

  const chaveGemini = geminiKey();
  if (!chaveGemini) {
    return res.status(503).json({
      code: 'GEMINI_NOT_CONFIGURED',
      message: 'O assistente de IA ainda não está configurado no servidor.',
    });
  }

  // Contexto mínimo e limitado: últimas mensagens e poucas imagens, sem segredos.
  const { history = [], images = [] } = req.body || {};
  const historicoLimitado = Array.isArray(history) ? history.slice(-20).map(m => ({
    role: m?.role === 'assistant' ? 'assistant' : 'user',
    text: String(m?.text ?? '').slice(0, 4000),
  })) : [];
  const imagensLimitadas = Array.isArray(images) ? images.slice(0, 4) : [];

  const contents = historicoLimitado.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  if (imagensLimitadas.length > 0) {
    const imgParts = imagensLimitadas.map(img => ({
      inline_data: { mime_type: img.mimeType, data: img.base64 },
    }));
    const last = contents[contents.length - 1];
    if (last && last.role === 'user') {
      last.parts = [...last.parts, ...imgParts];
    } else {
      contents.push({ role: 'user', parts: [...imgParts] });
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${chaveGemini}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60000);

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }, contents }),
      signal: ctrl.signal,
    });

    if (!r.ok) {
      const status = r.status;
      if (status === 429) return res.status(429).json({ error: 'Limite de uso do Gemini atingido. Tente em uma hora.' });
      if (status === 403) return res.status(403).json({ error: 'Acesso negado ao Gemini. Verifique a chave.' });
      return res.status(500).json({ error: 'Falha ao consultar o Gemini.' });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? '';
    if (!text) {
      return res.status(500).json({ error: 'Resposta vazia do Gemini.' });
    }
    res.json({ ok: true, answer: text, provider: 'gemini' });
  } catch (err) {
    if (err?.name === 'AbortError') {
      return res.status(504).json({ error: 'Tempo esgotado ao consultar o Gemini.' });
    }
    res.status(500).json({ error: 'Erro ao chamar o Gemini.' });
  } finally {
    clearTimeout(timeout);
  }
});

export default app;
