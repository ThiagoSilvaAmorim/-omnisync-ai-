# LEIA PRIMEIRO — Ordem de Execução para a IA (Cursor / Claude Code)

Este pacote foi montado para ser lido **por uma IA agente** (Cursor Agent, Claude Code, Copilot Workspace etc.) de forma sequencial e autônoma, sem depender de perguntas de volta ao usuário salvo bloqueios reais (ex: falta de credencial).

**NÃO PULE ARQUIVOS. NÃO RESUMA. Leia cada um por completo antes de codar.**

## Ordem de leitura obrigatória

1. `.cursorrules` — regras de comportamento do agente dentro do Cursor (carregado automaticamente pelo Cursor, mas releia manualmente também).
2. `01_PROMPT_MESTRE.md` — o prompt principal, com stack, design system, e as 8 telas detalhadas. É a fonte da verdade de escopo.
3. `02_ARQUITETURA_TELAS.md` — detalhamento tela a tela (inclui a Tela 08 "Segurança e Usuários" que estava só na visão de produto, não no prompt original).
4. `wireframes/` — 8 arquivos SVG, um por tela, mostrando a disposição dos blocos (layout, não pixel-perfect de cor). Use como referência estrutural, não como imagem final.
5. `03_FLUXO_NAVEGACAO.md` — diagrama Mermaid do fluxo entre telas e o princípio de UX (dado → interpretação → recomendação → ação).
6. `04_DIAGRAMA_ARQUITETURA.md` — diagrama Mermaid da árvore de componentes/pastas e do fluxo de dados (Context API, mock data, futura API real).
7. `05_MOCKDATA_SPEC.md` — schema exato dos dados mockados que alimentam gráficos e tabelas.
8. `06_QA_TESTES.md` — checklist de testes que o agente deve rodar e marcar como concluído antes de considerar qualquer tela "pronta".
9. `07_SETUP_CURSOR_PLUGINS.md` — extensões do Cursor/VS Code e comandos de terminal para montar o ambiente sozinho, incluindo o loop de teste autônomo com Playwright.

## Regra de ouro para a IA

Depois de ler os 9 arquivos, siga este ciclo por tela (1 a 8), nessa ordem, sem avançar para a próxima tela sem fechar o ciclo da atual:

```
LER spec da tela → CODAR componente(s) → RODAR npm run dev / build →
RODAR checklist de QA da tela (06_QA_TESTES.md) → CORRIGIR erros →
SÓ ENTÃO marcar a tela como concluída e seguir para a próxima
```

Nunca gere as 8 telas de uma vez sem validar build entre elas — isso é o que costuma gerar imports quebrados e componentes vazios.

## O que este pacote NÃO inclui (e por quê)

- **Imagens pixel-perfect finais das telas**: não é possível gerar a réplica exata do PDF de vocês em formato de imagem "pronta"; em vez disso, os wireframes SVG mostram a estrutura de blocos, e o `02_ARQUITETURA_TELAS.md` descreve cor, espaçamento e componente por componente em texto — suficiente para a IA implementar em código real e ainda mais fiel que uma imagem estática (que ela não consegue "recortar" para JSX de qualquer forma).
- **Backend real**: o escopo aqui é o protótipo front-end com mock data, como pedido no prompt original. O `04_DIAGRAMA_ARQUITETURA.md` já deixa a camada de dados isolada (`/data/mockData.js` + Context) para trocar por API depois sem reescrever telas.
