// ============================================
// riskEngine.js — Motor de risco para avaliar ações
// antes da execução automática.
// ============================================

export class RiskEngine {
  constructor(options = {}) {
    this.limites = {
      // Limites financeiros
      valorMaximoAcao: options.valorMaximoAcao || 10000, // R$ 10k por ação
      valorMaximoDiario: options.valorMaximoDiario || 50000, // R$ 50k/dia
      percentualMaximoMudancaPreco: options.percentualMaximoMudancaPreco || 0.15, // 15%

      // Limites operacionais
      maxOrdensCompraDia: options.maxOrdensCompraDia || 20,
      maxAtualizacoesPrecoDia: options.maxAtualizacoesPrecoDia || 50,
      maxPublicacoesDia: options.maxPublicacoesDia || 10,

      // Estoque
      estoqueMinimoCritico: options.estoqueMinimoCritico || 5,
      margemMinima: options.margemMinima || 0.10, // 10%

      // Rate limiting
      maxAcoesPorAgenteHora: options.maxAcoesPorAgenteHora || 10,
      maxAcoesPorAgenteDia: options.maxAcoesPorAgenteDia || 50,
    };

    this.historicoAcoes = []; // { timestamp, agente, acao, valor, status }
    this.maxHistorico = 10000;
  }

  // Avaliar risco de uma ação proposta
  avaliar(acao) {
    const { agente, action, payload, valorEstimado = 0 } = acao;
    const agora = new Date();
    const hoje = agora.toISOString().slice(0, 10);
    const horaAtual = agora.getHours();

    const riscos = [];
    let nivelRisco = 'baixo'; // 'baixo' | 'medio' | 'alto' | 'critico'
    let exigeAprovacao = false;

    // 1. Valor financeiro
    if (valorEstimado > this.limites.valorMaximoAcao) {
      riscos.push(`Valor da ação (R$ ${valorEstimado.toFixed(2)}) excede limite por ação (R$ ${this.limites.valorMaximoAcao.toFixed(2)})`);
      nivelRisco = 'critico';
      exigeAprovacao = true;
    } else if (valorEstimado > this.limites.valorMaximoAcao * 0.5) {
      riscos.push(`Valor da ação (R$ ${valorEstimado.toFixed(2)}) acima de 50% do limite por ação`);
      if (nivelRisco === 'baixo') nivelRisco = 'medio';
      exigeAprovacao = true;
    }

    // 2. Gasto diário acumulado
    const gastoHoje = this.historicoAcoes
      .filter(h => h.timestamp.startsWith(hoje) && h.status === 'executado')
      .reduce((s, h) => s + (h.valor || 0), 0);

    if (gastoHoje + valorEstimado > this.limites.valorMaximoDiario) {
      riscos.push(`Gasto diário projetado (R$ ${(gastoHoje + valorEstimado).toFixed(2)}) excede limite diário (R$ ${this.limites.valorMaximoDiario.toFixed(2)})`);
      nivelRisco = 'critico';
      exigeAprovacao = true;
    } else if (gastoHoje + valorEstimado > this.limites.valorMaximoDiario * 0.7) {
      riscos.push(`Gasto diário projetado acima de 70% do limite`);
      if (nivelRisco === 'baixo') nivelRisco = 'medio';
    }

    // 3. Ações por agente/hora
    const acoesAgenteHora = this.historicoAcoes.filter(h =>
      h.agente === agente &&
      h.timestamp.startsWith(hoje) &&
      new Date(h.timestamp).getHours() === horaAtual
    ).length;

    if (acoesAgenteHora >= this.limites.maxAcoesPorAgenteHora) {
      riscos.push(`Agente ${agente} excedeu limite de ações/hora (${this.limites.maxAcoesPorAgenteHora})`);
      nivelRisco = 'alto';
      exigeAprovacao = true;
    }

    // 4. Ações por agente/dia
    const acoesAgenteDia = this.historicoAcoes.filter(h =>
      h.agente === agente && h.timestamp.startsWith(hoje)
    ).length;

    if (acoesAgenteDia >= this.limites.maxAcoesPorAgenteDia) {
      riscos.push(`Agente ${agente} excedeu limite de ações/dia (${this.limites.maxAcoesPorAgenteDia})`);
      nivelRisco = 'critico';
      exigeAprovacao = true;
    }

    // 5. Regras específicas por tipo de ação
    switch (action) {
      case 'price.update':
        const pctMudanca = payload?.percentualMudanca || 0;
        if (Math.abs(pctMudanca) > this.limites.percentualMaximoMudancaPreco) {
          riscos.push(`Mudança de preço (${(pctMudanca * 100).toFixed(1)}%) excede limite (${(this.limites.percentualMaximoMudancaPreco * 100).toFixed(1)}%)`);
          nivelRisco = 'alto';
          exigeAprovacao = true;
        }
        break;

      case 'purchase.create_order':
        const qtdOrdensHoje = this.historicoAcoes.filter(h =>
          h.action === 'purchase.create_order' && h.timestamp.startsWith(hoje)
        ).length;
        if (qtdOrdensHoje >= this.limites.maxOrdensCompraDia) {
          riscos.push(`Limite de ordens de compra/dia atingido (${this.limites.maxOrdensCompraDia})`);
          nivelRisco = 'alto';
          exigeAprovacao = true;
        }
        break;

      case 'social.schedule_post':
        const pubsHoje = this.historicoAcoes.filter(h =>
          h.action === 'social.schedule_post' && h.timestamp.startsWith(hoje)
        ).length;
        if (pubsHoje >= this.limites.maxPublicacoesDia) {
          riscos.push(`Limite de publicações/dia atingido (${this.limites.maxPublicacoesDia})`);
          nivelRisco = 'medio';
        }
        break;

      case 'stock.replenish':
        const estoqueAtual = payload?.estoqueAtual || 999;
        if (estoqueAtual <= this.limites.estoqueMinimoCritico) {
          riscos.push(`Estoque crítico (${estoqueAtual} un) - reposição urgente`);
          if (nivelRisco === 'baixo') nivelRisco = 'medio';
        }
        break;
    }

    // 5. Reversibilidade
    const acoesIrreversiveis = ['purchase.create_order', 'fiscal.validate_nfe'];
    if (acoesIrreversiveis.includes(action)) {
      riscos.push('Ação irreversível - requer confirmação explícita');
      if (nivelRisco === 'baixo') nivelRisco = 'medio';
      exigeAprovacao = true;
    }

    return {
      aprovado: !exigeAprovacao && nivelRisco !== 'critico',
      exigeAprovacao,
      nivelRisco,
      riscos,
      limites: {
        valorMaximoAcao: this.limites.valorMaximoAcao,
        valorMaximoDiario: this.limites.valorMaximoDiario,
        gastoHoje,
        acoesAgenteHora,
        acoesAgenteDia,
      },
      recomendacao: exigeAprovacao
        ? 'Enviar para aprovação humana'
        : nivelRisco === 'alto'
          ? 'Executar com monitoramento'
          : 'Executar automaticamente',
    };
  }

  // Registrar ação executada
  registrarExecucao(acao, status, valor = 0) {
    this.historicoAcoes.unshift({
      timestamp: new Date().toISOString(),
      agente: acao.agente,
      action: acao.action,
      entityId: acao.entityId,
      payload: acao.payload,
      valor,
      status, // 'executado' | 'rejeitado' | 'aprovado' | 'falhou'
    });

    if (this.historicoAcoes.length > this.maxHistorico) {
      this.historicoAcoes = this.historicoAcoes.slice(0, this.maxHistorico);
    }
  }

  getHistorico(limit = 100) {
    return this.historicoAcoes.slice(0, limit);
  }

  getEstatisticas() {
    const hoje = new Date().toISOString().slice(0, 10);
    const hojeAcoes = this.historicoAcoes.filter(h => h.timestamp.startsWith(hoje));
    return {
      hoje: {
        total: hojeAcoes.length,
        executadas: hojeAcoes.filter(h => h.status === 'executado').length,
        rejeitadas: hojeAcoes.filter(h => h.status === 'rejeitado').length,
        valorTotal: hojeAcoes.filter(h => h.status === 'executado').reduce((s, h) => s + (h.valor || 0), 0),
      },
      limites: this.limites,
    };
  }

  atualizarLimite(chave, valor) {
    if (this.limites.hasOwnProperty(chave)) {
      this.limites[chave] = valor;
      return true;
    }
    return false;
  }
}

export const riskEngine = new RiskEngine();