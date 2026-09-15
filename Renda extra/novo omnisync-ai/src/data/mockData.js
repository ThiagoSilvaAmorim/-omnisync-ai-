// ============================================
// OmniSync AI — Mock Data
// Fonte única de dados mockados. Toda tela importa
// somente as constantes de que precisa. No dia de
// plugar um backend real (Supabase), apenas este
// arquivo muda — nenhuma página precisa ser reescrita.
// ============================================

// ---------- KPIs do Dashboard ----------
export const dashboardKpis = [
  { id: 'faturamento', label: 'Faturamento', value: 248540, format: 'currency', delta: 12.4 },
  { id: 'pedidos', label: 'Pedidos', value: 1284, format: 'number', delta: 8.7 },
  { id: 'ticketMedio', label: 'Ticket médio', value: 193, format: 'currency', delta: 5.2 },
  { id: 'lucroEstimado', label: 'Lucro estimado', value: 62840, format: 'currency', delta: 15.3 },
  { id: 'itensEstoque', label: 'Itens em estoque', value: 8420, format: 'number', delta: -3.1 },
  { id: 'capitalParado', label: 'Capital parado', value: 31200, format: 'currency', delta: -6.8 },
];

// ---------- Série temporal do AreaChart (faturamento 30 dias) ----------
export const faturamentoSerie = [
  { data: '20/04', valor: 8200 },
  { data: '21/04', valor: 9600 },
  { data: '22/04', valor: 11200 },
  { data: '23/04', valor: 13100 },
  { data: '24/04', valor: 14900 },
  { data: '25/04', valor: 15400 },
  { data: '26/04', valor: 17200 },
  { data: '27/04', valor: 18800 },
  { data: '28/04', valor: 20500 },
  { data: '29/04', valor: 21400 },
  { data: '30/04', valor: 22100 },
  { data: '01/05', valor: 24500 },
  { data: '02/05', valor: 26200 },
  { data: '03/05', valor: 28900 },
  { data: '04/05', valor: 30500 },
  { data: '05/05', valor: 31800 },
  { data: '06/05', valor: 33200 },
  { data: '07/05', valor: 34900 },
  { data: '08/05', valor: 36100 },
  { data: '09/05', valor: 37200 },
  { data: '10/05', valor: 38500 },
  { data: '11/05', valor: 39800 },
  { data: '12/05', valor: 41200 },
  { data: '13/05', valor: 42800 },
  { data: '14/05', valor: 44000 },
  { data: '15/05', valor: 46200 },
  { data: '16/05', valor: 47500 },
  { data: '17/05', valor: 49600 },
  { data: '18/05', valor: 52200 },
  { data: '19/05', valor: 53800 },
  { data: '20/05', valor: 54800 },
];

// ---------- Vendas por canal (BarChart) ----------
export const vendasPorCanal = [
  { canal: 'Loja Virtual', valor: 98540 },
  { canal: 'Marketplace', valor: 62310 },
  { canal: 'Varejo Físico', valor: 45870 },
  { canal: 'WhatsApp', valor: 22410 },
  { canal: 'Instagram', valor: 11230 },
  { canal: 'Outros', valor: 8180 },
];

// ---------- Alertas do Dashboard (Comercial) ----------
export const alertas = [
  {
    id: 1,
    tipo: 'critico',
    titulo: 'Estoque crítico',
    descricao: '32 produtos com estoque abaixo do mínimo.',
    detalhe: '32 SKUs estão abaixo do ponto de reposição e podem gerar ruptura nas próximas 72 horas.',
    acao: 'Gerar ordem de compra',
    link: '/estoque',
  },
  {
    id: 2,
    tipo: 'atencao',
    titulo: 'Cartão 84%',
    descricao: 'Utilização do limite do cartão corporativo acima de 80%.',
    detalhe: 'O limite do cartão corporativo está em 84%. Compras adicionais podem ser recusadas.',
    acao: 'Revisar limite',
    link: '/financeiro',
  },
  {
    id: 3,
    tipo: 'atencao',
    titulo: 'Integração offline',
    descricao: 'A integração com a transportadora LogSul está offline.',
    detalhe: 'A transportadora LogSul não sincroniza desde 08:00. Pedidos podem ficar sem rastreio.',
    acao: 'Reconectar integração',
    link: '/integracoes',
  },
];

// ---------- Insight IA do Dashboard (OmniAdvisor) ----------
export const dashboardInsight = {
  acontecendo: [
    'Margem média caiu de 28,6% para 24,3% nos últimos 30 dias.',
    'Tráfego da loja virtual cresceu 18%, mas a conversão estagnou em 2,1%.',
  ],
  recomendacao: [
    'Reajustar preços de 12 produtos com margem abaixo de 20%.',
    'Ativar campanha de remarketing para carrinhos abandonados.',
  ],
};

// ---------- Catálogo de Produtos (lista geral) ----------
// Baseado em pesquisa real (ABComm/Neotrust, rankings de marketplaces 2026).
// Cada produto tem fornecedor e estoque mínimo (para reposição automática).
export const produtos = [
  { id: 1, nome: 'Fone Bluetooth TWS Pro', sku: 'FON-001', categoria: 'Eletrônicos', preco: 159.9, estoque: 120, minimo: 30, status: 'ativo', fornecedor: 'TecParts Ltda', imagem: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80' },
  { id: 2, nome: 'Smartwatch Fitness', sku: 'SWT-002', categoria: 'Eletrônicos', preco: 249.9, estoque: 45, minimo: 20, status: 'ativo', fornecedor: 'TecParts Ltda', imagem: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80' },
  { id: 3, nome: 'Capinha de Celular TPU', sku: 'CAP-003', categoria: 'Acessórios', preco: 34.9, estoque: 320, minimo: 80, status: 'ativo', fornecedor: 'TecParts Ltda', imagem: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80' },
  { id: 4, nome: 'Kit Skincare Básico', sku: 'SKN-004', categoria: 'Beleza', preco: 69.9, estoque: 90, minimo: 30, status: 'ativo', fornecedor: 'Bella Cosméticos', imagem: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&q=80' },
  { id: 5, nome: 'Camiseta Estampada', sku: 'CAM-005', categoria: 'Moda', preco: 79.9, estoque: 150, minimo: 50, status: 'ativo', fornecedor: 'ModaBras Atacado', imagem: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80' },
  { id: 6, nome: 'Creatina Monohidratada 300g', sku: 'CRE-006', categoria: 'Suplementos', preco: 89.9, estoque: 200, minimo: 60, status: 'ativo', fornecedor: 'NutriVida', imagem: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&q=80' },
  { id: 7, nome: 'Air Fryer 4 Litros', sku: 'AFR-007', categoria: 'Eletrodomésticos', preco: 349.9, estoque: 40, minimo: 25, status: 'ativo', fornecedor: 'EletroMix', imagem: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300&q=80' },
  { id: 8, nome: 'Aspirador Portátil', sku: 'ASP-008', categoria: 'Casa', preco: 349.9, estoque: 25, minimo: 20, status: 'baixo', fornecedor: 'CasaBem Dist.', imagem: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80' },
  { id: 9, nome: 'Máquina de Café Expresso', sku: 'CAF-009', categoria: 'Cozinha', preco: 499.9, estoque: 18, minimo: 15, status: 'ativo', fornecedor: 'CasaBem Dist.', imagem: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300&q=80' },
  { id: 10, nome: 'Cadeira Ergonômica Home Office', sku: 'CAD-010', categoria: 'Home Office', preco: 799.9, estoque: 12, minimo: 15, status: 'baixo', fornecedor: 'EletroMix', imagem: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80' },
  { id: 11, nome: 'Câmera de Segurança Wi-Fi', sku: 'CAM-011', categoria: 'Segurança', preco: 189.9, estoque: 55, minimo: 25, status: 'ativo', fornecedor: 'TecParts Ltda', imagem: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80' },
  { id: 12, nome: 'Tapete Higiênico Pet', sku: 'PET-012', categoria: 'Pets', preco: 59.9, estoque: 8, minimo: 20, status: 'critico', fornecedor: 'PetStore Atacado', imagem: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80' },
];

// ---------- Interações (linha do tempo do CRM) ----------
export const interacoes = [
  { id: 1, cliente: 'Loja Tech Center', tipo: 'nota', texto: 'Reunião sobre reposição trimestral — demonstrou interesse em volume maior.', data: '20/05/2026' },
  { id: 2, cliente: 'Loja Tech Center', tipo: 'ligacao', texto: 'Ligação para confirmar o pedido OC-201.', data: '18/05/2026' },
  { id: 3, cliente: 'Boutique Bella Moda', tipo: 'email', texto: 'Enviou proposta da coleção verão.', data: '17/05/2026' },
  { id: 4, cliente: 'João Silva', tipo: 'nota', texto: 'Cliente pediu indicação de produto para presente.', data: '15/05/2026' },
  { id: 5, cliente: 'Distribuidora CasaBem', tipo: 'email', texto: 'Solicitou nova tabela de preços para revenda.', data: '14/05/2026' },
];

// ---------- Metas (Painel do Diretor) ----------
export const metas = [
  { id: 1, nome: 'Faturamento mensal', meta: 300000, atual: 248540, tipo: 'currency' },
  { id: 2, nome: 'Pedidos no mês', meta: 1500, atual: 1284, tipo: 'number' },
  { id: 3, nome: 'Novos clientes', meta: 50, atual: 32, tipo: 'number' },
  { id: 4, nome: 'Margem média (%)', meta: 30, atual: 24.3, tipo: 'percent' },
];

// ---------- Problemas (Central de B.O.) ----------
export const problemas = [
  { id: 'BO-001', titulo: '5 entregas atrasadas na rota Norte', categoria: 'Logística', prioridade: 'alta', status: 'aberto', descricao: 'Pedidos da rota Norte excederam o SLA em 6h.', data: '20/05/2026' },
  { id: 'BO-002', titulo: 'Integração Mercado Livre fora do ar', categoria: 'Integração', prioridade: 'alta', status: 'em andamento', descricao: 'Sincronização de anúncios falhou desde 08:00.', data: '20/05/2026' },
  { id: 'BO-003', titulo: 'NF-e 4524 rejeitada pela SEFAZ', categoria: 'Fiscal', prioridade: 'media', status: 'aberto', descricao: 'Rejeição por divergência de CFOP.', data: '18/05/2026' },
  { id: 'BO-004', titulo: 'Cliente não recebeu pedido PED-1006', categoria: 'Cliente', prioridade: 'media', status: 'resolvido', descricao: 'Reenvio realizado com novo código de rastreio.', data: '17/05/2026' },
  { id: 'BO-005', titulo: 'Estoque divergente no CD São Paulo', categoria: 'Estoque', prioridade: 'baixa', status: 'aberto', descricao: 'Contagem física aponta 12 unidades a menos.', data: '15/05/2026' },
];

// ---------- Fornecedores ----------
export const fornecedores = [
  { id: 1, nome: 'TecParts Ltda', categoria: 'Eletrônicos', contato: 'contato@tecparts.com.br', telefone: '(11) 3333-2000', prazoEntrega: 5, avaliacao: 4.8, status: 'ativo' },
  { id: 2, nome: 'ModaBras Atacado', categoria: 'Moda', contato: 'vendas@modabras.com.br', telefone: '(11) 3444-3000', prazoEntrega: 7, avaliacao: 4.5, status: 'ativo' },
  { id: 3, nome: 'CasaBem Dist.', categoria: 'Casa', contato: 'pedidos@casabem.com.br', telefone: '(31) 3555-4000', prazoEntrega: 6, avaliacao: 4.6, status: 'ativo' },
  { id: 4, nome: 'NutriVida', categoria: 'Suplementos', contato: 'atacado@nutrivida.com.br', telefone: '(41) 3666-5000', prazoEntrega: 4, avaliacao: 4.9, status: 'ativo' },
  { id: 5, nome: 'EletroMix', categoria: 'Eletrodomésticos', contato: 'b2b@eletromix.com.br', telefone: '(21) 3777-6000', prazoEntrega: 9, avaliacao: 4.2, status: 'ativo' },
  { id: 6, nome: 'PetStore Atacado', categoria: 'Pets', contato: 'atacado@petstore.com.br', telefone: '(51) 3888-7000', prazoEntrega: 3, avaliacao: 4.7, status: 'ativo' },
  { id: 7, nome: 'Bella Cosméticos', categoria: 'Beleza', contato: 'atacado@bellacosmeticos.com.br', telefone: '(11) 3999-8000', prazoEntrega: 4, avaliacao: 4.4, status: 'ativo' },
];

// ---------- Períodos disponíveis (filtro de datas) ----------
export const periodos = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: 'custom', label: 'Personalizado' },
];

// Fator de escala por período fixo (simula os dados variando com o recorte).
const fatorPorPeriodo = { '7d': 0.28, '30d': 1, '90d': 2.85 };

// Converte "YYYY-MM-DD" em "DD/MM/AAAA".
function formatarData(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

// Calcula o fator de escala com base no período (fixo ou customizado).
function getFator(periodo, customRange) {
  if (periodo === 'custom' && customRange?.inicio && customRange?.fim) {
    const inicio = new Date(customRange.inicio + 'T00:00:00');
    const fim = new Date(customRange.fim + 'T00:00:00');
    const dias = Math.round((fim - inicio) / 86400000) + 1;
    return Math.max(1, dias) / 30;
  }
  return fatorPorPeriodo[periodo] ?? 1;
}

// Gera uma série temporal entre duas datas (intervalo customizado).
function gerarSerieCustom(inicio, fim) {
  const inicioDate = new Date(inicio + 'T00:00:00');
  const fimDate = new Date(fim + 'T00:00:00');
  const dias = Math.round((fimDate - inicioDate) / 86400000) + 1;
  const total = Math.min(Math.max(dias, 1), 60);
  const passo = Math.max(1, Math.floor(dias / total));
  const serie = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(inicioDate.getTime() + i * passo * 86400000);
    const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const t = total === 1 ? 1 : i / (total - 1);
    const valor = Math.round(8200 + (54800 - 8200) * t + Math.sin(i * 1.7) * 1200);
    serie.push({ data, valor });
  }
  return serie;
}

// Rótulo amigável do período (fixo ou customizado).
export function getPeriodoLabel(periodo = '30d', customRange = null) {
  if (periodo === 'custom' && customRange?.inicio && customRange?.fim) {
    return `${formatarData(customRange.inicio)} — ${formatarData(customRange.fim)}`;
  }
  return periodos.find(p => p.id === periodo)?.label ?? 'Últimos 30 dias';
}

export function getDashboardKpis(periodo = '30d', customRange = null) {
  const f = getFator(periodo, customRange);
  return dashboardKpis.map(k => ({ ...k, value: Math.round(k.value * f) }));
}

export function getFaturamentoSerie(periodo = '30d', customRange = null) {
  if (periodo === 'custom' && customRange?.inicio && customRange?.fim) {
    return gerarSerieCustom(customRange.inicio, customRange.fim);
  }
  if (periodo === '7d') return faturamentoSerie.slice(-7);
  if (periodo === '90d') {
    return faturamentoSerie.map(p => ({ ...p, valor: Math.round(p.valor * 2.85) }));
  }
  return faturamentoSerie;
}

export function getVendasPorCanal(periodo = '30d', customRange = null) {
  const f = getFator(periodo, customRange);
  return vendasPorCanal.map(c => ({ ...c, valor: Math.round(c.valor * f) }));
}

// ---------- Dashboard Operacional (Estoque & Logística) ----------
export const operacionalKpis = [
  { id: 'separacao', label: 'Pedidos em separação', value: 184, format: 'number', delta: 4.2 },
  { id: 'entregasPrazo', label: 'Entregas no prazo (%)', value: 94, format: 'number', delta: 1.8 },
  { id: 'tempoEntrega', label: 'Tempo médio de entrega (h)', value: 52, format: 'number', delta: -6.5 },
  { id: 'itensCriticos', label: 'Itens críticos', value: 32, format: 'number', delta: -3.1 },
  { id: 'rotasAtivas', label: 'Rotas ativas', value: 18, format: 'number', delta: 2.3 },
  { id: 'ocupacaoCD', label: 'Ocupação dos CDs (%)', value: 87, format: 'number', delta: 5.4 },
];

export const operacionalSerie = [
  { data: '13/05', valor: 182 },
  { data: '14/05', valor: 198 },
  { data: '15/05', valor: 176 },
  { data: '16/05', valor: 214 },
  { data: '17/05', valor: 231 },
  { data: '18/05', valor: 205 },
  { data: '19/05', valor: 188 },
  { data: '20/05', valor: 227 },
];

export const pedidosPorArmazem = [
  { armazem: 'São Paulo', valor: 420 },
  { armazem: 'Rio de Janeiro', valor: 240 },
  { armazem: 'Curitiba', valor: 180 },
  { armazem: 'Belo Horizonte', valor: 150 },
  { armazem: 'Porto Alegre', valor: 120 },
];

export const operacionalAlertas = [
  {
    id: 1,
    tipo: 'critico',
    titulo: '5 entregas em atraso',
    descricao: 'Rotas do Norte com atraso médio de 6h.',
    detalhe: '5 pedidos da rota Norte excederam o SLA de entrega. Clientes aguardam há mais de 48 horas.',
    acao: 'Reprogramar rotas',
    link: '/logistica',
  },
  {
    id: 2,
    tipo: 'critico',
    titulo: 'Armazém SP lotado',
    descricao: 'Capacidade em 94% no centro de distribuição.',
    detalhe: 'O CD de São Paulo está com 94% da capacidade ocupada, travando o recebimento de novos lotes.',
    acao: 'Redistribuir estoque',
    link: '/estoque',
  },
  {
    id: 3,
    tipo: 'atencao',
    titulo: 'Coleta atrasada',
    descricao: 'Transportadora retirou apenas 60% do volume previsto.',
    detalhe: 'A coleta de hoje ficou 40% abaixo do programado, gerando fila para amanhã.',
    acao: 'Agendar nova coleta',
    link: '/logistica',
  },
];

export const operacionalInsight = {
  acontecendo: [
    'A ocupação dos centros de distribuição subiu para 87% nos últimos 7 dias.',
    'O tempo médio de entrega na região Norte está 3h acima do SLA.',
  ],
  recomendacao: [
    'Redistribuir 12% do estoque do CD de São Paulo para Curitiba.',
    'Reagendar coletas da transportadora atrasada para o turno da manhã.',
  ],
};

// ---------- Dashboard Executivo (Financeiro & CRM) ----------
export const executivoKpis = [
  { id: 'mrr', label: 'Receita recorrente (MRR)', value: 128400, format: 'currency', delta: 9.4 },
  { id: 'margemLiquida', label: 'Margem líquida (%)', value: 11, format: 'number', delta: -2.1 },
  { id: 'nps', label: 'NPS', value: 54, format: 'number', delta: -8 },
  { id: 'leads', label: 'Leads novos', value: 342, format: 'number', delta: 14.6 },
  { id: 'ticketMedio', label: 'Ticket médio', value: 193, format: 'currency', delta: 5.2 },
  { id: 'clientesAtivos', label: 'Clientes ativos', value: 1240, format: 'number', delta: 3.5 },
];

export const executivoSerie = [
  { data: 'Dez', valor: 88000 },
  { data: 'Jan', valor: 96000 },
  { data: 'Fev', valor: 102000 },
  { data: 'Mar', valor: 110000 },
  { data: 'Abr', valor: 118000 },
  { data: 'Mai', valor: 128400 },
];

export const funilCrm = [
  { canal: 'Leads', valor: 1200 },
  { canal: 'Qualificados', valor: 720 },
  { canal: 'Proposta', valor: 340 },
  { canal: 'Fechados', valor: 142 },
];

export const executivoAlertas = [
  {
    id: 1,
    tipo: 'critico',
    titulo: 'Margem abaixo da meta',
    descricao: 'Margem líquida em 8,2% (meta 12%).',
    detalhe: 'A margem líquida caiu para 8,2% nos últimos 90 dias, abaixo da meta de 12%.',
    acao: 'Revisar precificação',
    link: '/financeiro',
  },
  {
    id: 2,
    tipo: 'atencao',
    titulo: 'Churn em alta',
    descricao: 'Taxa de churn subiu para 3,8% no trimestre.',
    detalhe: 'A taxa de cancelamento subiu 0,9 p.p. no trimestre, concentrada no plano básico.',
    acao: 'Analisar retenção',
    link: '/clientes',
  },
  {
    id: 3,
    tipo: 'atencao',
    titulo: 'NPS em queda',
    descricao: 'NPS caiu de 62 para 54 no mês.',
    detalhe: 'O NPS recuou 8 pontos, puxado por atrasos de entrega e suporte lento.',
    acao: 'Ver feedbacks',
    link: '/clientes',
  },
];

export const executivoInsight = {
  acontecendo: [
    'MRR cresceu 9,4% no mês, mas a margem líquida recuou 2,1 p.p.',
    'NPS caiu 8 pontos, concentrado em clientes que passaram por atrasos.',
  ],
  recomendacao: [
    'Revisar precificação dos planos com margem abaixo de 10%.',
    'Criar ação de retenção para os 40 clientes de maior risco de churn.',
  ],
};

// ---------- Produto em destaque (Inteligência do Produto) ----------
export const produtoDestaque = {
  nome: 'Fone Bluetooth TWS Pro',
  sku: 'FON-001',
  badge: 'Em alta',
  imagem: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80',
  vendas: 428,
  receita: 42800,
  precoMedio: 99.9,
  margem: 38,
  historicoVendas: [
    { mes: 'Dez', vendas: 260 },
    { mes: 'Jan', vendas: 290 },
    { mes: 'Fev', vendas: 310 },
    { mes: 'Mar', vendas: 345 },
    { mes: 'Abr', vendas: 372 },
    { mes: 'Mai', vendas: 428 },
  ],
  coberturaDias: 18,
  situacaoEstoque: 'Saudável',
  comparacaoPrecos: [
    { concorrente: 'OmniSync (você)', preco: 99.9, destaque: true },
    { concorrente: 'Concorrente A', preco: 109.9 },
    { concorrente: 'Concorrente B', preco: 99.0 },
  ],
  recomendacoesIA: [
    'Repor estoque para 25 dias de cobertura para evitar ruptura.',
    'Reduzir preço em até R$ 4,90 para ganhar competitividade.',
    'Destacar avaliações positivas nas páginas do produto.',
  ],
};

// ---------- Radar de Mercado — 3 grupos de produtos ----------
// Baseado em pesquisa real (ABComm/Neotrust, Google Trends 2026).
export const radarProdutos = {
  emAlta: [
    { id: 1, nome: 'Fone Bluetooth TWS', preco: 159.9, demanda: 'Alta', margemEstimada: 38, concorrencia: 'Alta', oportunidade: 'Excelente', score: 85, imagem: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80' },
    { id: 2, nome: 'Smartwatch Fitness', preco: 249.9, demanda: 'Alta', margemEstimada: 34, concorrencia: 'Alta', oportunidade: 'Muito boa', score: 78, imagem: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80' },
    { id: 3, nome: 'Air Fryer 4L', preco: 349.9, demanda: 'Alta', margemEstimada: 28, concorrencia: 'Média', oportunidade: 'Muito boa', score: 76, imagem: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=300&q=80' },
    { id: 4, nome: 'Capinha de Celular', preco: 34.9, demanda: 'Alta', margemEstimada: 60, concorrencia: 'Alta', oportunidade: 'Excelente', score: 82, imagem: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&q=80' },
  ],
  emergentes: [
    { id: 5, nome: 'Tapete Higiênico Pet', preco: 59.9, demanda: 'Média', margemEstimada: 48, concorrencia: 'Baixa', oportunidade: 'Excelente', score: 83, imagem: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300&q=80' },
    { id: 6, nome: 'Kit Skincare Vegano', preco: 69.9, demanda: 'Média', margemEstimada: 45, concorrencia: 'Média', oportunidade: 'Muito boa', score: 77, imagem: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&q=80' },
    { id: 7, nome: 'Câmera de Segurança Wi-Fi', preco: 189.9, demanda: 'Média', margemEstimada: 40, concorrencia: 'Média', oportunidade: 'Muito boa', score: 75, imagem: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&q=80' },
    { id: 8, nome: 'Garrafa Térmica Eco', preco: 49.9, demanda: 'Alta', margemEstimada: 52, concorrencia: 'Baixa', oportunidade: 'Excelente', score: 80, imagem: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&q=80' },
  ],
  altaMargem: [
    { id: 9, nome: 'Creatina Monohidratada', preco: 89.9, demanda: 'Alta', margemEstimada: 55, concorrencia: 'Média', oportunidade: 'Excelente', score: 88, imagem: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&q=80' },
    { id: 10, nome: 'Camiseta Autoral', preco: 79.9, demanda: 'Média', margemEstimada: 60, concorrencia: 'Baixa', oportunidade: 'Excelente', score: 79, imagem: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80' },
    { id: 11, nome: 'Cadeira Ergonômica', preco: 799.9, demanda: 'Alta', margemEstimada: 32, concorrencia: 'Média', oportunidade: 'Muito boa', score: 72, imagem: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=300&q=80' },
    { id: 12, nome: 'Máquina de Café', preco: 499.9, demanda: 'Média', margemEstimada: 30, concorrencia: 'Média', oportunidade: 'Muito boa', score: 71, imagem: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300&q=80' },
  ],
};

// ---------- Gestão de Estoque ----------
export const estoqueKpis = {
  atual: 8420,
  critico: 32,
  reservado: 624,
  coberturaMediaDias: 42,
  capitalParado: 31200,
};

export const previsaoEstoque = [
  { dia: 'D1', total: 8420, faixa: 'normal' },
  { dia: 'D5', total: 8350, faixa: 'normal' },
  { dia: 'D10', total: 8120, faixa: 'normal' },
  { dia: 'D15', total: 7890, faixa: 'baixo' },
  { dia: 'D20', total: 7540, faixa: 'baixo' },
  { dia: 'D25', total: 7180, faixa: 'baixo' },
  { dia: 'D30', total: 6920, faixa: 'baixo' },
  { dia: 'D35', total: 6610, faixa: 'critico' },
  { dia: 'D40', total: 6450, faixa: 'critico' },
  { dia: 'D45', total: 6280, faixa: 'critico' },
  { dia: 'D50', total: 6190, faixa: 'critico' },
  { dia: 'D55', total: 6150, faixa: 'critico' },
  { dia: 'D60', total: 6100, faixa: 'critico' },
];

export const produtosEstoque = [
  { id: 1, nome: 'Fone Bluetooth Pro X', sku: 'FBX-001', atual: 120, minimo: 30, coberturaDias: 18, status: 'normal' },
  { id: 2, nome: 'Smartwatch Fit X', sku: 'SWX-002', atual: 45, minimo: 20, coberturaDias: 12, status: 'baixo' },
  { id: 3, nome: 'Carregador Portátil 20k', sku: 'CP20-003', atual: 210, minimo: 50, coberturaDias: 40, status: 'excesso' },
  { id: 4, nome: 'Ring Light 26cm', sku: 'RL26-004', atual: 8, minimo: 15, coberturaDias: 3, status: 'critico' },
  { id: 5, nome: 'Fritadeira Air Fryer 4L', sku: 'AF4L-005', atual: 60, minimo: 25, coberturaDias: 22, status: 'normal' },
  { id: 6, nome: 'Garrafa Térmica 1L', sku: 'GT1L-006', atual: 180, minimo: 40, coberturaDias: 35, status: 'excesso' },
  { id: 7, nome: 'Fita LED RGB 5m', sku: 'LED5-007', atual: 15, minimo: 20, coberturaDias: 6, status: 'critico' },
  { id: 8, nome: 'Suporte Veicular Celular', sku: 'SVC-008', atual: 90, minimo: 30, coberturaDias: 28, status: 'normal' },
  { id: 9, nome: 'Massageador Muscular', sku: 'MSM-009', atual: 35, minimo: 18, coberturaDias: 15, status: 'baixo' },
  { id: 10, nome: 'Câmera Wi-Fi Interna', sku: 'CWI-010', atual: 70, minimo: 25, coberturaDias: 26, status: 'normal' },
  { id: 11, nome: 'Purificador de Ar', sku: 'PDA-011', atual: 12, minimo: 10, coberturaDias: 9, status: 'critico' },
  { id: 12, nome: 'Robô Aspirador', sku: 'RBA-012', atual: 25, minimo: 12, coberturaDias: 19, status: 'normal' },
  { id: 13, nome: 'Tênis Esportivo', sku: 'TNE-013', atual: 140, minimo: 35, coberturaDias: 33, status: 'excesso' },
  { id: 14, nome: 'Camiseta Básica', sku: 'CMB-014', atual: 320, minimo: 80, coberturaDias: 45, status: 'excesso' },
  { id: 15, nome: 'Calça Jeans', sku: 'CJN-015', atual: 95, minimo: 40, coberturaDias: 24, status: 'normal' },
  { id: 16, nome: 'Mochila Escolar', sku: 'MCE-016', atual: 22, minimo: 15, coberturaDias: 11, status: 'baixo' },
  { id: 17, nome: 'Relógio Digital', sku: 'RDG-017', atual: 5, minimo: 12, coberturaDias: 2, status: 'critico' },
  { id: 18, nome: 'Jaqueta Jeans', sku: 'JJN-018', atual: 55, minimo: 20, coberturaDias: 21, status: 'normal' },
  { id: 19, nome: 'Boné Esportivo', sku: 'BNE-019', atual: 110, minimo: 30, coberturaDias: 30, status: 'normal' },
  { id: 20, nome: 'Meia Pack 5', sku: 'MP5-020', atual: 200, minimo: 60, coberturaDias: 38, status: 'excesso' },
  { id: 21, nome: 'Cadeira Gamer', sku: 'CDG-021', atual: 10, minimo: 15, coberturaDias: 4, status: 'critico' },
  { id: 22, nome: 'Monitor 24"', sku: 'MNT-022', atual: 30, minimo: 12, coberturaDias: 20, status: 'normal' },
  { id: 23, nome: 'Teclado Mecânico', sku: 'TCM-023', atual: 48, minimo: 20, coberturaDias: 23, status: 'normal' },
  { id: 24, nome: 'Mouse Gamer', sku: 'MGM-024', atual: 75, minimo: 25, coberturaDias: 27, status: 'normal' },
  { id: 25, nome: 'Headset USB', sku: 'HSU-025', atual: 18, minimo: 10, coberturaDias: 14, status: 'baixo' },
];

export const estoqueParadoFaixas = [
  { faixa: '0-30 dias', valor: 6520, percentual: 21 },
  { faixa: '31-60 dias', valor: 7840, percentual: 25 },
  { faixa: '61-90 dias', valor: 6910, percentual: 22 },
  { faixa: '91-120 dias', valor: 5360, percentual: 17 },
  { faixa: '120+ dias', valor: 4570, percentual: 15 },
];

// ---------- Central de IA — agentes ----------
export const agentesIA = [
  { id: 1, nome: 'OmniAdvisor', status: 'ativo', ultimaExecucao: '20/05 09:15', tarefas: 24, resultado: 'Tudo dentro do esperado' },
  { id: 2, nome: 'CompraGuard', status: 'ativo', ultimaExecucao: '20/05 08:47', tarefas: 18, resultado: 'Economia identificada' },
  { id: 3, nome: 'MarketRadar', status: 'ativo', ultimaExecucao: '20/05 08:55', tarefas: 22, resultado: 'Oportunidades detectadas' },
  { id: 4, nome: 'FiscalGuard', status: 'ativo', ultimaExecucao: '20/05 08:50', tarefas: 14, resultado: 'Tudo em conformidade' },
  { id: 5, nome: 'SalesAnalyst', status: 'ativo', ultimaExecucao: '20/05 09:10', tarefas: 20, resultado: 'Performance positiva' },
  { id: 6, nome: 'PriceWatch', status: 'ativo', ultimaExecucao: '20/05 08:58', tarefas: 15, resultado: 'Preços competitivos' },
  { id: 7, nome: 'StockGuard', status: 'atencao', ultimaExecucao: '20/05 09:02', tarefas: 16, resultado: 'Risco de ruptura em 5 itens' },
  { id: 8, nome: 'SocialPilot', status: 'atencao', ultimaExecucao: '20/05 09:05', tarefas: 12, resultado: 'Engajamento abaixo da meta' },
];

// ---------- Segurança e Usuários ----------
export const usuarios = [
  { id: 1, nome: 'Carlos Menezes', email: 'carlos@omnisync.ai', perfil: 'Admin', status: 'ativo', mfaConfigurado: true },
  { id: 2, nome: 'Mariana Duarte', email: 'mariana@omnisync.ai', perfil: 'Operador', status: 'ativo', mfaConfigurado: true },
  { id: 3, nome: 'Felipe Andrade', email: 'felipe@omnisync.ai', perfil: 'Visualizador', status: 'ativo', mfaConfigurado: false },
  { id: 4, nome: 'Renata Lopes', email: 'renata@omnisync.ai', perfil: 'Operador', status: 'inativo', mfaConfigurado: false },
  { id: 5, nome: 'Bruno Carvalho', email: 'bruno@omnisync.ai', perfil: 'Admin', status: 'ativo', mfaConfigurado: true },
];

export const auditLog = [
  { id: 1, timestamp: '20/05 09:42:11', usuario: 'Carlos Menezes', acao: 'Alterou preço do produto "Fone Bluetooth Pro X"', origem: '192.168.0.14' },
  { id: 2, timestamp: '20/05 09:15:03', usuario: 'Mariana Duarte', acao: 'Exportou relatório de estoque', origem: '192.168.0.22' },
  { id: 3, timestamp: '20/05 08:58:47', usuario: 'Felipe Andrade', acao: 'Visualizou Radar de Mercado', origem: '10.0.0.8' },
  { id: 4, timestamp: '19/05 22:31:19', usuario: 'Carlos Menezes', acao: 'Concedeu perfil "Operador" a Renata Lopes', origem: '192.168.0.14' },
  { id: 5, timestamp: '19/05 18:12:55', usuario: 'Bruno Carvalho', acao: 'Ativou MFA na própria conta', origem: '192.168.0.31' },
];

// ---------- Pedidos ----------
export const pedidos = [
  { id: 'PED-1001', cliente: 'João Silva', data: '20/05/2026', total: 349.9, itens: 2, status: 'entregue' },
  { id: 'PED-1002', cliente: 'Maria Santos', data: '20/05/2026', total: 159.9, itens: 1, status: 'enviado' },
  { id: 'PED-1003', cliente: 'Pedro Oliveira', data: '19/05/2026', total: 949.7, itens: 3, status: 'processando' },
  { id: 'PED-1004', cliente: 'Ana Costa', data: '19/05/2026', total: 69.9, itens: 1, status: 'pendente' },
  { id: 'PED-1005', cliente: 'Carlos Lima', data: '18/05/2026', total: 499.9, itens: 2, status: 'entregue' },
  { id: 'PED-1006', cliente: 'Fernanda Alves', data: '18/05/2026', total: 89.9, itens: 1, status: 'cancelado' },
  { id: 'PED-1007', cliente: 'Roberto Souza', data: '17/05/2026', total: 799.9, itens: 1, status: 'entregue' },
  { id: 'PED-1008', cliente: 'Juliana Rocha', data: '17/05/2026', total: 129.8, itens: 2, status: 'enviado' },
];

// ---------- Clientes (carteira de clientes e lojas) ----------
export const clientes = [
  { id: 1, nome: 'Loja Tech Center', tipo: 'loja', email: 'contato@techcenter.com.br', telefone: '(11) 3333-1000', cidade: 'São Paulo', segmento: 'Varejo', totalPedidos: 32, totalGasto: 48600, status: 'vip', ultimoContato: '20/05/2026' },
  { id: 2, nome: 'João Silva', tipo: 'pessoa', email: 'joao@email.com', telefone: '(11) 99999-1234', cidade: 'São Paulo', segmento: 'Consumidor', totalPedidos: 12, totalGasto: 4320, status: 'ativo', ultimoContato: '19/05/2026' },
  { id: 3, nome: 'Maria Santos', tipo: 'pessoa', email: 'maria@email.com', telefone: '(11) 98888-5678', cidade: 'Rio de Janeiro', segmento: 'Consumidor', totalPedidos: 8, totalGasto: 2980, status: 'ativo', ultimoContato: '18/05/2026' },
  { id: 4, nome: 'Boutique Bella Moda', tipo: 'loja', email: 'compras@bellamoda.com.br', telefone: '(21) 3222-4400', cidade: 'Rio de Janeiro', segmento: 'Moda', totalPedidos: 18, totalGasto: 27800, status: 'vip', ultimoContato: '17/05/2026' },
  { id: 5, nome: 'Pedro Oliveira', tipo: 'pessoa', email: 'pedro@email.com', telefone: '(21) 97777-4321', cidade: 'Belo Horizonte', segmento: 'Consumidor', totalPedidos: 15, totalGasto: 6890, status: 'vip', ultimoContato: '16/05/2026' },
  { id: 6, nome: 'Distribuidora CasaBem', tipo: 'loja', email: 'pedidos@casabem.com.br', telefone: '(31) 3444-5500', cidade: 'Belo Horizonte', segmento: 'Casa', totalPedidos: 26, totalGasto: 41200, status: 'ativo', ultimoContato: '15/05/2026' },
  { id: 7, nome: 'Ana Costa', tipo: 'pessoa', email: 'ana@email.com', telefone: '(31) 96666-8765', cidade: 'Porto Alegre', segmento: 'Consumidor', totalPedidos: 3, totalGasto: 720, status: 'inativo', ultimoContato: '10/05/2026' },
  { id: 8, nome: 'Carlos Lima', tipo: 'pessoa', email: 'carlos@email.com', telefone: '(41) 95555-1111', cidade: 'Curitiba', segmento: 'Revendedor', totalPedidos: 22, totalGasto: 15400, status: 'vip', ultimoContato: '12/05/2026' },
  { id: 9, nome: 'Pet Store Amigo', tipo: 'loja', email: 'contato@petstoreamigo.com.br', telefone: '(41) 3888-7700', cidade: 'Curitiba', segmento: 'Pets', totalPedidos: 14, totalGasto: 9800, status: 'ativo', ultimoContato: '11/05/2026' },
  { id: 10, nome: 'Fernanda Alves', tipo: 'pessoa', email: 'fernanda@email.com', telefone: '(51) 94444-2222', cidade: 'Salvador', segmento: 'Consumidor', totalPedidos: 1, totalGasto: 89.9, status: 'novo', ultimoContato: '08/05/2026' },
];

// ---------- Negócios (pipeline de vendas) ----------
export const negocios = [
  { id: 1, titulo: 'Reposição trimestral', cliente: 'Loja Tech Center', valor: 12500, estagio: 'proposta', data: '18/05/2026' },
  { id: 2, titulo: 'Coleção verão', cliente: 'Boutique Bella Moda', valor: 8600, estagio: 'qualificado', data: '17/05/2026' },
  { id: 3, titulo: 'Parceria anual', cliente: 'Distribuidora CasaBem', valor: 32000, estagio: 'lead', data: '15/05/2026' },
  { id: 4, titulo: 'Compra recorrente', cliente: 'João Silva', valor: 1200, estagio: 'fechado', data: '14/05/2026' },
  { id: 5, titulo: 'Renovação de contrato', cliente: 'Loja Tech Center', valor: 15000, estagio: 'fechado', data: '10/05/2026' },
  { id: 6, titulo: 'Oportunidade pets', cliente: 'Pet Store Amigo', valor: 4200, estagio: 'qualificado', data: '09/05/2026' },
  { id: 7, titulo: 'Pedido piloto', cliente: 'Carlos Lima', valor: 800, estagio: 'perdido', data: '08/05/2026' },
  { id: 8, titulo: 'Revenda mensal', cliente: 'Distribuidora CasaBem', valor: 9800, estagio: 'proposta', data: '07/05/2026' },
];

// ---------- Estágios do pipeline ----------
export const estagiosPipeline = ['lead', 'qualificado', 'proposta', 'fechado', 'perdido'];

// ---------- Financeiro ----------
export const transacoes = [
  { id: 1, tipo: 'receita', descricao: 'Venda PED-1001', categoria: 'Vendas', data: '20/05/2026', valor: 349.9 },
  { id: 2, tipo: 'despesa', descricao: 'Fornecedor TecParts', categoria: 'Compras', data: '20/05/2026', valor: -1240.0 },
  { id: 3, tipo: 'receita', descricao: 'Venda PED-1002', categoria: 'Vendas', data: '19/05/2026', valor: 159.9 },
  { id: 4, tipo: 'despesa', descricao: 'Frete LogSul', categoria: 'Logística', data: '19/05/2026', valor: -420.0 },
  { id: 5, tipo: 'receita', descricao: 'Repasse Marketplace', categoria: 'Marketplace', data: '18/05/2026', valor: 2890.0 },
  { id: 6, tipo: 'despesa', descricao: 'Impostos (Simples)', categoria: 'Fiscal', data: '18/05/2026', valor: -1560.0 },
  { id: 7, tipo: 'receita', descricao: 'Venda PED-1005', categoria: 'Vendas', data: '17/05/2026', valor: 499.9 },
  { id: 8, tipo: 'despesa', descricao: 'Marketing Google Ads', categoria: 'Marketing', data: '16/05/2026', valor: -600.0 },
];

// ---------- Compras ----------
export const compras = [
  { id: 'OC-201', fornecedor: 'TecParts Ltda', data: '20/05/2026', total: 1240.0, status: 'recebido' },
  { id: 'OC-202', fornecedor: 'CasaBem Dist.', data: '19/05/2026', total: 860.5, status: 'em trânsito' },
  { id: 'OC-203', fornecedor: 'ModaBras Atacado', data: '18/05/2026', total: 2310.0, status: 'pendente' },
  { id: 'OC-204', fornecedor: 'NutriVida', data: '17/05/2026', total: 1540.0, status: 'recebido' },
  { id: 'OC-205', fornecedor: 'EletroMix', data: '15/05/2026', total: 4280.0, status: 'enviado' },
  { id: 'OC-206', fornecedor: 'PetStore Atacado', data: '14/05/2026', total: 320.0, status: 'recebido' },
];

// ---------- Fiscal ----------
export const notasFiscais = [
  { id: 1, numero: 'NF-e 4521', tipo: 'Saída', destinatario: 'João Silva', origem: 'Loja Virtual', data: '20/05/2026', valor: 349.9, status: 'autorizada' },
  { id: 2, numero: 'NF-e 4522', tipo: 'Saída', destinatario: 'Maria Santos', origem: 'Mercado Livre', data: '20/05/2026', valor: 159.9, status: 'autorizada' },
  { id: 3, numero: 'NF-e 4523', tipo: 'Saída', destinatario: 'Pedro Oliveira', origem: 'Shopee', data: '19/05/2026', valor: 949.7, status: 'pendente' },
  { id: 4, numero: 'NFe 887', tipo: 'Entrada', destinatario: 'TecParts Ltda', origem: 'Fornecedor', data: '19/05/2026', valor: 1240.0, status: 'autorizada' },
  { id: 5, numero: 'NF-e 4524', tipo: 'Saída', destinatario: 'Carlos Lima', origem: 'Instagram', data: '18/05/2026', valor: 499.9, status: 'rejeitada' },
  { id: 6, numero: 'NFe 888', tipo: 'Entrada', destinatario: 'CasaBem Dist.', origem: 'Fornecedor', data: '18/05/2026', valor: 860.5, status: 'autorizada' },
];

// ---------- Logística ----------
export const entregas = [
  { id: 'ENV-301', transportadora: 'LogSul', destino: 'São Paulo', data: '20/05/2026', status: 'entregue', rastreio: 'LS123456' },
  { id: 'ENV-302', transportadora: 'LogSul', destino: 'Rio de Janeiro', data: '20/05/2026', status: 'em trânsito', rastreio: 'LS123457' },
  { id: 'ENV-303', transportadora: 'Correios', destino: 'Belo Horizonte', data: '19/05/2026', status: 'em trânsito', rastreio: 'BR998877' },
  { id: 'ENV-304', transportadora: 'Jadlog', destino: 'Porto Alegre', data: '19/05/2026', status: 'atrasado', rastreio: 'JL556677' },
  { id: 'ENV-305', transportadora: 'LogSul', destino: 'Curitiba', data: '18/05/2026', status: 'entregue', rastreio: 'LS123458' },
  { id: 'ENV-306', transportadora: 'Correios', destino: 'Salvador', data: '18/05/2026', status: 'pendente', rastreio: 'BR998878' },
];

// ---------- Integrações ----------
// authUrl: página oficial de autorização (OAuth) de cada serviço.
// Para Mercado Livre, usa endpoint real /api/auth/ml/start via api.mlStartOAuth()
export const integracoes = [
  { id: 'tiny', nome: 'Tiny ERP', categoria: 'ERP', descricao: 'Sincroniza produtos, estoque e pedidos.', status: 'conectado', authUrl: 'https://app.tiny.com.br/login' },
  { id: 'ml', nome: 'Mercado Livre', categoria: 'Marketplace', descricao: 'Publica e sincroniza anúncios e vendas.', status: 'conectado', authUrl: '/api/auth/ml/start' },
  { id: 'shopee', nome: 'Shopee', categoria: 'Marketplace', descricao: 'Venda e gestão de pedidos na plataforma.', status: 'conectado', authUrl: 'https://seller.shopee.com.br/login' },
  { id: 'amazon', nome: 'Amazon', categoria: 'Marketplace', descricao: 'Marketplace com logística FBA.', status: 'desconectado', authUrl: 'https://sellercentral.amazon.com.br/home' },
  { id: 'stripe', nome: 'Stripe', categoria: 'Pagamentos', descricao: 'Cobranças e gateway de pagamento.', status: 'desconectado', authUrl: 'https://connect.stripe.com/oauth/authorize?response_type=code&client_id=SEU_CLIENT_ID&scope=read_write' },
  { id: 'sendgrid', nome: 'SendGrid', categoria: 'E-mail', descricao: 'Envio de e-mails transacionais.', status: 'desconectado', authUrl: 'https://app.sendgrid.com/login' },
  { id: 'meta', nome: 'Instagram / Meta', categoria: 'Social', descricao: 'Publicações e mensagens do Instagram.', status: 'conectado', authUrl: 'https://www.facebook.com/v12.0/dialog/oauth?client_id=SEU_CLIENT_ID&redirect_uri=https://omnisync.local/callback&scope=instagram_basic,pages_manage_posts' },
  { id: 'tiktok', nome: 'TikTok', categoria: 'Social', descricao: 'Vídeos e campanhas no TikTok.', status: 'desconectado', authUrl: 'https://www.tiktok.com/v2/auth/authorize/' },
];

// ---------- Calendário de conteúdo ----------
export const eventosCalendario = [
  { id: 1, titulo: 'Lançamento Fone TWS', canal: 'Instagram', data: '22/05/2026', tipo: 'post' },
  { id: 2, titulo: 'Campanha Creatina', canal: 'TikTok', data: '24/05/2026', tipo: 'video' },
  { id: 3, titulo: 'Post Air Fryer', canal: 'Facebook', data: '25/05/2026', tipo: 'post' },
  { id: 4, titulo: 'Stories Skincare', canal: 'Instagram', data: '26/05/2026', tipo: 'stories' },
  { id: 5, titulo: 'Promo Pets', canal: 'WhatsApp', data: '28/05/2026', tipo: 'mensagem' },
  { id: 6, titulo: 'Live Cadeira Ergonômica', canal: 'Instagram', data: '30/05/2026', tipo: 'live' },
];

// ---------- Laboratório de Oportunidades ----------
export const oportunidades = [
  { id: 1, nome: 'Kit Skincare Vegano', categoria: 'Beleza', score: 88, potencial: 18400, motivo: 'Crescimento de 22% e busca por veganos em alta.' },
  { id: 2, nome: 'Tapete Higiênico Pet', categoria: 'Pets', score: 83, potencial: 12900, motivo: 'Categoria pets cresce 38% ao ano.' },
  { id: 3, nome: 'Creatina Monohidratada', categoria: 'Suplementos', score: 85, potencial: 21700, motivo: 'Produto porta de entrada com margem de 40-65%.' },
  { id: 4, nome: 'Câmera de Segurança Wi-Fi', categoria: 'Segurança', score: 75, potencial: 9800, motivo: 'Demanda crescente por segurança residencial.' },
  { id: 5, nome: 'Garrafa Térmica Eco', categoria: 'Casa', score: 80, potencial: 7500, motivo: 'Sustentabilidade: buscas +47% em 12 meses.' },
  { id: 6, nome: 'Cadeira Ergonômica', categoria: 'Home Office', score: 72, potencial: 15300, motivo: 'Home office consolidado com demanda estável.' },
];
