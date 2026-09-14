import app from './app.js';
import { eventBus } from './eventBus.js';
import { taskQueue } from './taskQueue.js';
import { directorIA } from './directorIA.js';
import { approvalEngine } from './approvalEngine.js';

// ============================================
// index.js — inicia o servidor HTTP e serviços de IA.
// ============================================

const PORT = process.env.PORT || 3001;

// Inicializar Event Bus (subscrições padrão entre agentes)
eventBus.subscribe('StockGuard', ['stock.low_detected', 'stock.critical'], async (evt) => {
  console.log('[EventBus] StockGuard recebeu:', evt.type, evt.payload);
});
eventBus.subscribe('CompraGuard', ['stock.low_detected', 'purchase.created'], async (evt) => {
  console.log('[EventBus] CompraGuard recebeu:', evt.type, evt.payload);
});
eventBus.subscribe('SocialPilot', ['stock.low_detected', 'price.change_detected'], async (evt) => {
  console.log('[EventBus] SocialPilot recebeu:', evt.type, evt.payload);
});
eventBus.subscribe('FiscalGuard', ['fiscal.divergence', 'fiscal.rejected'], async (evt) => {
  console.log('[EventBus] FiscalGuard recebeu:', evt.type, evt.payload);
});
eventBus.subscribe('MarketRadar', ['price.change_detected', 'sales.spike'], async (evt) => {
  console.log('[EventBus] MarketRadar recebeu:', evt.type, evt.payload);
});

// Inicializar Task Queue com handlers
taskQueue.registerHandler('stock.replenish', async (task) => {
  console.log('[TaskQueue] Criando ordem de compra para:', task.payload);
  return { purchaseOrderId: `PO_${Date.now()}`, status: 'created' };
});

taskQueue.registerHandler('price.update', async (task) => {
  console.log('[TaskQueue] Atualizando preço:', task.payload);
  return { updated: true, newPrice: task.payload.newPrice };
});

taskQueue.registerHandler('fiscal.validate_nfe', async (task) => {
  console.log('[TaskQueue] Validando NF-e:', task.payload);
  return { valid: true, validationId: `VAL_${Date.now()}` };
});

taskQueue.registerHandler('social.schedule_post', async (task) => {
  console.log('[TaskQueue] Agendando publicação:', task.payload);
  return { scheduled: true, postId: `POST_${Date.now()}` };
});

taskQueue.registerHandler('ia.run_agent', async (task) => {
  console.log('[TaskQueue] Executando agente:', task.payload.agentName);
  return { executed: true, agent: task.payload.agentName };
});

taskQueue.registerHandler('system.heartbeat', async (task) => {
  console.log('[TaskQueue] Heartbeat:', task.payload);
  return { ok: true };
});

taskQueue.registerHandler('purchase.track_delivery', async (task) => {
  console.log('[TaskQueue] Rastreando entrega:', task.payload);
  return { tracked: true };
});

// Iniciar Director IA (scheduler real)
directorIA.iniciarScheduler();

// Iniciar Approval Engine cleanup
approvalEngine.startCleanup();

// Iniciar processamento da fila
taskQueue.process().catch(console.error);
taskQueue.startCleanup();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`OmniSync API rodando em http://localhost:${PORT}`);
  console.log('[EventBus] Inicializado com subscrições padrão');
  console.log('[TaskQueue] Inicializado com handlers registrados');
  console.log('[DirectorIA] Scheduler iniciado (30min heartbeat)');
  console.log('[ApprovalEngine] Iniciado com limpeza automática');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando...');
  directorIA.pararScheduler();
  approvalEngine.stopCleanup();
  taskQueue.stop();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, encerrando...');
  directorIA.pararScheduler();
  approvalEngine.stopCleanup();
  taskQueue.stop();
  server.close(() => process.exit(0));
});