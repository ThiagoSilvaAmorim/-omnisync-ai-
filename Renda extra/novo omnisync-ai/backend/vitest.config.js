// Configuração do Vitest para o backend (ambiente Node).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
