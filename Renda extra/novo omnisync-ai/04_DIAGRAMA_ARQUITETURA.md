# Diagrama de arquitetura — componentes e dados

```mermaid
flowchart TB
    subgraph Entrada
        main[main.jsx] --> App[App.jsx - Rotas]
    end

    App --> Ctx[AppContext.jsx]
    Ctx -->|tema, sidebar, toasts, mock data| Shell[AppShell.jsx]

    Shell --> Sidebar[layout/Sidebar]
    Shell --> Header[layout/Header]
    Shell --> MobileNav[layout/MobileNav]
    Shell --> Outlet[[Outlet - 8 páginas]]

    Outlet --> P1[pages/Dashboard]
    Outlet --> P2[pages/ProdutoIntel]
    Outlet --> P3[pages/RadarMercado]
    Outlet --> P4[pages/Estoque]
    Outlet --> P5[pages/Simulador]
    Outlet --> P6[pages/CentralIA]
    Outlet --> P7[pages/Publicacoes]
    Outlet --> P8[pages/Seguranca]

    P1 & P2 & P3 & P4 & P6 --> UI[components/ui: Card, Badge, Skeleton, EmptyState, Toast]
    P1 & P2 & P4 --> Charts[components/charts: LineChart, AreaChart, BarChart, DonutChart]
    P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 --> Data[(data/mockData.js)]

    Data -.futuro: trocar por.-> API[(API real / backend)]
```

## Camadas e responsabilidades

- **`AppContext.jsx`**: única fonte de estado global — tema (light/dark, persistido em `localStorage`... **exceto se este código rodar como artifact de preview, nesse caso usar estado em memória**; em projeto Vite normal, `localStorage` é permitido), estado da sidebar/menu mobile, fila de toasts, e os dados mockados carregados uma vez.
- **`components/ui`**: componentes "burros", sem lógica de negócio — recebem props e renderizam.
- **`components/charts`**: encapsulam o Recharts, recebem `data` e `theme` via props, para as páginas não conhecerem detalhes do Recharts diretamente.
- **`pages/*`**: montam o layout específico da tela, buscam os dados de `mockData.js` (ou futuramente de um hook `useApi`), e decidem loading/empty/erro.
- **`data/mockData.js`**: isolado de propósito — no dia de plugar um backend real (Supabase, conforme a visão de produto), só essa camada muda, nenhuma página precisa ser reescrita.

## Evolução futura (fora do escopo deste protótipo, mas a arquitetura já prevê)
- Trocar `mockData.js` por um hook `useApi`/`useSWR` apontando para Supabase (mencionado na visão de produto como destino de implementação).
- Cada agente de IA da Central de IA hoje é só um card estático — no futuro corresponde a um serviço/rota de backend separado.
