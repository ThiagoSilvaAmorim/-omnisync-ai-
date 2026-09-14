// ============================================
// approvalEngine.js — Motor de aprovações para ações de alto risco.
// Gerencia fila de aprovações, expiração, auditoria.
// ============================================

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const APPROVALS_FILE = join(process.cwd(), 'data', 'approvals.json');

function ensureDataDir() {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    try { require('fs').mkdirSync(dir, { recursive: true }); } catch {}
  }
}

function loadApprovals() {
  ensureDataDir();
  if (!existsSync(APPROVALS_FILE)) return [];
  try { return JSON.parse(readFileSync(APPROVALS_FILE, 'utf-8')); } catch { return []; }
}

function saveApprovals(approvals) {
  ensureDataDir();
  try { writeFileSync(APPROVALS_FILE, JSON.stringify(approvals.slice(-5000), null, 2)); } catch {}
}

function generateApprovalId() {
  return `apv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export class ApprovalEngine {
  constructor(options = {}) {
    this.approvals = loadApprovals();
    this.expirationHours = options.expirationHours || 24; // Aprovações expiram em 24h
    this.cleanupInterval = null;
  }

  // Criar solicitação de aprovação
  criarSolicitacao(dados) {
    const {
      agente,
      action,
      entityType,
      entityId,
      payload,
      valorEstimado = 0,
      impactoMensal = 0,
      impactoAnual = 0,
      risco,
      confianca = 0.8,
      premissas = [],
      motivo,
      prioridade = 'normal',
      expiracaoHoras = this.expirationHours,
    } = dados;

    const solicitacao = {
      id: generateApprovalId(),
      agente,
      action,
      entityType: entityType || 'system',
      entityId: entityId || null,
      payload,
      valorEstimado,
      impactoMensal,
      impactoAnual,
      risco: risco || 'medio',
      confianca,
      premissas,
      motivo: motivo || 'Ação requer aprovação conforme política de risco',
      prioridade,
      status: 'pendente', // 'pendente' | 'aprovada' | 'rejeitada' | 'expirada' | 'executada'
      criadaEm: new Date().toISOString(),
      expiraEm: new Date(Date.now() + expiracaoHoras * 60 * 60 * 1000).toISOString(),
      aprovadaEm: null,
      aprovadaPor: null,
      rejeitadaEm: null,
      rejeitadaPor: null,
      motivoRejeicao: null,
      executadaEm: null,
      resultadoExecucao: null,
      idempotencyKey: `idem_${agente}_${action}_${entityId}_${Date.now()}`,
    };

    this.approvals.unshift(solicitacao);
    saveApprovals(this.approvals);
    return solicitacao;
  }

  // Aprovar solicitação
  aprovar(id, aprovador = 'sistema') {
    const idx = this.approvals.findIndex(a => a.id === id);
    if (idx === -1) return { success: false, error: 'Solicitação não encontrada' };

    const solicitacao = this.approvals[idx];
    if (solicitacao.status !== 'pendente') {
      return { success: false, error: `Solicitação já ${solicitacao.status}` };
    }

    if (new Date() > new Date(solicitacao.expiraEm)) {
      solicitacao.status = 'expirada';
      saveApprovals(this.approvals);
      return { success: false, error: 'Solicitação expirada' };
    }

    solicitacao.status = 'aprovada';
    solicitacao.aprovadaEm = new Date().toISOString();
    solicitacao.aprovadaPor = aprovador;
    saveApprovals(this.approvals);
    return { success: true, solicitacao };
  }

  // Rejeitar solicitação
  rejeitar(id, rejeitadoPor = 'sistema', motivo = 'Rejeitado pelo aprovador') {
    const idx = this.approvals.findIndex(a => a.id === id);
    if (idx === -1) return { success: false, error: 'Solicitação não encontrada' };

    const solicitacao = this.approvals[idx];
    if (solicitacao.status !== 'pendente') {
      return { success: false, error: `Solicitação já ${solicitacao.status}` };
    }

    solicitacao.status = 'rejeitada';
    solicitacao.rejeitadaEm = new Date().toISOString();
    solicitacao.rejeitadaPor = rejeitadoPor;
    solicitacao.motivoRejeicao = motivo;
    saveApprovals(this.approvals);
    return { success: true, solicitacao };
  }

  // Marcar como executada
  marcarExecutada(id, resultado = {}) {
    const idx = this.approvals.findIndex(a => a.id === id);
    if (idx === -1) return { success: false, error: 'Solicitação não encontrada' };

    const solicitacao = this.approvals[idx];
    if (solicitacao.status !== 'aprovada') {
      return { success: false, error: 'Solicitação não está aprovada' };
    }

    solicitacao.status = 'executada';
    solicitacao.executadaEm = new Date().toISOString();
    solicitacao.resultadoExecucao = resultado;
    saveApprovals(this.approvals);
    return { success: true, solicitacao };
  }

  // Consultas
  getSolicitacao(id) {
    return this.approvals.find(a => a.id === id) || null;
  }

  getPendentes(limit = 100) {
    return this.approvals
      .filter(a => a.status === 'pendente' && new Date() <= new Date(a.expiraEm))
      .slice(0, limit);
  }

  getExpiradas(limit = 100) {
    return this.approvals
      .filter(a => a.status === 'pendente' && new Date() > new Date(a.expiraEm))
      .slice(0, limit);
  }

  getHistorico(limit = 100) {
    return this.approvals
      .filter(a => ['aprovada', 'rejeitada', 'executada', 'expirada'].includes(a.status))
      .slice(0, limit);
  }

  getPorAgente(agente, limit = 100) {
    return this.approvals.filter(a => a.agente === agente).slice(0, limit);
  }

  // Limpar expiradas (marcar como expiradas)
  limparExpiradas() {
    let count = 0;
    for (const a of this.approvals) {
      if (a.status === 'pendente' && new Date() > new Date(a.expiraEm)) {
        a.status = 'expirada';
        count++;
      }
    }
    if (count > 0) saveApprovals(this.approvals);
    return count;
  }

  // Iniciar limpeza periódica
  startCleanup(intervalMs = 60 * 60 * 1000) { // 1 hora
    this.cleanupInterval = setInterval(() => this.limparExpiradas(), intervalMs);
  }

  stopCleanup() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  // Estatísticas
  getEstatisticas() {
    const total = this.approvals.length;
    const pendentes = this.approvals.filter(a => a.status === 'pendente').length;
    const aprovadas = this.approvals.filter(a => a.status === 'aprovada').length;
    const rejeitadas = this.approvals.filter(a => a.status === 'rejeitada').length;
    const executadas = this.approvals.filter(a => a.status === 'executada').length;
    const expiradas = this.approvals.filter(a => a.status === 'expirada').length;

    return { total, pendentes, aprovadas, rejeitadas, executadas, expiradas };
  }
}

export const approvalEngine = new ApprovalEngine();