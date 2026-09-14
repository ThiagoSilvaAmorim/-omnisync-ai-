// backend/src/persistencia.js
// Espelho Neon do Event Bus e da fila de tarefas.
// Em produção (Vercel serverless) o sistema de arquivos é efêmero:
// sem este espelho, eventos e tarefas sumiam a cada deploy ou cold start.
// Tudo aqui é best-effort (nunca quebra a operação) e desligado em testes.

import { prisma } from './prisma/client.js';

const ATIVO = process.env.PERSISTIR_EVENTOS !== 'false' && process.env.NODE_ENV !== 'test' && !process.env.VITEST;

async function seguro(fn, fallback = null) {
  if (!ATIVO) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error('[Persistencia] Falha no espelho Neon (sem impacto):', e.message);
    return fallback;
  }
}

const paraISO = v => (v instanceof Date ? v.toISOString() : v);

// ---------- Eventos ----------
export async function espelharEvento(ev) {
  return seguro(() => prisma.evento.create({
    data: {
      id: ev.event_id,
      type: ev.type,
      timestamp: new Date(ev.timestamp),
      source_agent: ev.source_agent || '',
      entity_type: ev.entity_type || 'system',
      entity_id: ev.entity_id ?? null,
      correlation_id: ev.correlation_id,
      causation_id: ev.causation_id ?? null,
      severity: ev.severity || 'info',
      payload: ev.payload ?? {},
      metadata: ev.metadata ?? {},
    },
  }).then(async criado => {
    // Retenção de 90 dias: mantém as tabelas minúsculas no plano grátis.
    await prisma.evento.deleteMany({ where: { timestamp: { lt: new Date(Date.now() - 90 * 86400000) } } }).catch(() => {});
    return criado;
  }));
}

function mapearEvento(row) {
  return {
    event_id: row.id,
    type: row.type,
    timestamp: paraISO(row.timestamp),
    source_agent: row.source_agent,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    correlation_id: row.correlation_id,
    causation_id: row.causation_id,
    severity: row.severity,
    payload: row.payload ?? {},
    metadata: row.metadata ?? {},
  };
}

export async function hidratarEventos(limite = 1000) {
  const rows = await seguro(() => prisma.evento.findMany({ orderBy: { timestamp: 'desc' }, take: limite }), null);
  if (!rows) return null;
  return rows.reverse().map(mapearEvento);
}

// Leitura direta do Neon para as rotas (evita a corrida de hidratação
// em instâncias frias do serverless). Retorna null se indisponível.
export async function consultarEventos({ type, source_agent, correlation_id, since, limit }) {
  return seguro(async () => {
    const where = {};
    if (type) where.type = type;
    if (source_agent) where.source_agent = source_agent;
    if (correlation_id) where.correlation_id = correlation_id;
    if (since) where.timestamp = { gte: new Date(since) };
    const rows = await prisma.evento.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit ? Number(limit) : 100,
    });
    return rows.reverse().map(mapearEvento);
  }, null);
}

// ---------- Tarefas ----------
export async function espelharTarefa(t) {
  return seguro(() => prisma.tarefa.upsert({
    where: { id: t.id },
    create: {
      id: t.id,
      agent_id: t.agentId || '',
      action: t.action || '',
      entity_type: t.entityType || 'system',
      entity_id: t.entityId ? String(t.entityId) : null,
      payload: t.payload ?? {},
      priority: t.priority || 'normal',
      status: t.status || 'pending',
      attempts: t.attempts || 0,
      max_retries: t.maxRetries ?? 3,
      idempotency_key: t.idempotencyKey ?? null,
      correlation_id: t.correlationId ?? null,
      causation_id: t.causationId ?? null,
      result: t.result ?? undefined,
      error: t.error ?? null,
    },
    update: {
      status: t.status,
      attempts: t.attempts,
      result: t.result ?? undefined,
      error: t.error ?? null,
      updated_at: new Date(),
    },
  }));
}

function mapearTarefa(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload ?? {},
    priority: row.priority,
    status: row.status,
    createdAt: paraISO(row.created_at),
    updatedAt: paraISO(row.updated_at),
    attempts: row.attempts,
    maxRetries: row.max_retries,
    idempotencyKey: row.idempotency_key,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    result: row.result ?? null,
    error: row.error ?? null,
  };
}

export async function hidratarTarefas(limite = 500) {
  const rows = await seguro(() => prisma.tarefa.findMany({ orderBy: { created_at: 'desc' }, take: limite }), null);
  if (!rows) return null;
  return rows.reverse().map(mapearTarefa);
}

// Leitura direta do Neon para as rotas de tarefas.
export async function consultarTarefas({ agentId, status, limit = 100, id }) {
  return seguro(async () => {
    if (id) {
      const row = await prisma.tarefa.findUnique({ where: { id } });
      return row ? mapearTarefa(row) : null;
    }
    const where = {};
    if (agentId) where.agent_id = agentId;
    if (status === 'pending') where.status = 'pending';
    else if (status === 'dead_letter') where.status = 'dead_letter';
    const rows = await prisma.tarefa.findMany({ where, orderBy: { created_at: 'desc' }, take: Number(limit) || 100 });
    const lista = rows.reverse().map(mapearTarefa);
    if (status === 'pending') return lista.filter(t => t.status === 'pending');
    return lista;
  }, null);
}
