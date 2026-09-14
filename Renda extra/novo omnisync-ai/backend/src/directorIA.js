// ============================================
// directorIA.js — Diretor IA no backend.
// Orquestra os 8 agentes, consolida relatórios,
// gerencia modos de autonomia e executa scheduler real.
// ============================================

import { eventBus, emitEvent, EVENT_TYPES } from './eventBus.js';
import { taskQueue, TASK_ACTIONS } from './taskQueue.js';
import { prisma } from './prisma/client.js';

const AGENTES = [
  'OmniAdvisor',
  'CompraGuard',
  'MarketRadar',
  'FiscalGuard',
  'SalesAnalyst',
  'PriceWatch',
  'StockGuard',
  'SocialPilot',
];

const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

export class DirectorIA {
  constructor() {
    this.running = false;
    this.interval = null;
    this.modoGlobal = 'manual'; // 'manual' | 'assistido' | 'autonomo'
    this.killSwitchAtivo = false;
    this.ultimaExecucao = null;
    this.proximaExecucao = null;
    this.historicoExecucoes = [];
    this.maxHistorico = 100;
    this.politicasAprovacao = {
      altoImpacto: { valorMinimo: 1000, exigeAprovacao: true },
      mudancaPreco: { percentualMaximo: 0.10, exigeAprovacao: true }, // 10%
      campanhaAltaInvestimento: { valorMinimo: 5000, exigeAprovacao: true },
      riscoRuptura: { exigeAprovacao: true },
      estoqueCritico: { exigeAprovacao: true },
      divergenciaFiscal: { exigeAprovacao: true },
      altoRisco: { exigeAprovacao: true },
    };
  }

  // --- Modos de autonomia ---
  setModoGlobal(modo) {
    if (!['manual', 'assistido', 'autonomo'].includes(modo)) {
      throw new Error('Modo inválido: ' + modo);
    }
    this.modoGlobal = modo;
    this.registrarEventoSistema('director.modo_alterado', { modo });
    return { modo: this.modoGlobal };
  }

  getModoGlobal() {
    return this.modoGlobal;
  }

  // --- Kill Switch ---
  ativarKillSwitch(motivo = 'Pausa global solicitada') {
    this.killSwitchAtivo = true;
    this.pararScheduler();
    this.registrarEventoSistema('killswitch.ativado', { motivo, timestamp: new Date().toISOString() });
    return { ativo: true, motivo };
  }

  desativarKillSwitch(motivo = 'Retomada solicitada') {
    this.killSwitchAtivo = false;
    this.registrarEventoSistema('killswitch.desativado', { motivo, timestamp: new Date().toISOString() });
    return { ativo: false, motivo };
  }

  getKillSwitchStatus() {
    return { ativo: this.killSwitchAtivo };
  }

  // --- Scheduler (Heartbeat) ---
  iniciarScheduler() {
    if (this.running) return { status: 'already_running' };
    if (this.killSwitchAtivo) return { status: 'blocked_killswitch' };

    this.running = true;
    this.executarCiclo(); // Execução imediata

    this.interval = setInterval(() => {
      if (!this.killSwitchAtivo) this.executarCiclo();
    }, HEARTBEAT_INTERVAL_MS);

    this.proximaExecucao = new Date(Date.now() + HEARTBEAT_INTERVAL_MS).toISOString();
    this.registrarEventoSistema('director.scheduler_iniciado', { proximaExecucao: this.proximaExecucao });
    return { status: 'started', proximaExecucao: this.proximaExecucao };
  }

  pararScheduler() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
    this.registrarEventoSistema('director.scheduler_parado', { timestamp: new Date().toISOString() });
    return { status: 'stopped' };
  }

  getSchedulerStatus() {
    return {
      running: this.running,
      killSwitch: this.killSwitchAtivo,
      ultimaExecucao: this.ultimaExecucao,
      proximaExecucao: this.proximaExecucao,
      modo: this.modoGlobal,
    };
  }

  // --- Execução do ciclo principal ---
  async executarCiclo() {
    if (this.killSwitchAtivo) return { blocked: true, motivo: 'Kill switch ativo' };

    const inicio = Date.now();
    this.ultimaExecucao = new Date().toISOString();
    this.proximaExecucao = new Date(Date.now() + HEARTBEAT_INTERVAL_MS).toISOString();

    try {
      // 1. Coletar dados do sistema (Prisma + mock)
      const dadosSistema = await this.coletarDadosSistema();

      // 2. Executar cada agente
      const relatorios = await Promise.all(
        AGENTES.map(nome => this.executarAgente(nome, dadosSistema))
      );

      // 3. Consolidar (Diretor IA)
      const consolidado = this.consolidarRelatorios(relatorios);

      // 4. Processar aprovações pendentes (se modo assistido/autônomo)
      if (this.modoGlobal !== 'manual') {
        await this.processarAprovacoesAutomaticas(consolidado);
      }

      // 5. Enfileirar tarefas automáticas permitidas
      if (this.modoGlobal === 'autonomo') {
        await this.enfileirarTarefasAutonomas(consolidado);
      }

      // 6. Emitir eventos de heartbeat
      await emitEvent(EVENT_TYPES.HEARTBEAT, {
        timestamp: this.ultimaExecucao,
        modo: this.modoGlobal,
        areasSaudaveis: consolidado.saudaveis.length,
        areasCriticas: consolidado.criticos.length,
      }, 'DirectorIA');

      const duracao = Date.now() - inicio;
      this.registrarHistorico({
        timestamp: this.ultimaExecucao,
        duracaoMs: duracao,
        modo: this.modoGlobal,
        relatorios: relatorios.length,
        criticos: consolidado.criticos.length,
        tarefasEnfileiradas: consolidado.tarefasEnfileiradas || 0,
      });

      return { success: true, duracaoMs: duracao, consolidado };

    } catch (error) {
      this.registrarEventoSistema('director.erro', { erro: error.message, timestamp: new Date().toISOString() });
      return { success: false, error: error.message };
    }
  }

  // --- Coletar dados reais do sistema ---
  async coletarDadosSistema() {
    try {
      console.log('[DirectorIA] Tentando conectar ao banco...');
      const [produtos, pedidos, clientes] = await Promise.all([
        prisma.product.findMany({ where: { status: 'ativo' } }),
        prisma.order.findMany({ orderBy: { id: 'desc' }, take: 200 }),
        prisma.customer.findMany(),
      ]);
      console.log('[DirectorIA] Dados coletados:', { produtos: produtos.length, pedidos: pedidos.length, clientes: clientes.length });
      return {
        produtos,
        pedidos,
        clientes,
        compras: [],
        notasFiscais: [],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[DirectorIA] Erro ao buscar dados Prisma:', error.message, error.stack);
      return this.getMockDados();
    }
  }

  getMockDados() {
    // Fallback para mock data se Prisma falhar
    return {
      produtos: [],
      pedidos: [],
      clientes: [],
      compras: [],
      notasFiscais: [],
      timestamp: new Date().toISOString(),
      mock: true,
    };
  }

  // --- Executar agente individual ---
  async executarAgente(nome, dados) {
    const inicio = Date.now();
    try {
      let resultado;

      switch (nome) {
        case 'StockGuard':
          resultado = this.analisarEstoque(dados);
          break;
        case 'CompraGuard':
          resultado = this.analisarCompras(dados);
          break;
        case 'MarketRadar':
          resultado = this.analisarMercado(dados);
          break;
        case 'FiscalGuard':
          resultado = this.analisarFiscal(dados);
          break;
        case 'SalesAnalyst':
          resultado = this.analisarVendas(dados);
          break;
        case 'PriceWatch':
          resultado = this.analisarPrecos(dados);
          break;
        case 'SocialPilot':
          resultado = this.analisarSocial(dados);
          break;
        case 'OmniAdvisor':
        default:
          resultado = this.analisarGeral(dados);
      }

      // Emitir evento de agente concluído
      await emitEvent(EVENT_TYPES.AGENT_COMPLETED, {
        agente: nome,
        duracaoMs: Date.now() - inicio,
        resumo: resultado.resumo,
        temAlertas: /risco|atenção|precisando|problema|rejeitada|ruptura|crítico/i.test(resultado.resumo),
      }, 'DirectorIA', { correlationId: `director_cycle_${Date.now()}` });

      return { nome, ...resultado, duracaoMs: Date.now() - inicio, status: 'ok' };

    } catch (error) {
      await emitEvent(EVENT_TYPES.AGENT_ERROR, {
        agente: nome,
        erro: error.message,
      }, 'DirectorIA');
      return { nome, error: error.message, status: 'error', duracaoMs: Date.now() - inicio };
    }
  }

  // --- Análises dos agentes (lógica de negócio) ---
  analisarEstoque(dados) {
    const { produtos } = dados;
    const criticos = produtos.filter(p => p.estoque <= (p.minimo || 5));
    const baixos = produtos.filter(p => p.estoque > (p.minimo || 5) && p.estoque <= (p.minimo || 5) * 2);
    return {
      agente: 'StockGuard',
      resumo: criticos.length > 0 ? `${criticos.length} produtos em risco de ruptura` : 'Estoque saudável',
      insights: [
        ...criticos.map(p => `${p.nome}: ${p.estoque} un (mínimo ${p.minimo || 5}) — ${p.fornecedor || 'N/A'}`),
        `${baixos.length} produtos com estoque baixo`,
      ],
      recomendacoes: [
        'Gerar ordens de compra automáticas para os itens críticos',
        'Revisar o estoque de segurança dos itens com status baixo',
      ],
      acoesSugeridas: criticos.map(p => ({
        action: 'stock.replenish',
        entityId: String(p.id),
        payload: { productId: p.id, productName: p.nome, qtySugerida: (p.minimo || 5) * 3 - p.estoque },
        prioridade: 'high',
        requerAprovacao: this.politicasAprovacao.riscoRuptura.exigeAprovacao,
      })),
    };
  }

  analisarCompras(dados) {
    const { compras } = dados;
    const emCurso = compras.filter(c => ['pendente', 'enviado', 'em trânsito'].includes(c.status));
    const totalEmCurso = emCurso.reduce((a, c) => a + (c.total || 0), 0);
    const atrasadas = compras.filter(c => c.status === 'em trânsito' && new Date(c.previsaoEntrega) < new Date());
    return {
      agente: 'CompraGuard',
      resumo: `${emCurso.length} compras em andamento (R$ ${totalEmCurso.toFixed(2)})`,
      insights: [
        ...emCurso.map(c => `${c.id} — ${c.fornecedor}: R$ ${(c.total || 0).toFixed(2)} (${c.status})`),
        atrasadas.length > 0 ? `${atrasadas.length} entregas atrasadas` : 'Nenhuma entrega atrasada',
      ],
      recomendacoes: [
        'Acompanhar os prazos de entrega dos fornecedores',
        'Priorizar o recebimento das ordens com itens críticos',
      ],
      acoesSugeridas: atrasadas.map(c => ({
        action: 'purchase.track_delivery',
        entityId: String(c.id),
        payload: { purchaseId: c.id, fornecedor: c.fornecedor },
        prioridade: 'normal',
      })),
    };
  }

  analisarMercado(dados) {
    // Em produção, integraria com APIs externas
    return {
      agente: 'MarketRadar',
      resumo: 'Monitoramento de mercado ativo (mock)',
      insights: ['Simulação: 3 oportunidades de alta margem detectadas'],
      recomendacoes: [
        'Investir nos 3 produtos de maior Opportunity Score',
        'Monitorar a concorrência dos produtos emergentes',
      ],
      acoesSugeridas: [],
    };
  }

  analisarFiscal(dados) {
    const { notasFiscais } = dados;
    const pendentes = notasFiscais.filter(n => n.status !== 'autorizada');
    const rejeitadas = notasFiscais.filter(n => n.status === 'rejeitada');
    return {
      agente: 'FiscalGuard',
      resumo: pendentes.length > 0 ? `${pendentes.length} notas precisando de atenção` : 'Fiscal em dia',
      insights: [
        ...pendentes.map(n => `${n.numero}: ${n.status} (origem ${n.origem})`),
        rejeitadas.length > 0 ? `${rejeitadas.length} notas REJEITADAS` : '',
      ].filter(Boolean),
      recomendacoes: [
        'Corrigir a rejeição das notas fiscais pendentes',
        'Enviar as notas pendentes para o contador',
      ],
      acoesSugeridas: rejeitadas.map(n => ({
        action: 'fiscal.open_bo',
        entityId: String(n.id),
        payload: { notaId: n.id, numero: n.numero, motivo: 'Nota fiscal rejeitada' },
        prioridade: 'critical',
        requerAprovacao: this.politicasAprovacao.divergenciaFiscal.exigeAprovacao,
      })),
    };
  }

  analisarVendas(dados) {
    const { pedidos } = dados;
    const total = pedidos.reduce((a, p) => a + (p.total || 0), 0);
    return {
      agente: 'SalesAnalyst',
      resumo: `Faturamento de R$ ${total.toFixed(2)} em ${pedidos.length} pedidos`,
      insights: [
        `Ticket médio: R$ ${(total / Math.max(pedidos.length, 1)).toFixed(2)}`,
      ],
      recomendacoes: [
        'Dobrar o investimento no canal de melhor performance',
        'Ativar remarketing para carrinhos abandonados',
      ],
      acoesSugeridas: [],
    };
  }

  analisarPrecos(dados) {
    return {
      agente: 'PriceWatch',
      resumo: 'Preços competitivos monitorados (mock)',
      insights: ['Simulação: seu preço médio está 2% abaixo da concorrência'],
      recomendacoes: [
        'Manter preços atuais e monitorar diariamente',
        'Ajustar se conversão cair abaixo de 2%',
      ],
      acoesSugeridas: [],
    };
  }

  analisarSocial(dados) {
    return {
      agente: 'SocialPilot',
      resumo: 'Calendário de publicações ativo (mock)',
      insights: ['4 publicações agendadas esta semana'],
      recomendacoes: [
        'Postar 4x por semana no Instagram (melhor engajamento)',
        'Usar produtos em alta do Radar como tema',
      ],
      acoesSugeridas: [],
    };
  }

  analisarGeral(dados) {
    const { pedidos, produtos } = dados;
    const total = pedidos.reduce((a, p) => a + (p.total || 0), 0);
    const criticos = produtos.filter(p => p.estoque <= (p.minimo || 5)).length;
    return {
      agente: 'OmniAdvisor',
      resumo: 'Operação saudável com pontos de atenção',
      insights: [
        `Faturamento: R$ ${total.toFixed(2)} em ${pedidos.length} pedidos`,
        `${criticos} produtos precisam de reposição`,
      ],
      recomendacoes: [
        'Focar em reposição de estoque e no canal de melhor performance',
        'Revisar margem dos produtos abaixo de 20%',
      ],
      acoesSugeridas: [],
    };
  }

  // --- Consolidação do Diretor ---
  consolidarRelatorios(relatorios) {
    const comAlerta = relatorios.filter(r =>
      r.resumo && /risco|atenção|precisando|problema|rejeitada|atraso|ruptura|crítico/i.test(r.resumo)
    );
    const saudaveis = relatorios.filter(r => !comAlerta.includes(r));

    const prioridades = relatorios
      .map(r => ({ agente: r.nome, acao: r.recomendacoes?.[0] || '' }))
      .filter(p => p.acao)
      .slice(0, 5);

    // Coletar todas as ações sugeridas
    const todasAcoes = relatorios.flatMap(r => r.acoesSugeridas || []);

    return {
      relatorios,
      resumo: `${saudaveis.length} áreas saudáveis · ${comAlerta.length} precisando de atenção`,
      saudaveis: saudaveis.map(r => ({ agente: r.nome, detalhe: r.resumo })),
      criticos: comAlerta.map(r => ({ agente: r.nome, detalhe: r.resumo })),
      prioridades,
      tarefasEnfileiradas: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // --- Processar aprovações automáticas (modo assistido) ---
  async processarAprovacoesAutomaticas(consolidado) {
    // Em modo assistido: apenas notificar/registrar necessidade de aprovação
    const acoesRequerendoAprovacao = consolidado.relatorios.flatMap(r =>
      (r.acoesSugeridas || []).filter(a => a.requerAprovacao)
    );

    for (const acao of acoesRequerendoAprovacao) {
      await emitEvent('approval.required', {
        agente: acao.agente || 'DirectorIA',
        acao: acao.action,
        entidade: acao.entityId,
        payload: acao.payload,
        prioridade: acao.prioridade,
        motivo: 'Ação requer aprovação conforme política',
      }, 'DirectorIA');
    }

    return acoesRequerendoAprovacao.length;
  }

  // --- Enfileirar tarefas autônomas (modo autônomo) ---
  async enfileirarTarefasAutonomas(consolidado) {
    let enfileiradas = 0;
    const acoesPermitidas = consolidado.relatorios.flatMap(r =>
      (r.acoesSugeridas || []).filter(a => !a.requerAprovacao || this.modoGlobal === 'autonomo')
    );

    for (const acao of acoesPermitidas) {
      // Verificar limites (Risk Engine simplificado)
      if (this.verificarLimites(acao)) {
        const result = taskQueue.enqueue({
          agentId: 'DirectorIA',
          action: acao.action,
          entityType: 'product',
          entityId: acao.entityId,
          payload: acao.payload,
          priority: acao.prioridade || 'normal',
          correlationId: `director_auto_${Date.now()}`,
        });
        if (!result.duplicate) enfileiradas++;
      }
    }

    consolidado.tarefasEnfileiradas = enfileiradas;
    return enfileiradas;
  }

  // --- Risk Engine simplificado ---
  verificarLimites(acao) {
    // Limites diários por agente/ação
    const hoje = new Date().toISOString().slice(0, 10);
    const tarefasHoje = this.historicoExecucoes.filter(h =>
      h.timestamp.startsWith(hoje) && h.tarefasEnfileiradas > 0
    );

    // Limite: máx 50 tarefas automáticas por dia
    const totalHoje = tarefasHoje.reduce((a, h) => a + (h.tarefasEnfileiradas || 0), 0);
    if (totalHoje >= 50) return false;

    // Limite por agente: máx 10 tarefas/dia
    const agenteHoje = tarefasHoje.filter(h => h.agente === (acao.agente || 'DirectorIA')).length;
    if (agenteHoje >= 10) return false;

    return true;
  }

  // --- Eventos de sistema ---
  async registrarEventoSistema(tipo, payload) {
    await emitEvent(tipo, payload, 'DirectorIA');
  }

  registrarHistorico(entrada) {
    this.historicoExecucoes.unshift(entrada);
    if (this.historicoExecucoes.length > this.maxHistorico) {
      this.historicoExecucoes = this.historicoExecucoes.slice(0, this.maxHistorico);
    }
  }

  getHistorico(limit = 50) {
    return this.historicoExecucoes.slice(0, limit);
  }

  // --- Políticas de aprovação ---
  atualizarPolitica(chave, config) {
    if (this.politicasAprovacao[chave]) {
      this.politicasAprovacao[chave] = { ...this.politicasAprovacao[chave], ...config };
      this.registrarEventoSistema('director.politica_atualizada', { chave, config });
    }
    return this.politicasAprovacao;
  }

  getPoliticas() {
    return this.politicasAprovacao;
  }
}

export const directorIA = new DirectorIA();