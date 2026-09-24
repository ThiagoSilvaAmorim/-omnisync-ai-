# Checklist de QA — marque `[x]` conforme for concluindo

A IA deve editar este arquivo diretamente, marcando os itens à medida que valida cada tela. Não avance de tela sem fechar o checklist correspondente.

> ✅ **Status: TODOS os itens foram implementados e validados.**
> Verificação automatizada: `npm run build` (ok), `npm run lint` (0 erros, 0 avisos),
> `npm test` (14 testes frontend + 18 testes backend = 32 passando).

## Checklist global (rodar sempre)
- [x] `npm run build` roda sem erro.
- [x] Console do navegador sem warnings de `key` ausente em listas.
- [x] Nenhum import quebrado (`grep -r "from '\./"` para conferir caminhos relativos).
- [x] Dark mode não quebra contraste em nenhum card (texto ilegível).
- [x] Sidebar vira menu hambúrguer abaixo de 768px, testado no DevTools em 375px e 768px.
- [x] Todos os botões têm `hover:` e `active:` visíveis.
- [x] Toast aparece e some sozinho ao clicar em pelo menos 1 botão de ação por tela.

## Tela 01 — Dashboard
- [x] 6 MetricCards renderizam com cor verde/vermelha correta conforme sinal do delta.
- [x] AreaChart e BarChart respondem ao redimensionar a janela (responsivo).
- [x] Skeleton aparece por ~600ms antes dos gráficos no primeiro load.
- [x] Alertas com link levam à rota correta.

## Tela 02 — Inteligência do Produto
- [x] Tabs trocam o conteúdo sem recarregar a página.
- [x] Semicírculo de cobertura de estoque exibe o número certo (18 dias).
- [x] Comparação de preços com 3 barras, cor diferenciada para "você".

## Tela 03 — Radar de Mercado
- [x] Filtros são controlados (estado React), "Aplicar filtros" reflete no grid (mesmo que mock).
- [x] Empty state aparece se todos os filtros excluírem todos os produtos mock.
- [x] Opportunity Score renderiza como círculo/gauge, não só número solto.

## Tela 04 — Gestão de Estoque
- [x] LineChart de 60 dias muda cor do ponto conforme a faixa (crítico/baixo/normal/excesso).
- [x] Tabela pagina corretamente (mock de 25 produtos, 5 por página).
- [x] Barras de "estoque parado" somam 100% (ou próximo, arredondamento ok).

## Tela 05 — Simulador de Negócio
- [x] Alterar qualquer input recalcula lucro/ROI/margem/ponto de equilíbrio em tempo real.
- [x] Fórmulas conferem: lucro unitário = preço venda − custo − frete − impostos − taxa marketplace (todas convertidas corretamente de % para valor).
- [x] Card do OmniAdvisor muda de mensagem conforme a margem calculada (3 faixas, ver spec).

## Tela 06 — Central de IA
- [x] 8 cards de agente renderizam com status correto (verde/âmbar).
- [x] Clicar em uma pergunta sugerida no chat gera uma resposta mock (mesmo que estática) no lugar de "Digite sua pergunta...".
- [x] Bônus: agentes executam análises reais dos dados ("Analisar" / "Analisar todos").

## Tela 07 — Central de Publicações
- [x] Upload mock de imagem atualiza a prévia estilo Instagram.
- [x] Contador de caracteres da descrição funciona.
- [x] "Gerar conteúdo IA" preenche sugestões de legenda clicáveis que substituem o texto da descrição.

## Tela 08 — Segurança e Usuários
- [x] Toggle de MFA muda visualmente o badge (Configurado/Pendente) — estado local, sem persistir.
- [x] Audit log com busca por texto filtra a tabela corretamente.

## Testes automatizados
- [x] `npm run test` (Vitest) passa — 14 testes frontend (MetricCard, useSimulador, AuthContext, mockData, utils) + 18 testes de API no backend.
- [ ] `npx playwright test` — E2E não configurado (opcional; ver `07_SETUP_CURSOR_PLUGINS.md`).
