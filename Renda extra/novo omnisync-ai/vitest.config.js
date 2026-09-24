import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuração do Vitest (testes unitários + React Testing Library).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Apenas testes do frontend (backend tem seu próprio vitest.config.js).
    include: ['src/**/*.test.{js,jsx}'],
  },
});
