// ============================================
// agentRegistry.js — Registro centralizado de agentes.
// Fonte única de verdade para: ids, nomes, descrições, permissões,
// status, ferramentas, métricas, agendamento e configuração.
// ============================================

// Agentes do NEXORA/OmniSync IA — ordem definida na especificação.
// Cada agente tem: id, nome, descrição, status padrão, permissões e ferramentas.
export const AGENTES = {
  OmniAdvisor: {
    id: 'OmniAdvisor',
    nome: 'OmniAdvisor',
    descricao: 'Visão comercial e recomendações gerais',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar'],
    ferramentas: ['dadosVendas', 'dadosEstoque', 'metricasFinanceiras'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'manual', // manual | assistido | autonomo
      requisitosAprovacao: [],
    },
  },
  CompraGuard: {
    id: 'CompraGuard',
    nome: 'CompraGuard',
    descricao: 'Compras, reposição e fornecedores',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar', 'criarOrdemCompra'],
    ferramentas: ['radarProduto', 'historicoFornecedores', 'estoqueMinimo'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'assistido',
      requisitosAprovacao: ['altoImpacto', 'mudancaPreco'],
    },
  },
  MarketRadar: {
    id: 'MarketRadar',
    nome: 'MarketRadar',
    descricao: 'Oportunidades e análise de mercado',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar'],
    ferramentas: ['radarMercado', 'fonteExterna', 'scoreProduto'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'manual',
      requisitosAprovacao: [],
    },
  },
  FiscalGuard: {
    id: 'FiscalGuard',
    nome: 'FiscalGuard',
    descricao: 'Conformidade fiscal e notas fiscais',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar', 'abrirBO'],
    ferramentas: ['consultaFiscal', 'validacaoXML', 'historicoNotas'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'assistido',
      requisitosAprovacao: ['altoRisco', 'divergenciaFiscal'],
    },
  },
  SalesAnalyst: {
    id: 'SalesAnalyst',
    nome: 'SalesAnalyst',
    descricao: 'Vendas e performance',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar'],
    ferramentas: ['faturamento', 'ticketMedio', 'conversao'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'manual',
      requisitosAprovacao: [],
    },
  },
  PriceWatch: {
    id: 'PriceWatch',
    nome: 'PriceWatch',
    descricao: 'Monitor de preços e margem',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar'],
    ferramentas: ['historicoPrecos', 'concorrencia', 'margemMinima'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'assistido',
      requisitosAprovacao: ['alteracaoPrecoAcimaDe10Pct'],
    },
  },
  StockGuard: {
    id: 'StockGuard',
    nome: 'StockGuard',
    descricao: 'Gestão de estoque e ruptura',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar', 'abrirBO'],
    ferramentas: ['nivelEstoque', 'previsaoReposicao', 'alertaRuptura'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'assistido',
      requisitosAprovacao: ['riscoRuptura', 'estoqueCritico'],
    },
  },
  SocialPilot: {
    id: 'SocialPilot',
    nome: 'SocialPilot',
    descricao: 'Marketing/social e campanhas',
    status: 'ativo',
    permissoes: ['analisar', 'recomendar', 'agendarPublicacao'],
    ferramentas: ['calendario', 'analytics', 'geradorLegenda'],
    ultimaExecucao: null,
    proximaExecucao: null,
    metricas: {
      totalAnalises: 0,
      acuracia: 0,
      ultimasRespostas: [],
    },
    configuracao: {
      moduloAutonomia: 'assistido',
      requisitosAprovacao: ['campanhaAltaInvestimento'],
    },
  },
};

// ============================================
// Agent Registry — Classe única de instância
// ============================================

class AgentRegistry {
  constructor() {
    this.registry = new Map();

    // Inicializar registro com todos os agentes definidos acima
    for (const [agenteId, agenteDef] of Object.entries(this.AGENTES)) {
      this.registry.set(agenteId, {
        ...agenteDef,
        ultimaExecucao: null,
        proximaExecucao: null,
        metricas: {
          ...agenteDef.metricas,
          totalAnalises: 0,
        },
        historico: [],
        eventosRecebidos: [],
      });
    }

    // Heartbeat scheduler config
    this.heartbeatInterval = null;
    this.heartbeatTimeout = 30 * 60 * 1000; // 30 minutos padrão
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 segundos
    this.running = false;
  }

  // --- Acesso e estado ---

  get(agenteId) {
    return this.registry.get(agenteId) || null;
  }

  getAll() {
    return Array.from(this.registry.values());
  }

  getAtivos() {
    return this.getAll().filter((a) => a.status === 'ativo');
  }

  getInativos() {
    return this.getAll().filter((a) => a.status === 'pausado' || a.status === 'erro');
  }

  // --- Atualização de estado ---

  atualizarStatus(agenteId, novoStatus) {
    const agente = this.get(agenteId);
    if (!agente) return false;
    agente.status = novoStatus;
    agente.ultimaAtualizacao = new Date().toISOString();
    return true;
  }

  atualizarUltimaExecucao(agenteId) {
    const agente = this.get(agenteId);
    if (!agente) return false;
    agente.ultimaExecucao = new Date().toISOString();
    agente.metricas.totalAnalises = (agente.metricas.totalAnalises || 0) + 1;
    return true;
  }

  proximaExecucao(agenteId, intervalMs) {
    const agente = this.get(agenteId);
    if (!agente) return false;
    agente.proximaExecucao = new Date(Date.now() + (intervalMs || this.heartbeatTimeout)).toISOString();
    return true;
  }

  // --- Heartbeat / Scheduler ---

  iniciarHeartbeat() {
    if (this.running) return;
    this.running = true;

    const executarHeartbeat = () => {
      const agora = new Date().toISOString();
      for (const agente of this.getAtivos()) {
        // Atualizar último heartbeat
        agente.ultimaExecucao = agora;

        // Agendar próxima execução
        this.proximaExecucao(agente.id, this.heartbeatTimeout);

        // Registrar evento de heartbeat
        this.registrarEvento(agente.id, 'heartbeat', { timestamp: agora, status: 'ok' });
      }
    };

    this.heartbeatInterval = setInterval(executarHeartbeat, this.heartbeatTimeout);
    executarHeartbeat(); // executar imediatamente na inicialização
    return this;
  }

  pararHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.running = false;
    return this;
  }

  // --- Event Bus — Comunicação entre agentes ---

  registrarEvento(agenteId, tipo, payload) {
    const agente = this.get(agenteId);
    if (!agente) return null;

    const evento = {
      event_id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: tipo,
      timestamp: new Date().toISOString(),
      source_agent: agenteId,
      entity_type: payload.entity_type || 'system',
      entity_id: payload.entity_id || null,
      correlation_id: payload.correlation_id || null,
      causation_id: payload.causation_id || null,
      severity: payload.severity || 'info',
      payload: payload.conteudo || {},
    };

    agente.eventosRecebidos.push(evento);

    // Manter histórico limitado (últimos 100 eventos)
    if (agente.eventosRecebidos.length > 100) {
      agente.eventosRecebidos = agente.eventosRecebidos.slice(-100);
    }

    // Dispatch: notificar outros agentes interessados
    this.dispatarEvento(evento);

    return evento;
  }

  // Inscrever um agente para receber eventos de tipos específicos
  subscritor(agenteIdDestino, tiposAceitos) {
    const destino = this.get(agenteIdDestino);
    if (!destino) return null;

    return (evento) => {
      if (tiposAceitos.includes(evento.type)) {
        destino.eventosRecebidos.push({
          ...evento,
          recebidoEm: new Date().toISOString(),
        });
        if (destino.eventosRecebidos.length > 100) {
          destino.eventosRecebidos = destino.eventosRecebidos.slice(-100);
        }
      }
    };
  }

  dispatcharEvento(evento) {
    // Broadcast simples: todos os agentes podem ouvir, mas apenas os subscritores processam
    const tiposPadrao = ['stock.low_detected', 'price.change_detected', 'fiscal.divergence', 'ia.anomaly'];
    for (const tipo of tiposPadrao) {
      if (evento.type === tipo) {
        // Notificar todos os agentes ativos
        for (const agente of this.getAtivos()) {
          if (agente.id !== evento.source_agent) {
            agente.eventosRecebidos.push({
              ...evento,
              recebidoEm: new Date().toISOString(),
            });
          }
        }
        break;
      }
    }
  }

  // --- Task Queue — Para ações assíncronas ---

  filaTarefas = [];

  enfileirarTarefa(tarefa) {
    const tarefaComId = {
      ...tarefa,
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      status: 'pending',
      criadaEm: new Date().toISOString(),
    };
    this.filaTarefas.push(tarefaComId);
    // Manter fila limitada
    if (this.filaTarefas.length > 500) {
      this.filaTarefas = this.filaTarefas.slice(-500);
    }
    return tarefaComId.id;
  }

  async processarFila() {
    const tarefasPending = this.filaTarefas.filter((t) => t.status === 'pending');
    for (const tarefa of tarefasPending) {
      try {
        tarefa.status = 'executando';
        tarefa.atualizadaEm = new Date().toISOString();
        await tarefa.acao();
        tarefa.status = 'concluido';
        tarefa.concluidaEm = new Date().toISOString();
      } catch (erro) {
        tarefa.status = 'erro';
        tarefa.erro = erro.message || 'Erro desconhecido';
        tarefa.atualizadaEm = new Date().toISOString();
        // Dead-letter: registrar falha
        this.registrarEvento(tarefa.agenteId || 'system', 'task.erro', {
          taskId: tarefa.id,
          erro: erro.message,
          tentativas: (tarefa.tentativas || 0) + 1,
        });
        if ((tarefa.tentativas || 0) >= this.maxRetries) {
          // Excedeu tentativas — ir para dead letter
          tarefa.status = 'dead_letter';
        } else {
          // Retentar após delay
          tarefa.tentativas = (tarefa.tentativas || 0) + 1;
          setTimeout(() => this.processarFila(), this.retryDelay);
        }
      }
    }
    return this;
  }

  // --- Kill Switch ---

  killSwitchAtivo = false;

  ativarKillSwitch() {
    this.killSwitchAtivo = true;
    this.pararHeartbeat();
    // Bloquear novas tarefas
    for (const tarefa of this.filaTarefas) {
      if (tarefa.status === 'pending') {
        tarefa.status = 'bloqueado';
      }
    }
    this.registrarEvento('system', 'killswitch.ativado', {
      timestamp: new Date().toISOString(),
      motivo: 'Paremento global solicitado',
    });
    return true;
  }

  desativarKillSwitch() {
    this.killSwitchAtivo = false;
    this.registrarEvento('system', 'killswitch.desativado', {
      timestamp: new Date().toISOString(),
      motivo: 'Retomada solicitada explicitamente',
    });
    // Heartbeat pode ser reiniciado manualmente
    return true;
  }

  // --- Utilitário: verificar se agente pode executar ação ---

  podeExecutar(agenteId, tipoAcao, entidade, valor) {
    const agente = this.get(agenteId);
    if (!agente || this.killSwitchAtivo) return { pode: false, motivo: 'Kill switch ativo ou agente inexistente' };

    const configuracao = agente.configuracao || {};
    const requisitosAprovacao = configuracao.requisitosAprovacao || [];

    // Verificar limites de autonomia
    if (configuracao.moduloAutonomia === 'manual') {
      return { pode: false, motivo: 'Modo manual ativo — apenas análise/recomendação' };
    }

    // Verificar requisitos de aprovação baseados no tipo de ação e valor
    const requisitosCriticos = {
      'altoImpacto': valor && valor > 1000, // exemplo: acima de R$ 1k
      'mudancaPreco': valor && valor > 0.1, // 10% de mudança
      'altoRisco': !valor, // sem valor definido = risco alto
      'riscoRuptura': !valor, // estoque crítico sem parâmetros
      'estoqueCritico': !valor,
      'campanhaAltaInvestimento': valor && valor > 5000,
    };

    for (const requisito of requisitosAprovacao) {
      if (requisitosCriticos[requisito]) {
        return {
          pode: false,
          motivo: `Ação requiere aprovação: ${requisito} (valor: ${valor})`,
        };
      }
    }

    return { pode: true, motivo: 'Permitido conforme política' };
  }
}

// Exportar instância única
export const agentRegistry = new AgentRegistry();

// Exportar tipos úteis (compatível com TypeScript consumers).
// O linter sinaliza 'export type' em JS — o build passa normalmente.
// Removido export type para passar no oxlint (arquivo .js).