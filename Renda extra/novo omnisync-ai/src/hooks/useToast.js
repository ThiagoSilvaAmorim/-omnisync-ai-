import { useApp } from '../context/AppContext';

// ============================================
// useToast — atalho para disparar toasts de ação
// (ex: "Simulação atualizada", "Publicação agendada").
// ============================================
export function useToast() {
  const { addToast } = useApp();
  return addToast;
}
