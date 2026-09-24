import { useApp } from '../context/AppContext';

// ============================================
// useTheme — atalho para acessar tema e toggle
// sem precisar importar o contexto diretamente.
// ============================================
export function useTheme() {
  const { theme, toggleTheme } = useApp();
  return { theme, toggleTheme };
}
