// ============================================
// data.js — dados de referência/analytics.
// Servidos pela API (endpoints estáticos). Em uma
// implementação real, seriam calculados a partir
// do banco e de fontes externas (marketplaces etc.).
// ============================================

export const produtoDestaque = {
  nome: 'Fone Bluetooth TWS Pro',
  sku: 'FON-001',
  badge: 'Em alta',
  vendas: 428,
  receita: 68427,
  precoMedio: 159.9,
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
    { concorrente: 'OmniSync (você)', preco: 159.9, destaque: true },
    { concorrente: 'Concorrente A', preco: 179.9 },
    { concorrente: 'Concorrente B', preco: 149.0 },
  ],
  recomendacoesIA: [
    'Repor estoque para 25 dias de cobertura para evitar ruptura.',
    'Ajustar preço em até R$ 9,90 para ganhar competitividade.',
    'Destacar avaliações positivas nas páginas do produto.',
  ],
};

export const radarProdutos = {
  emAlta: [
    { id: 1, nome: 'Fone Bluetooth TWS', preco: 159.9, demanda: 'Alta', margemEstimada: 38, concorrencia: 'Alta', oportunidade: 'Excelente', score: 85 },
    { id: 2, nome: 'Smartwatch Fitness', preco: 249.9, demanda: 'Alta', margemEstimada: 34, concorrencia: 'Alta', oportunidade: 'Muito boa', score: 78 },
    { id: 3, nome: 'Air Fryer 4L', preco: 349.9, demanda: 'Alta', margemEstimada: 28, concorrencia: 'Média', oportunidade: 'Muito boa', score: 76 },
    { id: 4, nome: 'Capinha de Celular', preco: 34.9, demanda: 'Alta', margemEstimada: 60, concorrencia: 'Alta', oportunidade: 'Excelente', score: 82 },
  ],
  emergentes: [
    { id: 5, nome: 'Tapete Higiênico Pet', preco: 59.9, demanda: 'Média', margemEstimada: 48, concorrencia: 'Baixa', oportunidade: 'Excelente', score: 83 },
    { id: 6, nome: 'Kit Skincare Vegano', preco: 69.9, demanda: 'Média', margemEstimada: 45, concorrencia: 'Média', oportunidade: 'Muito boa', score: 77 },
    { id: 7, nome: 'Câmera de Segurança Wi-Fi', preco: 189.9, demanda: 'Média', margemEstimada: 40, concorrencia: 'Média', oportunidade: 'Muito boa', score: 75 },
    { id: 8, nome: 'Garrafa Térmica Eco', preco: 49.9, demanda: 'Alta', margemEstimada: 52, concorrencia: 'Baixa', oportunidade: 'Excelente', score: 80 },
  ],
  altaMargem: [
    { id: 9, nome: 'Creatina Monohidratada', preco: 89.9, demanda: 'Alta', margemEstimada: 55, concorrencia: 'Média', oportunidade: 'Excelente', score: 88 },
    { id: 10, nome: 'Camiseta Autoral', preco: 79.9, demanda: 'Média', margemEstimada: 60, concorrencia: 'Baixa', oportunidade: 'Excelente', score: 79 },
    { id: 11, nome: 'Cadeira Ergonômica', preco: 799.9, demanda: 'Alta', margemEstimada: 32, concorrencia: 'Média', oportunidade: 'Muito boa', score: 72 },
    { id: 12, nome: 'Máquina de Café', preco: 499.9, demanda: 'Média', margemEstimada: 30, concorrencia: 'Média', oportunidade: 'Muito boa', score: 71 },
  ],
};

export const estoque = {
  kpis: { atual: 8420, critico: 32, reservado: 624, coberturaMediaDias: 42, capitalParado: 31200 },
  previsao: [
    { dia: 'D1', total: 8420, faixa: 'normal' },
    { dia: 'D10', total: 8120, faixa: 'normal' },
    { dia: 'D20', total: 7540, faixa: 'baixo' },
    { dia: 'D30', total: 6920, faixa: 'baixo' },
    { dia: 'D40', total: 6450, faixa: 'critico' },
    { dia: 'D50', total: 6190, faixa: 'critico' },
    { dia: 'D60', total: 6100, faixa: 'critico' },
  ],
  estoqueParado: [
    { faixa: '0-30 dias', valor: 6520, percentual: 21 },
    { faixa: '31-60 dias', valor: 7840, percentual: 25 },
    { faixa: '61-90 dias', valor: 6910, percentual: 22 },
    { faixa: '91-120 dias', valor: 5360, percentual: 17 },
    { faixa: '120+ dias', valor: 4570, percentual: 15 },
  ],
};

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

export const usuarios = [
  { id: 1, nome: 'Carlos Menezes', email: 'carlos@omnisync.ai', perfil: 'Admin', status: 'ativo', mfaConfigurado: true },
  { id: 2, nome: 'Mariana Duarte', email: 'mariana@omnisync.ai', perfil: 'Operador', status: 'ativo', mfaConfigurado: true },
  { id: 3, nome: 'Felipe Andrade', email: 'felipe@omnisync.ai', perfil: 'Visualizador', status: 'ativo', mfaConfigurado: false },
  { id: 4, nome: 'Renata Lopes', email: 'renata@omnisync.ai', perfil: 'Operador', status: 'inativo', mfaConfigurado: false },
  { id: 5, nome: 'Bruno Carvalho', email: 'bruno@omnisync.ai', perfil: 'Admin', status: 'ativo', mfaConfigurado: true },
];

export const auditLog = [
  { id: 1, timestamp: '20/05 09:42:11', usuario: 'Carlos Menezes', acao: 'Alterou preço do produto "Fone Bluetooth TWS Pro"', origem: '192.168.0.14' },
  { id: 2, timestamp: '20/05 09:15:03', usuario: 'Mariana Duarte', acao: 'Exportou relatório de estoque', origem: '192.168.0.22' },
  { id: 3, timestamp: '20/05 08:58:47', usuario: 'Felipe Andrade', acao: 'Visualizou Radar de Mercado', origem: '10.0.0.8' },
  { id: 4, timestamp: '19/05 22:31:19', usuario: 'Carlos Menezes', acao: 'Concedeu perfil "Operador" a Renata Lopes', origem: '192.168.0.14' },
  { id: 5, timestamp: '19/05 18:12:55', usuario: 'Bruno Carvalho', acao: 'Ativou MFA na própria conta', origem: '192.168.0.31' },
];

export const compras = [
  { id: 'OC-201', fornecedor: 'TecParts Ltda', data: '20/05/2026', total: 1240.0, status: 'recebido' },
  { id: 'OC-202', fornecedor: 'CasaBem Dist.', data: '19/05/2026', total: 860.5, status: 'em trânsito' },
  { id: 'OC-203', fornecedor: 'ModaBras Atacado', data: '18/05/2026', total: 2310.0, status: 'pendente' },
  { id: 'OC-204', fornecedor: 'NutriVida', data: '17/05/2026', total: 1540.0, status: 'recebido' },
  { id: 'OC-205', fornecedor: 'EletroMix', data: '15/05/2026', total: 4280.0, status: 'enviado' },
  { id: 'OC-206', fornecedor: 'PetStore Atacado', data: '14/05/2026', total: 320.0, status: 'recebido' },
];

export const notasFiscais = [
  { id: 1, numero: 'NF-e 4521', tipo: 'Saída', destinatario: 'João Silva', origem: 'Loja Virtual', data: '20/05/2026', valor: 349.9, status: 'autorizada' },
  { id: 2, numero: 'NF-e 4522', tipo: 'Saída', destinatario: 'Maria Santos', origem: 'Mercado Livre', data: '20/05/2026', valor: 159.9, status: 'autorizada' },
  { id: 3, numero: 'NF-e 4523', tipo: 'Saída', destinatario: 'Pedro Oliveira', origem: 'Shopee', data: '19/05/2026', valor: 949.7, status: 'pendente' },
  { id: 4, numero: 'NFe 887', tipo: 'Entrada', destinatario: 'TecParts Ltda', origem: 'Fornecedor', data: '19/05/2026', valor: 1240.0, status: 'autorizada' },
  { id: 5, numero: 'NF-e 4524', tipo: 'Saída', destinatario: 'Carlos Lima', origem: 'Instagram', data: '18/05/2026', valor: 499.9, status: 'rejeitada' },
  { id: 6, numero: 'NFe 888', tipo: 'Entrada', destinatario: 'CasaBem Dist.', origem: 'Fornecedor', data: '18/05/2026', valor: 860.5, status: 'autorizada' },
];

export const entregas = [
  { id: 'ENV-301', transportadora: 'LogSul', destino: 'São Paulo', data: '20/05/2026', status: 'entregue', rastreio: 'LS123456' },
  { id: 'ENV-302', transportadora: 'LogSul', destino: 'Rio de Janeiro', data: '20/05/2026', status: 'em trânsito', rastreio: 'LS123457' },
  { id: 'ENV-303', transportadora: 'Correios', destino: 'Belo Horizonte', data: '19/05/2026', status: 'em trânsito', rastreio: 'BR998877' },
  { id: 'ENV-304', transportadora: 'Jadlog', destino: 'Porto Alegre', data: '19/05/2026', status: 'atrasado', rastreio: 'JL556677' },
  { id: 'ENV-305', transportadora: 'LogSul', destino: 'Curitiba', data: '18/05/2026', status: 'entregue', rastreio: 'LS123458' },
];

export const transacoes = [
  { id: 1, tipo: 'receita', descricao: 'Venda PED-1001', categoria: 'Vendas', data: '20/05/2026', valor: 349.9 },
  { id: 2, tipo: 'despesa', descricao: 'Fornecedor TecParts', categoria: 'Compras', data: '20/05/2026', valor: -1240.0 },
  { id: 3, tipo: 'receita', descricao: 'Venda PED-1002', categoria: 'Vendas', data: '19/05/2026', valor: 159.9 },
  { id: 4, tipo: 'despesa', descricao: 'Frete LogSul', categoria: 'Logística', data: '19/05/2026', valor: -420.0 },
  { id: 5, tipo: 'receita', descricao: 'Repasse Marketplace', categoria: 'Marketplace', data: '18/05/2026', valor: 2890.0 },
  { id: 6, tipo: 'despesa', descricao: 'Impostos (Simples)', categoria: 'Fiscal', data: '18/05/2026', valor: -1560.0 },
];

export const oportunidades = [
  { id: 1, nome: 'Kit Skincare Vegano', categoria: 'Beleza', score: 88, potencial: 18400, motivo: 'Crescimento de 22% e busca por veganos em alta.' },
  { id: 2, nome: 'Tapete Higiênico Pet', categoria: 'Pets', score: 83, potencial: 12900, motivo: 'Categoria pets cresce 38% ao ano.' },
  { id: 3, nome: 'Creatina Monohidratada', categoria: 'Suplementos', score: 85, potencial: 21700, motivo: 'Produto porta de entrada com margem de 40-65%.' },
  { id: 4, nome: 'Câmera de Segurança Wi-Fi', categoria: 'Segurança', score: 75, potencial: 9800, motivo: 'Demanda crescente por segurança residencial.' },
];

export const eventosCalendario = [
  { id: 1, titulo: 'Lançamento Fone TWS', canal: 'Instagram', data: '22/05/2026', tipo: 'post' },
  { id: 2, titulo: 'Campanha Creatina', canal: 'TikTok', data: '24/05/2026', tipo: 'video' },
  { id: 3, titulo: 'Post Air Fryer', canal: 'Facebook', data: '25/05/2026', tipo: 'post' },
  { id: 4, titulo: 'Stories Skincare', canal: 'Instagram', data: '26/05/2026', tipo: 'stories' },
];

export const integracoes = [
  { id: 'tiny', nome: 'Tiny ERP', categoria: 'ERP', descricao: 'Sincroniza produtos, estoque e pedidos.', status: 'conectado', authUrl: 'https://app.tiny.com.br/login' },
  { id: 'ml', nome: 'Mercado Livre', categoria: 'Marketplace', descricao: 'Publica e sincroniza anúncios e vendas.', status: 'conectado', authUrl: 'https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=SEU_CLIENT_ID&redirect_uri=https://omnisync.local/callback' },
  { id: 'shopee', nome: 'Shopee', categoria: 'Marketplace', descricao: 'Venda e gestão de pedidos na plataforma.', status: 'conectado', authUrl: 'https://seller.shopee.com.br/login' },
  { id: 'amazon', nome: 'Amazon', categoria: 'Marketplace', descricao: 'Marketplace com logística FBA.', status: 'desconectado', authUrl: 'https://sellercentral.amazon.com.br/home' },
  { id: 'stripe', nome: 'Stripe', categoria: 'Pagamentos', descricao: 'Cobranças e gateway de pagamento.', status: 'desconectado', authUrl: 'https://connect.stripe.com/oauth/authorize?response_type=code&client_id=SEU_CLIENT_ID&scope=read_write' },
  { id: 'sendgrid', nome: 'SendGrid', categoria: 'E-mail', descricao: 'Envio de e-mails transacionais.', status: 'desconectado', authUrl: 'https://app.sendgrid.com/login' },
  { id: 'meta', nome: 'Instagram / Meta', categoria: 'Social', descricao: 'Publicações e mensagens do Instagram.', status: 'conectado', authUrl: 'https://www.facebook.com/v12.0/dialog/oauth?client_id=SEU_CLIENT_ID&redirect_uri=https://omnisync.local/callback&scope=instagram_basic,pages_manage_posts' },
  { id: 'tiktok', nome: 'TikTok', categoria: 'Social', descricao: 'Vídeos e campanhas no TikTok.', status: 'desconectado', authUrl: 'https://www.tiktok.com/v2/auth/authorize/' },
];

export const dashboardAnalytics = {
  kpis: [
    { id: 'faturamento', label: 'Faturamento', value: 248540, format: 'currency', delta: 12.4 },
    { id: 'pedidos', label: 'Pedidos', value: 1284, format: 'number', delta: 8.7 },
    { id: 'ticketMedio', label: 'Ticket médio', value: 193, format: 'currency', delta: 5.2 },
    { id: 'lucroEstimado', label: 'Lucro estimado', value: 62840, format: 'currency', delta: 15.3 },
    { id: 'itensEstoque', label: 'Itens em estoque', value: 8420, format: 'number', delta: -3.1 },
    { id: 'capitalParado', label: 'Capital parado', value: 31200, format: 'currency', delta: -6.8 },
  ],
  vendasPorCanal: [
    { canal: 'Loja Virtual', valor: 98540 },
    { canal: 'Marketplace', valor: 62310 },
    { canal: 'Varejo Físico', valor: 45870 },
    { canal: 'WhatsApp', valor: 22410 },
    { canal: 'Instagram', valor: 11230 },
    { canal: 'Outros', valor: 8180 },
  ],
  alertas: [
    { id: 1, tipo: 'critico', titulo: 'Estoque crítico', descricao: '32 produtos com estoque abaixo do mínimo.' },
    { id: 2, tipo: 'atencao', titulo: 'Cartão 84%', descricao: 'Utilização do limite do cartão corporativo acima de 80%.' },
    { id: 3, tipo: 'atencao', titulo: 'Integração offline', descricao: 'A integração com a transportadora LogSul está offline.' },
  ],
};

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

export const estagiosPipeline = ['lead', 'qualificado', 'proposta', 'fechado', 'perdido'];

export const problemas = [
  { id: 'BO-001', titulo: '5 entregas atrasadas na rota Norte', categoria: 'Logística', prioridade: 'alta', status: 'aberto', descricao: 'Pedidos da rota Norte excederam o SLA em 6h.', data: '20/05/2026' },
  { id: 'BO-002', titulo: 'Integração Mercado Livre fora do ar', categoria: 'Integração', prioridade: 'alta', status: 'em andamento', descricao: 'Sincronização de anúncios falhou desde 08:00.', data: '20/05/2026' },
  { id: 'BO-003', titulo: 'NF-e 4524 rejeitada pela SEFAZ', categoria: 'Fiscal', prioridade: 'media', status: 'aberto', descricao: 'Rejeição por divergência de CFOP.', data: '18/05/2026' },
  { id: 'BO-004', titulo: 'Cliente não recebeu pedido PED-1006', categoria: 'Cliente', prioridade: 'media', status: 'resolvido', descricao: 'Reenvio realizado com novo código de rastreio.', data: '17/05/2026' },
  { id: 'BO-005', titulo: 'Estoque divergente no CD São Paulo', categoria: 'Estoque', prioridade: 'baixa', status: 'aberto', descricao: 'Contagem física aponta 12 unidades a menos.', data: '15/05/2026' },
];

export const fornecedores = [
  { id: 1, nome: 'TecParts Ltda', categoria: 'Eletrônicos', contato: 'contato@tecparts.com.br', telefone: '(11) 3333-2000', prazoEntrega: 5, avaliacao: 4.8, status: 'ativo' },
  { id: 2, nome: 'ModaBras Atacado', categoria: 'Moda', contato: 'vendas@modabras.com.br', telefone: '(11) 3444-3000', prazoEntrega: 7, avaliacao: 4.5, status: 'ativo' },
  { id: 3, nome: 'CasaBem Dist.', categoria: 'Casa', contato: 'pedidos@casabem.com.br', telefone: '(31) 3555-4000', prazoEntrega: 6, avaliacao: 4.6, status: 'ativo' },
  { id: 4, nome: 'NutriVida', categoria: 'Suplementos', contato: 'atacado@nutrivida.com.br', telefone: '(41) 3666-5000', prazoEntrega: 4, avaliacao: 4.9, status: 'ativo' },
  { id: 5, nome: 'EletroMix', categoria: 'Eletrodomésticos', contato: 'b2b@eletromix.com.br', telefone: '(21) 3777-6000', prazoEntrega: 9, avaliacao: 4.2, status: 'ativo' },
  { id: 6, nome: 'PetStore Atacado', categoria: 'Pets', contato: 'atacado@petstore.com.br', telefone: '(51) 3888-7000', prazoEntrega: 3, avaliacao: 4.7, status: 'ativo' },
  { id: 7, nome: 'Bella Cosméticos', categoria: 'Beleza', contato: 'atacado@bellacosmeticos.com.br', telefone: '(11) 3999-8000', prazoEntrega: 4, avaliacao: 4.4, status: 'ativo' },
];
