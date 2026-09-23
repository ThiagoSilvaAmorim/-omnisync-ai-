// backend/src/services/agentOrchestrator.js
// Orquestra os agentes do OmniSync sobre a camada de análise
// (geminiAnalysis). Cada agente recebe SOMENTE o domínio de dados
// real correspondente; sem base, o status é insufficient_data.
// Nenhum agente executa ação externa por aqui.

import { analisarDominio } from './geminiAnalysis.js';

// Nome do agente → domínio de análise. null = sem domínio de dados
// correspondente (responde failed explícito, nunca genérico).
export const AGENTES_DOMINIO = {
  OmniAdvisor: 'dashboard',
  SalesAnalyst: 'sales',
  MarketRadar: 'market',
  StockGuard: 'inventory',
  CompraGuard: 'supplier',
  PriceWatch: 'market',
  FiscalGuard: null,
  SocialPilot: null,
};

export function listarAgentes() {
  return Object.entries(AGENTES_DOMINIO).map(([agente, dominio]) => ({ agente, dominio }));
}

// Resumo da entrada sem segredos e sem dados pessoais: só chaves e contagens.
function resumirEntrada(ctx) {
  const chaves = Object.keys(ctx || {}).filter(k => k !== 'empresaId');
  const detalhes = chaves.map(k => {
    const v = ctx[k];
    if (Array.isArray(v)) return `${k}[${v.length}]`;
    if (v && typeof v === 'object') return `${k}{${Object.keys(v).length}}`;
    return `${k}:presente`;
  });
  return `domínio=${ctx?.dominio || '?'}; chaves=[${detalhes.join(', ')}]; empresa=${ctx?.empresaId ?? '?'}`;
}

export async function executarAgente(agente, task, ctx = {}) {
  const createdAt = new Date().toISOString();
  if (!Object.prototype.hasOwnProperty.call(AGENTES_DOMINIO, agente)) {
    return {
      agent: agente, task: task || null, source: [], inputSummary: resumirEntrada(ctx),
      output: null, confidence: 0, dataQuality: 'insufficient',
      status: 'failed', code: 'UNKNOWN_AGENT', createdAt,
    };
  }
  const dominio = AGENTES_DOMINIO[agente];
  if (!dominio) {
    return {
      agent: agente, task: task || null, source: [], inputSummary: resumirEntrada(ctx),
      output: null, confidence: 0, dataQuality: 'insufficient',
      status: 'failed', code: 'UNSUPPORTED_AGENT', createdAt,
    };
  }
  try {
    const resultado = await analisarDominio(dominio, { empresaId: ctx.empresaId, ...(ctx.payload || {}) });
    if (!resultado?.ok) {
      return {
        agent: agente, task: task || null, source: resultado?.source || [],
        inputSummary: resumirEntrada({ ...ctx, dominio }),
        output: { message: resultado?.message || 'Sem dados suficientes.' },
        confidence: 0, dataQuality: resultado?.dataQuality || 'insufficient',
        status: 'insufficient_data', code: resultado?.code || 'INSUFFICIENT_DATA', createdAt,
      };
    }
    return {
      agent: agente, task: task || null, source: resultado.source || [],
      inputSummary: resumirEntrada({ ...ctx, dominio }),
      output: {
        analysis: resultado.analysis,
        recommendations: resultado.recommendations || [],
        risks: resultado.risks || [],
      },
      confidence: resultado.confidence ?? 0,
      dataQuality: resultado.dataQuality || 'medium',
      status: 'completed', createdAt,
    };
  } catch (e) {
    return {
      agent: agente, task: task || null, source: [], inputSummary: resumirEntrada({ ...ctx, dominio }),
      output: null, confidence: 0, dataQuality: 'insufficient',
      status: 'failed', code: e?.code || 'AGENT_FAILED', createdAt,
    };
  }
}
