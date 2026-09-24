# Arquitetura detalhada das 8 telas

Cada bloco abaixo é uma unidade de trabalho fechada. Implemente uma de cada vez, seguindo `.cursorrules`.

---

## TELA 01 — Dashboard Executivo (`/dashboard`)
**Componentes:** `MetricCard` (título, valor, variação % — verde se positivo, vermelho se negativo), `AreaChart` (Recharts), `BarChart` (Recharts), `AlertList`, `AIInsightCard`.

- **Métricas topo (grid 3x2 desktop / 1 col mobile / 2 col tablet):** Faturamento R$ 248.540 (+12,4%), Pedidos 1.284 (+8,7%), Ticket médio R$ 193 (+5,2%), Lucro estimado R$ 62.840 (+15,3%), Itens em estoque 8.420 (-3,1%), Capital parado R$ 31.200 (-6,8%).
- **Sessão central (grid 2/3 + 1/3 em desktop, empilhado em mobile):**
  - Esquerda: `AreaChart` faturamento 30 dias (20/04 a 20/05, curva suave, tooltip formatado em R$).
  - Direita: "Alertas importantes" — Estoque crítico (32 produtos), Cartão 84% do limite, Integração LogSul offline. Cada item com ícone, texto e seta `>` clicável (link para a tela relacionada).
- **Vendas por canal:** `BarChart` — Loja Virtual 98.540, Marketplace 62.310, Varejo Físico 45.870, WhatsApp 22.410, Instagram 11.230, Outros 8.180.
- **Rodapé — Insight IA (card largo, fundo `bg-gradient-to-r from-indigo-50 to-purple-50`):** "O que está acontecendo" (2 bullets) | "Ação recomendada" (2 bullets) + botão "Ver análise completa".

## TELA 02 — Inteligência do Produto (`/produto-intel`)
- **Header:** botão Voltar, breadcrumb "Produtos > Inteligência do Produto", título "Fone Bluetooth Pro X", SKU FBX-001, badge "Em alta" (`bg-teal-100 text-teal-700`), botão "Ações do produto" (dropdown).
- **KPIs:** Vendas 428, Receita R$ 42.800, Preço médio R$ 99,90, Margem 38%.
- **Tabs:** Visão geral, Vendas, Estoque, Preço, Mercado, Avaliações, IA (usar estado local, não precisa de sub-rota).
- **Corpo (grid 3 colunas desktop, 1 coluna mobile):**
  - Col 1: `LineChart` histórico de vendas.
  - Col 2: Cobertura de estoque — semicírculo (Recharts `RadialBarChart` ou SVG customizado) mostrando "18 dias", situação "Saudável".
  - Col 3: Comparação de preços — barras horizontais: Você R$ 99,90, Conc. A R$ 109,90, Conc. B R$ 99,00.
- **Rodapé IA:** "Oportunidade de crescimento +23%" + lista de 3 ações recomendadas + botão "Ver plano de ação completo".

## TELA 03 — Radar de Mercado (`/radar-mercado`)
- **Filtros inline (linha de selects):** Categoria, Faixa de preço, Margem mínima, Concorrência, Período + botão "Aplicar filtros".
- **3 seções horizontais (scroll ou grid 4 colunas):**
  - "Produtos em alta": Fone Bluetooth Pro, Smartwatch Fit X, Carregador Portátil 20k, Ring Light 26cm.
  - "Produtos emergentes": Fritadeira Air Fryer 4L, Garrafa Térmica 1L, Fita LED RGB 5m, Suporte Veicular Celular.
  - "Alta margem": Massageador Muscular, Câmera Wi-Fi Interna, Purificador de Ar, Robô Aspirador.
- **Cada card:** nome, preço, badge de Demanda (Alta/Média/Baixa), margem estimada %, badge de Concorrência, badge de Oportunidade (Excelente/Muito boa), e círculo pequeno com Opportunity Score (ex: 82, 78, 75...).

## TELA 04 — Gestão de Estoque (`/estoque`)
- **KPIs:** Estoque atual 8.420, Estoque crítico 32 itens (destaque vermelho), Estoque reservado 624, Cobertura média 42 dias, Capital parado R$ 31.200. Botão "Exportar relatório".
- **Filtros:** Período, Categoria, Fornecedor, Armazém, Status.
- **Gráfico principal:** `LineChart` "Previsão de estoque total" (próximos 60 dias) — pontos coloridos por faixa: azul (excesso), verde (normal), amarelo (baixo), vermelho (crítico). Legenda com as 4 cores.
- **Layout inferior (70% tabela / 30% sidebar direita, empilha em mobile):**
  - Tabela: Produto, SKU, Atual, Mínimo, Cobertura (dias), Status (badge). Paginação no rodapé.
  - Sidebar: "Estoque parado" por faixa (0-30, 31-60, 61-90, 91-120, 120+ dias) com barra de progresso e valor em R$; "Ações recomendadas por IA" (Desconto, Kit, Campanha, Liquidar).

## TELA 05 — Simulador de Negócio (`/simulador`)
- **Grid dividido (esquerda formulário / direita resultados, empilha em mobile):**
  - Inputs: Custo de compra (R$), Frete (R$), Impostos (%), Taxa do marketplace (%), Preço de venda (R$), Quantidade.
  - Painel de resultados (fundo `bg-slate-50`, calculado em tempo real via hook `useSimulador`): Lucro unitário, Lucro total, ROI %, Margem %, Ponto de equilíbrio (unidades).
- **Validação IA:** card roxo do OmniAdvisor avaliando se vale a pena comprar, com base no resultado calculado (regra simples: margem > 20% → "Sim, margem saudável"; entre 10-20% → "Atenção, margem apertada"; < 10% → "Não recomendado").
- Botões "Simular novamente" e "Exportar análise" (ambos disparam Toast).

## TELA 06 — Central de IA (`/central-ia`)
- **Grid esquerda (lista de agentes, 2-4 colunas conforme largura):** OmniAdvisor, CompraGuard, MarketRadar, FiscalGuard, SalesAnalyst, PriceWatch, StockGuard, SocialPilot. Cada card: nome, status (Ativo/Atenção com bolinha verde/amarela), última execução, nº de tarefas concluídas, resultado em texto curto, link "Ver logs".
- **Coluna direita (chat OmniAdvisor):** header com avatar/nome/status "Ativo", lista de perguntas sugeridas clicáveis, mensagem simulada da IA com estrutura: Dados / Motivo / Recomendação / Impacto estimado (queda de margem de 28,6% para 24,3%, impacto +R$ 18.700). Input fixo na base "Digite sua pergunta...".

## TELA 07 — Central de Publicações (`/publicacoes`)
- **3 colunas (empilha em mobile):**
  - Col 1 — Mídia: área de drag & drop "Adicione imagens ou vídeos", preview em grid pequeno das mídias já adicionadas.
  - Col 2 — Editor: inputs Título e Descrição (com contador de caracteres), campo de Hashtags, botão "Gerar conteúdo IA" (ícone de faísca, `Sparkles` do Lucide), checkboxes de canais (Instagram, TikTok, Facebook, WhatsApp), botões "Salvar rascunho" / "Agendar publicação".
  - Col 3 — Prévia: mockup de celular (borda arredondada grossa, `rounded-[2.5rem] border-8`) renderizando imagem, legenda formatada e contador de curtidas, como apareceria no Instagram. Painel lateral extra com "Sugestões de legenda" geradas por IA (3 variações) e "Dicas de performance" em checklist.

## TELA 08 — Segurança e Usuários (`/seguranca`)
> Presente na visão de produto (PDF) mas ausente no prompt técnico original — inclua para fechar o menu "CONFIGURAÇÕES" (Integrações, Segurança, Usuários) sem link quebrado.

- **Tabs ou seções:** "Usuários e perfis", "MFA", "Audit Log".
- **Usuários e perfis:** tabela com Nome, E-mail, Perfil (Admin/Operador/Visualizador — badge), Status (Ativo/Inativo), botão de ação (editar permissões).
- **MFA:** lista de usuários com toggle indicando se MFA está configurado, badge verde "Configurado" / âmbar "Pendente".
- **Audit Log:** tabela com Timestamp, Usuário, Ação (ex: "Alterou preço do produto X"), IP/origem. Suporta busca e filtro por período.
- Texto de rodapé fixo: "A segurança é aplicada no backend e refletida na experiência, sem expor dados sensíveis" (nota de produto, não funcional no protótipo).
