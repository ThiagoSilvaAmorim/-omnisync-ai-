# Setup do ambiente — Cursor, extensões e terminal

## 1. Extensões do Cursor/VS Code (instale via CLI, não precisa clicar na loja)

```bash
cursor --install-extension esbenp.prettier-vscode
cursor --install-extension dbaeumer.vscode-eslint
cursor --install-extension bradlc.vscode-tailwindcss
cursor --install-extension dsznajder.es7-react-js-snippets
cursor --install-extension usernamehw.errorlens
cursor --install-extension eamodio.gitlens
cursor --install-extension formulahendry.auto-rename-tag
cursor --install-extension christian-kohler.path-intellisense
cursor --install-extension ms-playwright.playwright
```

Se o comando `cursor` não existir no seu terminal (Windows), abra o Cursor, aperte `Ctrl+Shift+P` → "Shell Command: Install 'cursor' command in PATH" uma vez, depois os comandos acima funcionam normalmente no CMD/PowerShell.

## 2. Criar o projeto do zero (CMD/PowerShell/terminal do Cursor)

```bash
npm create vite@latest omnisync-ai -- --template react
cd omnisync-ai
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom recharts lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

Depois de rodar isso, copie os 9 arquivos deste pacote (`00_LEIA_PRIMEIRO.md` até `07_SETUP_CURSOR_PLUGINS.md`) e o `.cursorrules` para a raiz do projeto `omnisync-ai`. O `.cursorrules` é lido automaticamente pelo Cursor Agent a cada sessão nesse projeto — é o que faz ele "aprender sozinho" as regras sem você repetir o contexto toda vez.

## 3. Configurar o Tailwind (`tailwind.config.js`)

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } },
  plugins: [],
}
```

E no `src/index.css`, no topo:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 4. Rodando o agente de forma autônoma no Cursor

1. Abra a pasta `omnisync-ai` no Cursor.
2. Abra o Composer/Agent (padrão: `Ctrl+I` ou `Ctrl+Shift+I`, dependendo da versão).
3. Selecione o modo **Agent** (não "Ask") — é o que permite ele criar/editar arquivos e rodar comandos de terminal sozinho.
4. Cole como primeira mensagem: *"Leia 00_LEIA_PRIMEIRO.md e siga a ordem indicada antes de codar qualquer coisa."*
5. Deixe rodar. Quando ele parar entre telas (comportamento normal do Cursor, que às vezes pausa para confirmar ações longas), responda apenas **"continue"** — as regras de `.cursorrules` já dizem para ele não parar por decisões estéticas menores.

### Sobre "aprender sozinho"
Um agente de código não aprende de sessão para sessão por conta própria — o que dá esse efeito de continuidade é justamente o `.cursorrules` (lido sempre) e você manter os arquivos deste pacote na raiz do projeto como memória persistente do escopo. Se quiser ainda mais automação de terminal sem confirmar cada comando, ative em Cursor Settings → Features → "Auto-run" (execução automática de comandos de terminal seguros).

## 5. Loop de teste autônomo end-to-end (opcional, mas recomendado)

Você já usa Playwright MCP no Claude Code para outro projeto seu de automação de navegador — dá pra reaproveitar a mesma lógica aqui, mas de forma mais simples com o pacote `@playwright/test` puro (sem precisar do MCP), rodando local:

Crie `tests/e2e/navegacao.spec.js`:
```js
import { test, expect } from '@playwright/test';

const rotas = ['/dashboard', '/produto-intel', '/radar-mercado', '/estoque', '/simulador', '/central-ia', '/publicacoes', '/seguranca'];

for (const rota of rotas) {
  test(`rota ${rota} carrega sem erro`, async ({ page }) => {
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    await page.goto(`http://localhost:5173${rota}`);
    await expect(page.locator('body')).toBeVisible();
    expect(erros).toEqual([]);
  });
}
```

Rodar com o servidor de dev ativo em outro terminal:
```bash
npm run dev
npx playwright test
```

Se preferir usar o **Playwright MCP** que você já está configurando no Claude Code (ver seu projeto de agente autônomo de navegador), a IA pode navegar visualmente pelas 8 rotas, tirar screenshot de cada uma e comparar contra a spec de `02_ARQUITETURA_TELAS.md` — é o caminho mais próximo de "validação visual automática" sem precisar de imagens pixel-perfect prontas.

## 6. Scripts sugeridos no `package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "eslint src"
  }
}
```
