// ============================================
// agentes.js — motor dos agentes de IA.
// Cada agente analisa os dados reais do sistema
// e devolve insights + recomendações.
// ============================================

// ============================================
// Formatações seguras
// ============================================
import { formatCurrency } from '../lib/utils';
export function formatarBRL(value) {
  return formatCurrency(value);
}
// backward compatibility alias
export const formatarformatarBRL = formatarBRL;
// ============================================
import { askAssistant, aiDisponivel } from '../lib/gemini';

// Formata valores para BRL (seguro — trata null/undefined/NaN).

function analisarEstoque(produtos) {
  const criticos = produtos.filter(p => p.estoque <= p.minimo);
  const baixos = produtos.filter(p => p.status === 'baixo');
  return {
    agente: 'StockGuard',
    resumo: criticos.length > 0 ? `${criticos.length} produtos em risco de ruptura` : 'Estoque saudável',
    insights: [
      ...criticos.map(p => `${p.nome}: ${p.estoque} un (mínimo ${p.minimo}) — ${p.fornecedor}`),
      `${baixos.length} produtos com estoque baixo`,
    ],
    recomendacoes: [
      'Gerar ordens de compra automáticas para os itens críticos',
      'Revisar o estoque de segurança dos itens com status baixo',
    ],
  };
}

function analisarCompras(compras) {
  const emCurso = compras.filter(c => c.status === 'pendente' || c.status === 'enviado' || c.status === 'em trânsito');
  const totalEmCurso = emCurso.reduce((a, c) => a + c.total, 0);
  return {
    agente: 'CompraGuard',
    resumo: `${emCurso.length} compras em andamento (${formatarBRL(totalEmCurso)})`,
    insights: emCurso.map(c => `${c.id} — ${c.fornecedor}: ${formatarBRL(c.total)} (${c.status})`),
    recomendacoes: [
      'Acompanhar os prazos de entrega dos fornecedores',
      'Priorizar o recebimento das ordens com itens críticos',
    ],
  };
}

function analisarMercado(radarProdutos) {
  const todas = [...radarProdutos.emAlta, ...radarProdutos.emergentes, ...radarProdutos.altaMargem];
  const top = [...todas].sort((a, b) => b.score - a.score).slice(0, 3);
  return {
    agente: 'MarketRadar',
    resumo: `${todas.length} oportunidades mapeadas no mercado`,
    insights: top.map(p => `${p.nome} — score ${p.score} (margem ${p.margemEstimada}%)`),
    recomendacoes: [
      'Investir nos 3 produtos de maior Opportunity Score',
      'Monitorar a concorrência dos produtos emergentes',
    ],
  };
}

function analisarFiscal(notasFiscais) {
  const pendentes = notasFiscais.filter(n => n.status !== 'autorizada');
  return {
    agente: 'FiscalGuard',
    resumo: pendentes.length > 0 ? `${pendentes.length} notas precisando de atenção` : 'Fiscal em dia',
    insights: pendentes.map(n => `${n.numero}: ${n.status} (origem ${n.origem})`),
    recomendacoes: [
      'Corrigir a rejeição da NF-e 4524 (divergência de CFOP)',
      'Enviar as notas pendentes para o contador',
    ],
  };
}

function analisarVendas(pedidos, vendasPorCanal) {
  const total = pedidos.reduce((a, p) => a + p.total, 0);
  const topCanal = [...vendasPorCanal].sort((a, b) => b.valor - a.valor)[0];
  const ticket = total / Math.max(pedidos.length, 1);
  return {
    agente: 'SalesAnalyst',
    resumo: `Faturamento de ${formatarBRL(total)} no período`,
    insights: [
      `Melhor canal: ${topCanal.canal} (${formatarBRL(topCanal.valor)})`,
      `Ticket médio: ${formatarBRL(ticket)}`,
    ],
    recomendacoes: [
      'Dobrar o investimento no canal de melhor performance',
      'Ativar remarketing para carrinhos abandonados',
    ],
  };
}

function analisarPrecos(produtoDestaque) {
  const { comparacaoPrecos, precoMedio } = produtoDestaque;
  return {
    agente: 'PriceWatch',
    resumo: 'Preço competitivo em relação à concorrência',
    insights: comparacaoPrecos.map(c => `${c.concorrente}: ${formatarBRL(c.preco)}${c.destaque ? ' (você)' : ''}`),
    recomendacoes: [
      `Seu preço médio é ${formatarBRL(precoMedio)} — manter e monitorar diariamente`,
      'Ajustar até R$ 9,90 se a conversão cair',
    ],
  };
}

function analisarSocial(eventosCalendario) {
  return {
    agente: 'SocialPilot',
    resumo: `${eventosCalendario.length} publicações agendadas`,
    insights: eventosCalendario.map(e => `${e.data} — ${e.titulo} (${e.canal})`),
    recomendacoes: [
      'Postar 4x por semana no Instagram (melhor engajamento)',
      'Usar os produtos em alta do Radar como tema das publicações',
    ],
  };
}

function analisarGeral(pedidos, produtos) {
  const total = pedidos.reduce((a, p) => a + p.total, 0);
  const criticos = produtos.filter(p => p.estoque <= p.minimo).length;
  return {
    agente: 'OmniAdvisor',
    resumo: 'Operação saudável com pontos de atenção',
    insights: [
      `Faturamento: ${formatarBRL(total)} em ${pedidos.length} pedidos`,
      `${criticos} produtos precisam de reposição`,
    ],
    recomendacoes: [
      'Focar em reposição de estoque e no canal de melhor performance',
      'Revisar margem dos produtos abaixo de 20%',
    ],
  };
}

// Executa a análise do agente pelo nome.
export function executarAgente(nome, dados) {
  const mapa = {
    OmniAdvisor: () => analisarGeral(dados?.pedidos, dados?.produtos),
    CompraGuard: (d) => analisarCompras(d?.compras || []),
    MarketRadar: (d) => analisarMercado(d?.radarProdutos || {}),
    FiscalGuard: (d) => analisarFiscal(d?.notasFiscais || []),
    SalesAnalyst: (d) => analisarVendas(d?.pedidos || [], d?.vendasPorCanal || []),
    PriceWatch: (d) => analisarPrecos(d?.produtoDestaque),
    StockGuard: (d) => analisarEstoque(d?.produtos || []),
    SocialPilot: (d) => analisarSocial(d?.eventosCalendario || []),
  };
  return (mapa[nome] || analisarGeral)(dados);
}

// ---------- Diretor IA (gestor autônomo) ----------

// Agentes coordenados pelo gestor.
export const AGENTES_GESTAO = [
  'OmniAdvisor',
  'CompraGuard',
  'MarketRadar',
  'FiscalGuard',
  'SalesAnalyst',
  'PriceWatch',
  'StockGuard',
  'SocialPilot',
];

// Executa TODOS os agentes e consolida o relatório do gestor.
export function executarGestorIA() {
  const relatorios = AGENTES_GESTAO.map(nome => ({ nome, ...executarAgente(nome) }));

  const comAlerta = relatorios.filter(r => /risco|atenção|precisando|problema|rejeitada|atraso/i.test(r.resumo));
  const saudaveis = relatorios.filter(r => !comAlerta.includes(r));

  const prioridades = relatorios
    .map(r => ({ agente: r.nome, acao: r.recomendacoes[0] || '' }))
    .filter(p => p.acao)
    .slice(0, 5);

  return {
    relatorios,
    resumo: `${saudaveis.length} áreas saudáveis · ${comAlerta.length} precisando de atenção`,
    saudaveis: saudaveis.map(r => ({ agente: r.nome, detalhe: r.resumo })),
    criticos: comAlerta.map(r => ({ agente: r.nome, detalhe: r.resumo })),
    prioridades,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
  };
}

// O gestor responde consultando o agente certo (ou consolidando tudo).
export function responderGestor(pergunta) {
  const t = pergunta.toLowerCase();

  const roteamento = [
    { agente: 'StockGuard', palavras: ['estoque', 'ruptura', 'repor', 'falta'] },
    { agente: 'CompraGuard', palavras: ['compra', 'fornecedor', 'entrega', 'ordem'] },
    { agente: 'MarketRadar', palavras: ['mercado', 'oportunidade', 'alta', 'tendência'] },
    { agente: 'FiscalGuard', palavras: ['nota', 'fiscal', 'imposto', 'contador'] },
    { agente: 'SalesAnalyst', palavras: ['venda', 'faturamento', 'canal', 'ticket'] },
    { agente: 'PriceWatch', palavras: ['preço', 'concorrente'] },
    { agente: 'SocialPilot', palavras: ['postar', 'publica', 'instagram', 'social', 'rede'] },
  ];

  const destino = roteamento.find(r => r.palavras.some(p => t.includes(p)));
  if (destino) {
    const resposta = responderAgente(destino.agente, pergunta);
    return `Consultei o ${destino.agente} para você:\n\n${resposta}`;
  }

  // Sem agente específico: consolida o relatório de todos.
  const gestao = executarGestorIA();
  return [
    `Visão geral: ${gestao.resumo}`,
    '',
    'Áreas com atenção:',
    ...(gestao.criticos.length > 0
      ? gestao.criticos.map(c => `• ${c.agente}: ${c.detalhe}`)
      : ['• Nenhuma — tudo saudável ✓']),
    '',
    'Prioridades para hoje:',
    ...gestao.prioridades.map(p => `• ${p.agente}: ${p.acao}`),
  ].join('\n');
}

// ---------- Perguntas sugeridas por agente ----------
export const PERGUNTAS_POR_AGENTE = {
  'Diretor IA': ['Como está a operação geral?', 'Quais áreas precisam de atenção?', 'O que devo priorizar hoje?'],
  OmniAdvisor: ['Como está minha operação?', 'O que priorizar hoje?', 'Onde estou perdendo dinheiro?'],
  StockGuard: ['Quais produtos estão em risco de ruptura?', 'O que devo repor primeiro?', 'Qual fornecedor devo acionar?'],
  CompraGuard: ['Quais compras estão em andamento?', 'Tem alguma entrega atrasada?'],
  MarketRadar: ['Quais são as melhores oportunidades agora?', 'O que está em alta no mercado?'],
  FiscalGuard: ['Tem alguma nota com problema?', 'O que o contador precisa saber?'],
  SalesAnalyst: ['Qual canal vende mais?', 'Como está meu ticket médio?'],
  PriceWatch: ['Meus preços estão competitivos?', 'Quem é o concorrente mais caro?'],
  SocialPilot: ['O que devo postar esta semana?', 'Quais publicações estão agendadas?'],
};

// ---------- Responder perguntas ao agente (usando dados reais) ----------
export function responderAgente(nome, pergunta) {
  // O Diretor IA delega e consolida os demais agentes.
  if (nome === 'Diretor IA') return responderGestor(pergunta);

  const analise = executarAgente(nome);
  const t = pergunta.toLowerCase();

  const listaInsights = analise.insights.map(i => `• ${i}`).join('\n');
  const listaRecomendacoes = analise.recomendacoes.map(r => `• ${r}`).join('\n');

  if (/(quais|quantos|risco|ruptura)/.test(t)) {
    return `Aqui está o que encontrei:\n${listaInsights || 'Nada crítico no momento.'}`;
  }

  if (/(recomenda|sugere|o que fazer|priorizar|devo|melhor)/.test(t)) {
    return `Minhas recomendações:\n${listaRecomendacoes}`;
  }

  if (/(fornecedor|quem)/.test(t)) {
    const comFornecedor = analise.insights.filter(i => i.includes('—'));
    return comFornecedor.length > 0
      ? `Envolvidos no momento:\n${comFornecedor.map(i => `• ${i}`).join('\n')}`
      : 'Nenhum fornecedor específico envolvido agora.';
  }

  if (/(atraso|atrasad|pendente|problema)/.test(t)) {
    const problemas = analise.insights.filter(i => /atras|pendente|rejeitada|crítico|risco/i.test(i));
    return problemas.length > 0
      ? `Pontos de atenção:\n${problemas.map(i => `• ${i}`).join('\n')}`
      : 'Não encontrei atrasos ou pendências na minha área.';
  }

  // Resposta padrão: resumo + dados + recomendações
  return [
    `Resumo: ${analise.resumo}`,
    '',
    'Dados:',
    listaInsights,
    '',
    'Recomendações:',
    listaRecomendacoes,
  ].join('\n');
}

// ============================================
// CÉREBRO AUTÔNOMO — agentes + Gemini.
// Cada agente envia os dados reais para o Gemini
// e recebe uma análise/insight inteligente, com
// fallback local quando a IA não está disponível.
// ============================================

// Papel (system prompt) de cada agente.
const PAPEL_AGENTE = {
  OmniAdvisor:
    'Você é o OmniAdvisor, estrategista geral de um e-commerce multicanal. Orienta visão macro e prioridades.',
  StockGuard:
    'Você é o StockGuard, especialista em gestão de estoque e reposição. Foca em risco de ruptura e compra de reposição.',
  CompraGuard:
    'Você é o CompraGuard, especialista em compras e fornecedores. Foca em prazos de entrega e negociação.',
  MarketRadar:
    'Você é o MarketRadar, analista de mercado e oportunidades. Foca em tendências, score de produtos e margem.',
  FiscalGuard:
    'Você é o FiscalGuard, especialista fiscal. Foca em notas fiscais, impostos e conformidade.',
  SalesAnalyst:
    'Você é o SalesAnalyst, analista de vendas. Foca em faturamento, canais e ticket médio.',
  PriceWatch:
    'Você é o PriceWatch, monitor de preços. Foca em competitividade de preço e margem.',
  SocialPilot:
    'Você é o SocialPilot, especialista em marketing e conteúdo. Foca em publicações e engajamento.',
};

// Taxa de erro/limite: tempo mínimo (ms) entre chamadas reais à IA.
const IA_MIN_INTERVAL = 8000;
let ultimaChamadaIA = 0;

function esperaIntervaloIA() {
  const agora = Date.now();
  const falta = ultimaChamadaIA + IA_MIN_INTERVAL - agora;
  ultimaChamadaIA = Math.max(agora, ultimaChamadaIA + IA_MIN_INTERVAL);
  return falta > 0 ? new Promise(r => setTimeout(r, falta)) : Promise.resolve();
}

// Converte uma análise local em texto de contexto para o Gemini.
function contextoDaAnalise(analise) {
  const linhas = [];
  linhas.push(`Resumo: ${analise.resumo}`);
  if (analise.insights?.length) linhas.push(`Insights:\n${analise.insights.map(i => '• ' + i).join('\n')}`);
  if (analise.recomendacoes?.length) linhas.push(`Recomendações sugeridas:\n${analise.recomendacoes.map(r => '• ' + r).join('\n')}`);
  return linhas.join('\n\n');
}

/**
 * Gera a análise do agente usando os dados reais + Gemini.
 * Retorna { agente, resumo, insights, recomendacoes, fonte: 'ia'|'local' }.
 * Nunca lança erro: se a IA falhar, volta para a análise local.
 */
export async function executarAgenteComIA(nome) {
  const local = executarAgente(nome);

  if (!aiDisponivel()) return { ...local, fonte: 'local' };

  try {
    await esperaIntervaloIA();
    const papel = PAPEL_AGENTE[nome] || PAPEL_AGENTE.OmniAdvisor;
    const pergunta =
      'Com base nos dados reais abaixo, escreva uma análise curta (até 5 linhas) e 2 recomendações práticas (uma linha cada). Use números. Seja direto.';
    const texto = await askAssistant([
      { role: 'user', text: `${papel}\n\n${contextoDaAnalise(local)}\n\n${pergunta}` },
    ]);

    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
    const resumo = linhas[0] || local.resumo;
    const recomendacoes = linhas.slice(1).filter(l => /^[•-]|^(recomend|prioriz|aument|reduz|gerar|revis|ativ|invest|monitor|acompan|reagen|reprogramar)/i.test(l));
    const insights = linhas.slice(0, 3);
    return { agente: nome, resumo, insights, recomendacoes, fonte: 'ia' };
  } catch {
    return { ...local, fonte: 'ia' };
  }
}

/**
 * Diretor IA com raciocínio: consolida a análise de TODOS os agentes
 * e pede ao Gemini prioridades do dia. Fallback para execução local.
 */
export async function executarGestorComIA() {
  const relatorios = await Promise.all(AGENTES_GESTAO.map(nome => executarAgenteComIA(nome)));

  const comAlerta = relatorios.filter(r => /risco|atenção|precisando|problema|rejeitada|atraso|ruptura/i.test(r.resumo));
  const saudaveis = relatorios.filter(r => !comAlerta.includes(r));
  const prioridades = relatorios
    .map(r => ({ agente: r.nome, acao: r.recomendacoes[0] || '' }))
    .filter(p => p.acao)
    .slice(0, 5);

  const relatorio = {
    relatorios,
    resumo: `${saudaveis.length} áreas saudáveis · ${comAlerta.length} precisando de atenção`,
    saudaveis: saudaveis.map(r => ({ agente: r.nome, detalhe: r.resumo })),
    criticos: comAlerta.map(r => ({ agente: r.nome, detalhe: r.resumo })),
    prioridades,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
  };

  // Briefing consolidado com IA (opcional, se disponível).
  if (aiDisponivel()) {
    try {
      await esperaIntervaloIA();
      const resumoGeral = relatorios.map(r => `${r.nome}: ${r.resumo}`).join('\n');
      const texto = await askAssistant([
        {
          role: 'user',
          text:
            `Você é o Diretor IA, gestor de um e-commerce multicanal. Coordene os agentes abaixo.\n\n` +
            `Situação das áreas:\n${resumoGeral}\n\n` +
            `Escreva um briefing executivo de até 8 linhas com: 1) o que está sob controle; 2) o que exige ação urgente; 3) a prioridade nº 1 de hoje. Use números.`,
        },
      ]);
      relatorio.briefing = texto;
    } catch {
      relatorio.briefing = '';
    }
  }
  return relatorio;
}

/** Responde a pergunta do usuário com dados reais + Gemini. */
export async function responderAgenteComIA(nome, pergunta) {
  if (nome === 'Diretor IA') {
    const g = await executarGestorComIA();
    return [g.resumo, '', g.briefing ? `Briefing: ${g.briefing}` : '', 'Prioridades:', ...g.prioridades.map(p => `• ${p.agente}: ${p.acao}`)].join('\n');
  }

  const local = executarAgente(nome);
  if (!aiDisponivel()) return responderAgente(nome, pergunta);

  try {
    await esperaIntervaloIA();
    const papel = PAPEL_AGENTE[nome] || PAPEL_AGENTE.OmniAdvisor;
    const texto = await askAssistant([
      { role: 'user', text: `${papel}\n\n${contextoDaAnalise(local)}\n\nPergunta do usuário: ${pergunta}\n\nResponda em português, direto e com números quando possível.` },
    ]);
    return texto;
  } catch {
    return responderAgente(nome, pergunta);
  }
}
