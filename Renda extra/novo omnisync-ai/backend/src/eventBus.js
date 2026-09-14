// ============================================
// eventBus.js — Event Bus centralizado no backend.
// Comunicação assíncrona entre agentes via eventos.
// Persiste em arquivo JSON (pode ser migrado para Redis/DB).
// ============================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { espelharEvento, hidratarEventos } from './persistencia.js';

const EVENTS_FILE = join(process.cwd(), 'data', 'events.json');
const SUBSCRIPTIONS_FILE = join(process.cwd(), 'data', 'subscriptions.json');

function ensureDataDir() {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    try { require('fs').mkdirSync(dir, { recursive: true }); } catch {}
  }
}

function loadEvents() {
  ensureDataDir();
  if (!existsSync(EVENTS_FILE)) return [];
  try { return JSON.parse(readFileSync(EVENTS_FILE, 'utf-8')); } catch { return []; }
}

function saveEvents(events) {
  ensureDataDir();
  try { writeFileSync(EVENTS_FILE, JSON.stringify(events.slice(-5000), null, 2)); } catch {}
}

function loadSubscriptions() {
  ensureDataDir();
  if (!existsSync(SUBSCRIPTIONS_FILE)) return {};
  try { return JSON.parse(readFileSync(SUBSCRIPTIONS_FILE, 'utf-8')); } catch { return {}; }
}

function saveSubscriptions(subs) {
  ensureDataDir();
  try { writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2)); } catch {}
}

function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function generateCorrelationId() {
  return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export class EventBus {
  constructor() {
    this.handlers = new Map();
    this.subscriptions = loadSubscriptions();
    this.dedupeCache = new Map(); // correlation_id -> timestamp
    this.dedupeWindowMs = 5000; // 5s janela de deduplicação
  }

  // --- Subscribe / Unsubscribe ---
  subscribe(agentId, eventTypes, handler) {
    if (!this.subscriptions[agentId]) this.subscriptions[agentId] = [];
    for (const type of eventTypes) {
      if (!this.subscriptions[agentId].includes(type)) {
        this.subscriptions[agentId].push(type);
      }
    }
    if (!this.handlers.has(agentId)) this.handlers.set(agentId, []);
    this.handlers.get(agentId).push({ types: eventTypes, handler });
    saveSubscriptions(this.subscriptions);
  }

  unsubscribe(agentId, eventTypes) {
    if (!this.subscriptions[agentId]) return;
    this.subscriptions[agentId] = this.subscriptions[agentId].filter(t => !eventTypes.includes(t));
    if (this.subscriptions[agentId].length === 0) delete this.subscriptions[agentId];
    this.handlers.delete(agentId);
    saveSubscriptions(this.subscriptions);
  }

  // --- Emit ---
  async emit(event) {
    const fullEvent = {
      event_id: event.event_id || generateEventId(),
      type: event.type,
      timestamp: event.timestamp || new Date().toISOString(),
      source_agent: event.source_agent,
      entity_type: event.entity_type || 'system',
      entity_id: event.entity_id || null,
      correlation_id: event.correlation_id || generateCorrelationId(),
      causation_id: event.causation_id || null,
      severity: event.severity || 'info',
      payload: event.payload || {},
      metadata: event.metadata || {},
    };

    // Deduplicação por correlation_id
    const lastEmit = this.dedupeCache.get(fullEvent.correlation_id);
    const now = Date.now();
    if (lastEmit && (now - lastEmit) < this.dedupeWindowMs) {
      return { duplicated: true, event: fullEvent };
    }
    this.dedupeCache.set(fullEvent.correlation_id, now);

    // Persistir (arquivo local + espelho Neon best-effort)
    const events = loadEvents();
    events.push(fullEvent);
    saveEvents(events);
    try {
      await espelharEvento(fullEvent);
    } catch {
      // Espelho é best-effort; o arquivo local já salvou o evento.
    }

    // Dispatch para handlers locais
    for (const [agentId, handlers] of this.handlers.entries()) {
      for (const { types, handler } of handlers) {
        if (types.includes(fullEvent.type) || types.includes('*')) {
          try { await handler(fullEvent); } catch (e) { console.error(`[EventBus] Handler error for ${agentId}:`, e); }
        }
      }
    }

    return { duplicated: false, event: fullEvent };
  }

  // --- Query ---
  getEvents(filter = {}) {
    let events = loadEvents();
    if (filter.type) events = events.filter(e => e.type === filter.type);
    if (filter.source_agent) events = events.filter(e => e.source_agent === filter.source_agent);
    if (filter.correlation_id) events = events.filter(e => e.correlation_id === filter.correlation_id);
    if (filter.since) events = events.filter(e => new Date(e.timestamp) >= new Date(filter.since));
    if (filter.limit) events = events.slice(-filter.limit);
    return events;
  }

  // --- Dead Letter / Retry ---
  getFailedEvents(limit = 100) {
    return loadEvents().filter(e => e.payload?.failed === true).slice(-limit);
  }

  retryFailed(eventId) {
    const events = loadEvents();
    const idx = events.findIndex(e => e.event_id === eventId);
    if (idx >= 0) {
      events[idx].payload.failed = false;
      events[idx].payload.retryCount = (events[idx].payload.retryCount || 0) + 1;
      events[idx].payload.lastRetry = new Date().toISOString();
      saveEvents(events);
      return events[idx];
    }
    return null;
  }
}

export const eventBus = new EventBus();

// Hidratação na subida: o Neon vira a fonte após restart/deploy,
// pois o sistema de arquivos serverless é efêmero.
hidratarEventos(1000).then(rows => {
  if (rows && rows.length > 0) saveEvents(rows.slice(-5000));
}).catch(() => {});

// Tipos de evento oficiais da spec §10 (nomes legados mantidos como alias).
export const EVENT_TYPES = {
  // Estoque
  STOCK_LOW: 'stock.low',
  STOCK_LOW_DETECTED: 'stock.low_detected',
  STOCK_OUT: 'stock.out',
  STOCK_CRITICAL: 'stock.critical',
  STOCK_REPLENISHED: 'stock.replenished',

  // Preços
  PRICE_CHANGE: 'price.change_detected',
  PRICE_ABOVE_THRESHOLD: 'price.above_threshold',

  // Fiscal
  FISCAL_DIVERGENCE: 'fiscal.divergence',
  FISCAL_REJECTED: 'fiscal.rejected',
  FISCAL_SYNC_FAILED: 'fiscal.sync_failed',

  // Compras
  PURCHASE_CREATED: 'purchase.created',
  PURCHASE_DELAYED: 'purchase.delayed',
  PURCHASE_RECEIVED: 'purchase.received',

  // Vendas
  SALES_SPIKE: 'sales.spike',
  SALES_DROP: 'sales.drop',
  ORDER_CREATED: 'order.created',
  ORDER_DELAYED: 'order.delayed',

  // CRM e oportunidades
  CUSTOMER_CREATED: 'customer.created',
  OPPORTUNITY_DETECTED: 'opportunity.detected',

  // Publicações
  PUBLICATION_SCHEDULED: 'publication.scheduled',

  // Fiscal
  INVOICE_REJECTED: 'invoice.rejected',

  // IA
  IA_ANOMALY: 'ia.anomaly',
  IA_LOOP_DETECTED: 'ia.loop_detected',
  IA_LOW_CONFIDENCE: 'ia.low_confidence',

  // Sistema
  HEARTBEAT: 'heartbeat',
  KILLSWITCH: 'killswitch.activated',
  AGENT_ERROR: 'agent.error',
  AGENT_STARTED: 'agent.started',
  AGENT_COMPLETED: 'agent.completed',
};

// Helper para emitir eventos tipados
export async function emitEvent(type, payload, sourceAgent, options = {}) {
  return eventBus.emit({
    type,
    source_agent: sourceAgent,
    correlation_id: options.correlationId || generateCorrelationId(),
    causation_id: options.causationId || null,
    severity: options.severity || 'info',
    entity_type: options.entityType || 'system',
    entity_id: options.entityId || null,
    payload,
    metadata: options.metadata || {},
  });
}