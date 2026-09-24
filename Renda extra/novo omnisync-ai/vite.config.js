import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // aceita localhost, 127.0.0.1 e IP da rede
    port: 5173,
    strictPort: true,
  },
})
