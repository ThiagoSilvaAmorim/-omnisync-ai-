# PROMPT MESTRE — OmniSync AI (protótipo front-end pixel-close)

> Cole este arquivo inteiro como prompt inicial no Cursor (Composer/Agent mode) ou no Claude Code, na raiz de um projeto novo. Não resuma, não corte trechos.

Você é um Engenheiro de Software Front-end Sênior. Sua missão é arquitetar e desenvolver o protótipo funcional do sistema SaaS corporativo **"OmniSync AI"**, baseado rigorosamente nas especificações abaixo. O sistema é um "Sistema inteligente de gestão multicanal": transforma dados de vendas, estoque, mercado, marketing e operação em decisões, seguindo o princípio **dados → interpretação → recomendação → ação controlada**.

---

## 1. STACK TÉCNICA OBRIGATÓRIA
- **Framework:** React com Vite (React puro no client-side; **NÃO** usar Next.js ou qualquer SSR).
- **Estilização:** Tailwind CSS (utilitários; sem CSS externo além do `index.css` de entrada do Tailwind).
- **Roteamento:** React Router DOM v6.
- **Ícones:** Lucide React.
- **Gráficos:** Recharts (responsivos, estilizados conforme o tema).
- **Estado global:** React Context API (tema Dark/Light, estado da Sidebar/menu mobile, dados mockados globais).
- **Testes (novo):** Vitest + React Testing Library para testes unitários de componentes; Playwright para smoke test end-to-end de navegação (ver seção 8).

## 2. ARQUITETURA DE PASTAS E COMPONENTES
```
/src
  /assets
  /components
    /layout      (Sidebar, Header, AppShell, MobileNav)
    /ui          (Card, Button, Badge, Input, Table, Skeleton, EmptyState, Toast)
    /charts      (LineChart, AreaChart, BarChart, DonutChart encapsulados)
  /context       (AppContext.jsx — tema, sidebar, toasts, mock data)
  /pages         (uma pasta por tela — 8 telas, ver seção 5)
  /data          (mockData.js — todas as constantes de gráficos/tabelas, ver 05_MOCKDATA_SPEC.md)
  /hooks         (useToast, useMediaQuery, useTheme)
  App.jsx        (configuração de rotas)
  main.jsx       (ponto de entrada)
/tests
  /unit          (componentes .test.jsx)
  /e2e           (specs Playwright, ver 06_QA_TESTES.md)
```

## 3. DESIGN SYSTEM (TAILWIND)
- **Cores:**
  - Fundo principal: `bg-slate-50` (dark mode: `bg-slate-950`).
  - Sidebar: `bg-slate-900`.
  - Cards: `bg-white border-slate-200 shadow-sm rounded-xl` (dark: `bg-slate-900 border-slate-800`).
  - Primária (IA/Ações): `indigo-600` e `purple-600` (gradiente em elementos de destaque de IA).
  - Status: Sucesso `teal-600`, Atenção `amber-500`, Crítico `red-500`, Info `sky-500`.
- **Tipografia:** Fonte `Inter` (Google Fonts, importar no `index.html`). Títulos `font-semibold text-slate-800` (dark: `text-slate-100`). Texto de apoio `text-slate-500`.
- **Interações:** botões e links com `hover:bg-opacity-90 transition-all duration-150`.
- **Raio de borda padrão:** `rounded-xl` em cards, `rounded-lg` em inputs/botões.

## 4. O SHELL DA APLICAÇÃO (AppShell.jsx)
Layout mestre que envelopa todas as rotas:
- **Sidebar (esquerda, 260px, fixa em desktop):**
  - Logo no topo ("OmniSync AI", bold, ícone de infinito do Lucide — `Infinity`).
  - Menu agrupado por seção:
    - **OPERAÇÃO:** Dashboard, Vendas, Pedidos, Produtos, Estoque, Compras, Clientes / CRM, Financeiro, Fiscal, Logística.
    - **INTELIGÊNCIA:** Radar de Mercado, Laboratório de Oportunidades, Simulador de Negócio.
    - **MARKETING & SOCIAL:** Central de Publicações, Calendário, Conteúdo IA.
    - **CONFIGURAÇÕES:** Integrações, Segurança, Usuários.
  - Link ativo: `bg-slate-800`, texto branco, `border-l-4 border-indigo-500`.
- **Header (topo, fixo, `h-16`):**
  - Input de pesquisa global com ícone de lupa e atalho visual `⌘K`.
  - Botão primário "+ Nova ação" (`bg-indigo-600 text-white`).
  - Ícone de sino com badge vermelho de notificação.
  - Ícone de Ajuda.
  - Toggle de tema Light/Dark.
  - Avatar do usuário, nome "Carlos Menezes", bolinha verde "Online".
- **Área principal:** `<Outlet />` com `p-8` (reduzir para `p-4` em mobile).

## 5. ESPECIFICAÇÃO DAS 8 TELAS

> Detalhamento completo de cada uma (incluindo componentes internos exatos) está em `02_ARQUITETURA_TELAS.md`. Resumo de escopo aqui, não pule o outro arquivo.

1. **Dashboard Executivo** (`/dashboard`) — KPIs, gráfico de faturamento 30 dias, vendas por canal, alertas, insight IA (OmniAdvisor).
2. **Inteligência do Produto** (`/produto-intel`) — KPIs de um produto, tabs internas, histórico de vendas, cobertura de estoque, comparação de preços, recomendação IA.
3. **Radar de Mercado** (`/radar-mercado`) — filtros, 3 seções de produtos (em alta / emergentes / alta margem) com Opportunity Score.
4. **Gestão de Estoque** (`/estoque`) — KPIs, previsão de estoque 60 dias, tabela de produtos, estoque parado por faixa, ações IA.
5. **Simulador de Negócio** (`/simulador`) — formulário de custos à esquerda, resultados calculados à direita, validação IA.
6. **Central de IA** (`/central-ia`) — grid de 8 agentes (OmniAdvisor, CompraGuard, StockGuard, MarketRadar, FiscalGuard, SocialPilot, SalesAnalyst, PriceWatch) + chat do OmniAdvisor.
7. **Central de Publicações** (`/publicacoes`) — 3 colunas: mídia (drag&drop), editor (título/descrição/canais), prévia estilo Instagram.
8. **Segurança e Usuários** (`/seguranca`) — **tela nova, presente na visão de produto mas ausente no prompt técnico original**: lista de usuários e perfis, status de MFA, audit log (tabela de eventos com timestamp, usuário, ação).

## 6. ESTADOS DE INTERFACE (UI STATES) — obrigatório em toda tela
- **Loading:** ao montar qualquer card com gráfico ou tabela, exibir `Skeleton` (barra cinza com animação `animate-pulse`) por um tempo simulado (`setTimeout` de ~600ms no mock) antes de renderizar o conteúdo real. Nunca deixar o espaço em branco enquanto "carrega".
- **Empty state:** se uma tabela/lista filtrada não tiver resultados, exibir um estado vazio com ícone grande do Lucide (`Inbox`, `SearchX` etc.), título curto e uma frase de orientação (ex: "Nenhum produto encontrado. Ajuste os filtros.").
- **Erro (opcional para o mock, mas deixar o componente pronto):** `ErrorState` reutilizável para quando uma chamada real de API falhar no futuro.

## 7. RESPONSIVIDADE
- Abaixo de `md` (768px): sidebar esquerda oculta, substituída por ícone de menu hambúrguer no Header que abre um drawer/off-canvas com o mesmo menu.
- Grids de KPI: 1 coluna em mobile (`grid-cols-1`), 2 em tablet (`sm:grid-cols-2`), estrutura completa (3 a 6 colunas) só em desktop (`lg:grid-cols-3` ou `lg:grid-cols-6` conforme a tela).
- Tabelas com muitas colunas: permitir scroll horizontal (`overflow-x-auto`) em telas pequenas em vez de quebrar o layout.

## 8. MICROINTERAÇÕES E FEEDBACK
- Todos os botões têm estado `hover:` (mudança sutil de cor/opacidade) e `active:` (leve `scale-95` ou mudança de tom) definidos via Tailwind.
- Ações de formulário/botão (ex: "Simular novamente", "Agendar publicação", "+ Nova ação") disparam um `Toast` no canto superior direito confirmando a ação ("Simulação atualizada", "Publicação agendada"), com auto-dismiss em ~3s. Implementar via Context (`useToast`) + componente `Toast` reutilizável — não usar lib externa.

## 9. CÓDIGO LIMPO E DIDÁTICO
- React puro + Vite estritamente.
- Comentários curtos e explicativos em componentes que usam `useState`/`useContext`/lógica de rotas — objetivo é servir de portfólio e material de estudo, não só "funcionar".
- Separar UI (apresentação) de lógica sempre que fizer sentido (ex: hooks customizados para cálculos do Simulador de Negócio).

## 10. TESTES E QUALIDADE (novo — ver `06_QA_TESTES.md` para o checklist completo)
- Cada tela só é considerada "pronta" depois de passar no checklist de QA correspondente.
- Rodar `npm run build` sem erros críticos de React no console antes de avançar para a próxima tela.
- Testes unitários (Vitest + RTL) para: `MetricCard`, `Toast`, cálculo do Simulador de Negócio, e o `AppContext` (toggle de tema e sidebar).
- Smoke test Playwright cobrindo a navegação pelas 8 rotas (ver `07_SETUP_CURSOR_PLUGINS.md`).

## 11. REQUISITOS DE ENTREGA DO CÓDIGO
1. Criar todos os arquivos necessários garantindo `imports`/`exports` alinhados.
2. Código deve compilar sem nenhum erro crítico de React no console.
3. Não criar componentes vazios; preencher com a estrutura HTML/Tailwind detalhada.
4. Concentrar os arrays de dados em `src/data/mockData.js`, importados nas páginas — schema em `05_MOCKDATA_SPEC.md`.
5. Ao final de cada tela concluída, rodar o checklist de QA e só então seguir para a próxima (não gerar as 8 de uma vez).
