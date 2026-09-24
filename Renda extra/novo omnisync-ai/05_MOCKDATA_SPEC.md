# Especificação de `src/data/mockData.js`

Exporte constantes nomeadas (não um default gigante) para import seletivo em cada página.

```js
// KPIs do Dashboard
export const dashboardKpis = [
  { id: 'faturamento', label: 'Faturamento', value: 248540, format: 'currency', delta: 12.4 },
  { id: 'pedidos', label: 'Pedidos', value: 1284, format: 'number', delta: 8.7 },
  { id: 'ticketMedio', label: 'Ticket médio', value: 193, format: 'currency', delta: 5.2 },
  { id: 'lucroEstimado', label: 'Lucro estimado', value: 62840, format: 'currency', delta: 15.3 },
  { id: 'itensEstoque', label: 'Itens em estoque', value: 8420, format: 'number', delta: -3.1 },
  { id: 'capitalParado', label: 'Capital parado', value: 31200, format: 'currency', delta: -6.8 },
];

// Série temporal do AreaChart (faturamento 30 dias)
export const faturamentoSerie = [
  { data: '20/04', valor: 8200 }, { data: '25/04', valor: 15400 },
  { data: '30/04', valor: 22100 }, { data: '05/05', valor: 31800 },
  { data: '10/05', valor: 38500 }, { data: '15/05', valor: 46200 },
  { data: '20/05', valor: 54800 },
  // completar interpolando pontos diários entre essas âncoras para uma curva suave
];

// Vendas por canal (BarChart)
export const vendasPorCanal = [
  { canal: 'Loja Virtual', valor: 98540 },
  { canal: 'Marketplace', valor: 62310 },
  { canal: 'Varejo Físico', valor: 45870 },
  { canal: 'WhatsApp', valor: 22410 },
  { canal: 'Instagram', valor: 11230 },
  { canal: 'Outros', valor: 8180 },
];

// Alertas do Dashboard
export const alertas = [
  { id: 1, tipo: 'critico', titulo: 'Estoque crítico', descricao: '32 produtos com estoque abaixo do mínimo.', link: '/estoque' },
  { id: 2, tipo: 'atencao', titulo: 'Cartão 84%', descricao: 'Utilização do limite do cartão corporativo acima de 80%.', link: '/financeiro' },
  { id: 3, tipo: 'atencao', titulo: 'Integração offline', descricao: 'A integração com a transportadora LogSul está offline.', link: '/integracoes' },
];

// Produto em destaque (Inteligência do Produto)
export const produtoDestaque = {
  nome: 'Fone Bluetooth Pro X', sku: 'FBX-001', badge: 'Em alta',
  vendas: 428, receita: 42800, precoMedio: 99.9, margem: 38,
  historicoVendas: [ /* 8-10 pontos */ ],
  coberturaDias: 18, situacaoEstoque: 'Saudável',
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

// Radar de Mercado — 3 grupos de produtos
export const radarProdutos = {
  emAlta: [ /* nome, preco, demanda, margemEstimada, concorrencia, oportunidade, score */ ],
  emergentes: [ /* idem */ ],
  altaMargem: [ /* idem */ ],
};

// Gestão de Estoque
export const estoqueKpis = { atual: 8420, critico: 32, reservado: 624, coberturaMediaDias: 42, capitalParado: 31200 };
export const previsaoEstoque = [ /* 60 pontos diários com campo `faixa`: 'critico'|'baixo'|'normal'|'excesso' */ ];
export const produtosEstoque = [ /* nome, sku, atual, minimo, coberturaDias, status */ ];
export const estoqueParadoFaixas = [
  { faixa: '0-30 dias', valor: 6520, percentual: 21 },
  { faixa: '31-60 dias', valor: 7840, percentual: 25 },
  { faixa: '61-90 dias', valor: 6910, percentual: 22 },
  { faixa: '91-120 dias', valor: 5360, percentual: 17 },
  { faixa: '120+ dias', valor: 4570, percentual: 15 },
];

// Central de IA — agentes
export const agentesIA = [
  { nome: 'OmniAdvisor', status: 'ativo', ultimaExecucao: '20/05 09:15', tarefas: 24, resultado: 'Tudo dentro do esperado' },
  { nome: 'CompraGuard', status: 'ativo', ultimaExecucao: '20/05 08:47', tarefas: 18, resultado: 'Economia identificada' },
  { nome: 'MarketRadar', status: 'ativo', ultimaExecucao: '20/05 08:55', tarefas: 22, resultado: 'Oportunidades detectadas' },
  { nome: 'FiscalGuard', status: 'ativo', ultimaExecucao: '20/05 08:50', tarefas: 14, resultado: 'Tudo em conformidade' },
  { nome: 'SalesAnalyst', status: 'ativo', ultimaExecucao: '20/05 09:10', tarefas: 20, resultado: 'Performance positiva' },
  { nome: 'PriceWatch', status: 'ativo', ultimaExecucao: '20/05 08:58', tarefas: 15, resultado: 'Preços competitivos' },
  { nome: 'StockGuard', status: 'atencao', ultimaExecucao: '20/05 09:02', tarefas: 16, resultado: 'Risco de ruptura em 5 itens' },
  { nome: 'SocialPilot', status: 'atencao', ultimaExecucao: '20/05 09:05', tarefas: 12, resultado: 'Engajamento abaixo da meta' },
];

// Segurança e Usuários
export const usuarios = [ /* nome, email, perfil, status, mfaConfigurado */ ];
export const auditLog = [ /* timestamp, usuario, acao, origem */ ];
```

**Regra:** todo valor exibido em telas deve vir de uma dessas constantes — nada hardcoded direto no JSX das páginas, para o mock ficar fácil de trocar por API depois.
