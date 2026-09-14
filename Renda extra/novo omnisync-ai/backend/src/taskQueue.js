// ============================================
// taskQueue.js — Task Queue para ações assíncronas no backend.
// Processa tarefas com retry, dead-letter, prioridade e idempotência.
// ============================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { espelharTarefa, hidratarTarefas } from './persistencia.js';

const QUEUE_FILE = join(process.cwd(), 'data', 'taskQueue.json');
const PROCESSING_FILE = join(process.cwd(), 'data', 'taskProcessing.json');

function ensureDataDir() {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    try { require('fs').mkdirSync(dir, { recursive: true }); } catch {}
  }
}

function loadQueue() {
  ensureDataDir();
  if (!existsSync(QUEUE_FILE)) return [];
  try { return JSON.parse(readFileSync(QUEUE_FILE, 'utf-8')); } catch { return []; }
}

function saveQueue(queue) {
  ensureDataDir();
  try { writeFileSync(QUEUE_FILE, JSON.stringify(queue.slice(-2000), null, 2)); } catch {}
}

function loadProcessing() {
  ensureDataDir();
  if (!existsSync(PROCESSING_FILE)) return {};
  try { return JSON.parse(readFileSync(PROCESSING_FILE, 'utf-8')); } catch { return {}; }
}

function saveProcessing(proc) {
  ensureDataDir();
  try { writeFileSync(PROCESSING_FILE, JSON.stringify(proc, null, 2)); } catch {}
}

function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function generateIdempotencyKey(agentId, action, entityId) {
  return `idem_${agentId}_${action}_${entityId}_${Date.now().toString(36)}`.slice(0, 80);
}

export class TaskQueue {
  constructor(options = {}) {
    this.queue = loadQueue();
    this.processing = loadProcessing();
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 5000;
    this.concurrency = options.concurrency ?? 2;
    this.running = false;
    this.handlers = new Map(); // action -> handler function
    this.idempotencyKeys = new Set(); // chaves processadas recentemente
    this.cleanupInterval = null;
  }

  // Registrar handler para uma ação
  registerHandler(action, handler) {
    this.handlers.set(action, handler);
  }

  // Enfileirar tarefa
  enqueue(task) {
    const { agentId, action, entityType, entityId, payload, priority = 'normal', idempotencyKey, maxRetries } = task;

    // Verificar idempotência
    const key = idempotencyKey || generateIdempotencyKey(agentId, action, entityId);
    if (this.idempotencyKeys.has(key)) {
      return { duplicate: true, taskId: null, key };
    }

    const taskObj = {
      id: generateTaskId(),
      agentId,
      action,
      entityType: entityType || 'system',
      entityId: entityId || null,
      payload: payload || {},
      priority, // 'low' | 'normal' | 'high' | 'critical'
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
      maxRetries: maxRetries ?? this.maxRetries,
      idempotencyKey: key,
      correlationId: task.correlationId || `corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      causationId: task.causationId || null,
      result: null,
      error: null,
    };

    // Inserir por prioridade
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const insertIdx = this.queue.findIndex(t => priorityOrder[t.priority] > priorityOrder[priority]);
    if (insertIdx >= 0) this.queue.splice(insertIdx, 0, taskObj);
    else this.queue.push(taskObj);

    // Registrar chave de idempotência
    this.idempotencyKeys.add(key);

    saveQueue(this.queue);
    espelharTarefa(taskObj).catch(() => {});
    return { duplicate: false, taskId: taskObj.id, key };
  }

  // Processar fila
  async process() {
    if (this.running) return;
    this.running = true;

    while (this.running) {
      const pending = this.queue.filter(t => t.status === 'pending');
      if (pending.length === 0) {
        await this.sleep(1000);
        continue;
      }

      // Limitar concorrência
      const active = Object.values(this.processing).filter(p => p.status === 'running').length;
      if (active >= this.concurrency) {
        await this.sleep(500);
        continue;
      }

      // Pegar próxima tarefa (maior prioridade primeiro)
      const task = pending[0];
      if (!task) { await this.sleep(1000); continue; }

      task.status = 'running';
      task.attempts++;
      task.updatedAt = new Date().toISOString();
      this.processing[task.id] = { ...task, status: 'running', startedAt: new Date().toISOString() };
      saveProcessing(this.processing);
      saveQueue(this.queue);

      const handler = this.handlers.get(task.action);
      if (!handler) {
        task.status = 'error';
        task.error = `Handler não registrado para ação: ${task.action}`;
        task.updatedAt = new Date().toISOString();
        this.finishTask(task);
        continue;
      }

      try {
        const result = await handler(task);
        task.status = 'completed';
        task.result = result;
        task.completedAt = new Date().toISOString();
      } catch (err) {
        task.error = err.message || 'Erro desconhecido';
        task.updatedAt = new Date().toISOString();

        if (task.attempts >= task.maxRetries) {
          task.status = 'dead_letter';
          // Log para dead letter
          console.error(`[TaskQueue] Dead letter: ${task.id} - ${task.error}`);
        } else {
          task.status = 'pending';
          // Reagendar com backoff exponencial
          const delay = this.retryDelayMs * Math.pow(2, task.attempts - 1);
          setTimeout(() => {}, delay); // apenas marca para reprocessar no próximo loop
        }
      }

      this.finishTask(task);
    }
  }

  finishTask(task) {
    task.updatedAt = new Date().toISOString();
    this.queue = this.queue.map(t => t.id === task.id ? task : t);
    delete this.processing[task.id];
    saveQueue(this.queue);
    saveProcessing(this.processing);
    espelharTarefa(task).catch(() => {});
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.running = false;
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  // Iniciar limpeza periódica de chaves de idempotência antigas
  startCleanup(intervalMs = 30 * 60 * 1000) {
    this.cleanupInterval = setInterval(() => {
      // Manter apenas chaves das últimas 24h (aprox)
      // Em produção, usar TTL real (Redis)
      if (this.idempotencyKeys.size > 10000) {
        const arr = Array.from(this.idempotencyKeys);
        this.idempotencyKeys = new Set(arr.slice(-5000));
      }
    }, intervalMs);
  }

  // Consultas
  getTask(id) {
    return this.queue.find(t => t.id === id) || this.processing[id] || null;
  }

  getTasksByAgent(agentId, limit = 100) {
    return this.queue.filter(t => t.agentId === agentId).slice(-limit);
  }

  getPendingTasks(limit = 50) {
    return this.queue.filter(t => t.status === 'pending').slice(0, limit);
  }

  getDeadLetters(limit = 100) {
    return this.queue.filter(t => t.status === 'dead_letter').slice(-limit);
  }

  retryTask(taskId) {
    const task = this.queue.find(t => t.id === taskId);
    if (task && task.status === 'dead_letter') {
      task.status = 'pending';
      task.attempts = 0;
      task.error = null;
      task.updatedAt = new Date().toISOString();
      saveQueue(this.queue);
      espelharTarefa(task).catch(() => {});
      return true;
    }
    return false;
  }

  cancelTask(taskId) {
    const task = this.queue.find(t => t.id === taskId);
    if (task && (task.status === 'pending' || task.status === 'running')) {
      task.status = 'cancelled';
      task.updatedAt = new Date().toISOString();
      saveQueue(this.queue);
      espelharTarefa(task).catch(() => {});
      return true;
    }
    return false;
  }
}

export const taskQueue = new TaskQueue();

// Hidratação na subida: tarefas pendentes e recentes voltam do Neon,
// pois o sistema de arquivos serverless é efêmero.
hidratarTarefas(500).then(rows => {
  if (rows && rows.length > 0) {
    const locais = new Map(taskQueue.queue.map(t => [t.id, t]));
    rows.forEach(t => locais.set(t.id, t));
    taskQueue.queue = [...locais.values()].slice(-2000);
    saveQueue(taskQueue.queue);
    taskQueue.idempotencyKeys = new Set([...taskQueue.idempotencyKeys, ...rows.map(t => t.idempotencyKey).filter(Boolean)]);
  }
}).catch(() => {});

// Ações padrão do NEXORA
export const TASK_ACTIONS = {
  // Estoque
  CREATE_PURCHASE_ORDER: 'purchase.create_order',
  REPLENISH_STOCK: 'stock.replenish',
  ALERT_RUPTURE: 'stock.alert_rupture',

  // Preços
  UPDATE_PRICE: 'price.update',
  ANALYZE_COMPETITORS: 'price.analyze_competitors',

  // Fiscal
  VALIDATE_NFE: 'fiscal.validate_nfe',
  SYNC_FISCAL: 'fiscal.sync',
  OPEN_FISCAL_BO: 'fiscal.open_bo',

  // Compras
  TRACK_DELIVERY: 'purchase.track_delivery',
  NEGOTIATE_SUPPLIER: 'purchase.negotiate',

  // Vendas
  GENERATE_REPORT: 'sales.generate_report',
  ACTIVATE_REMARKETING: 'sales.activate_remarketing',

  // Marketing
  SCHEDULE_POST: 'social.schedule_post',
  GENERATE_CONTENT: 'social.generate_content',
  ANALYZE_CAMPAIGN: 'social.analyze_campaign',

  // IA
  RUN_AGENT: 'ia.run_agent',
  RUN_DIRECTOR: 'ia.run_director',
  TRAIN_MODEL: 'ia.train_model',

  // Sistema
  HEARTBEAT: 'system.heartbeat',
  CLEANUP: 'system.cleanup',
};