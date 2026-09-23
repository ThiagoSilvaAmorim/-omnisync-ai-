import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { getModo } from '../lib/modes';
import { getPaleta } from '../lib/palettes';

// ============================================
// AppContext — única fonte de estado global:
// tema (light/dark), menu mobile, fila de toasts.
// Sem dados fictícios: páginas buscam no backend.
// ============================================

const AppContext = createContext(null);

// Gera um id curto para cada toast
let toastId = 0;
const nextToastId = () => ++toastId;

export function AppProvider({ children }) {
  // ---- Tema (light/dark) ----
  // Lê o tema salvo uma única vez na inicialização.
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('omnisync-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'light';
  });

  // Aplica/remove a classe `dark` no <html> sempre que o tema muda.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('omnisync-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // ---- Menu mobile (drawer off-canvas) ----
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ---- Período (filtro de datas do cabeçalho) ----
  const [period, setPeriod] = useState('30d');

  // ---- Intervalo customizado (usado quando period === 'custom') ----
  const [customRange, setCustomRange] = useState({ inicio: '2024-04-20', fim: '2024-05-20' });

  // ---- Painel ativo (qual sub-dashboard está visível) ----
  const [painel, setPainel] = useState('comercial');

  // ---- Modo visual (identidade completa) ----
  const [modo, setModoState] = useState(() => {
    const stored = localStorage.getItem('omnisync-modo');
    return getModo(stored).id;
  });

  // ---- Paleta de cores (identidade visual) ----
  const [palette, setPaletteState] = useState(() => {
    const stored = localStorage.getItem('omnisync-palette');
    return getPaleta(stored).id;
  });

  // Cor personalizada (hex) por modo. Quando definida, sobrepõe a paleta.
  const [customCor, setCustomCor] = useState({});

  // Aplica modo (estilo) + cores como variáveis CSS no <html>.
  const applyModo = useCallback((modoId, paletaId, custom) => {
    const root = document.documentElement;
    const m = getModo(modoId);
    const p = getPaleta(paletaId);

    // Cor primária: customizada (por modo) > paleta.
    const cor = custom[modoId];
    if (cor) {
      const c = cor.replace('#', '');
      const r = parseInt(c.slice(0, 2), 16);
      const g = parseInt(c.slice(2, 4), 16);
      const b = parseInt(c.slice(4, 6), 16);
      root.style.setProperty('--primary-50', `${Math.round(r * 0.94)} ${Math.round(g * 0.94)} ${Math.round(b * 0.94)}`);
      root.style.setProperty('--primary-100', `${Math.round(r * 0.88)} ${Math.round(g * 0.88)} ${Math.round(b * 0.88)}`);
      root.style.setProperty('--primary-400', `${Math.min(255, Math.round(r * 0.75 + 90))} ${Math.min(255, Math.round(g * 0.75 + 90))} ${Math.min(255, Math.round(b * 0.75 + 90))}`);
      root.style.setProperty('--primary-500', `${r} ${g} ${b}`);
      root.style.setProperty('--primary-600', `${Math.max(0, Math.round(r * 0.82))} ${Math.max(0, Math.round(g * 0.82))} ${Math.max(0, Math.round(b * 0.82))}`);
      root.style.setProperty('--primary-700', `${Math.max(0, Math.round(r * 0.64))} ${Math.max(0, Math.round(g * 0.64))} ${Math.max(0, Math.round(b * 0.64))}`);
    } else {
      Object.entries(p.cores).forEach(([shade, tripleto]) => {
        root.style.setProperty(`--primary-${shade}`, tripleto);
      });
    }

    // Estilo do modo (raio de cantos, sombra, sidebar, chips, glow).
    root.style.setProperty('--tl-radius', `${m.style.radius}px`);
    root.style.setProperty('--tl-radius-sm', `${m.style.radiusSm}px`);
    root.style.setProperty('--tl-shadow', m.style.shadow);
    root.style.setProperty('--tl-sidebar-bg', m.style.sidebarBg);
    root.style.setProperty('--tl-sidebar-active', m.style.sidebarActive);
    root.style.setProperty('--tl-chip', m.style.chip);
    root.style.setProperty('--tl-glow', m.style.glow ? '1' : '0');

    localStorage.setItem('omnisync-modo', modoId);
    localStorage.setItem('omnisync-palette', paletaId);
  }, []);

  // Reaplica quando modo, paleta ou cor customizada mudam.
  useLayoutEffect(() => {
    applyModo(modo, palette, customCor);
  }, [modo, palette, customCor, applyModo]);

  const setModo = useCallback(id => {
    const m = getModo(id);
    // Neon é escuro por padrão.
    if (m.style.darkDefault) {
      setTheme('dark');
      localStorage.setItem('omnisync-theme', 'dark');
    }
    setModoState(m.id);
  }, []);
  const setPalette = useCallback(id => {
    setPaletteState(getPaleta(id).id);
  }, []);
  const setCustomColor = useCallback((modoId, hex) => {
    setCustomCor(prev => ({ ...prev, [modoId]: hex }));
  }, []);

  // Cor primária (formato CSS) usada pelos gráficos.
  const primaryColor = `rgb(${getPaleta(palette).cores['500']})`;

  // Metadados do modo ativo.
  const modoAtivo = getModo(modo);
  const paletaAtiva = getPaleta(palette);
  const customAtiva = customCor[modo] || null;

  // ---- Notificações (sino do cabeçalho) ----
  const [notificacoes, setNotificacoes] = useState([]);

  // Deep link opcional: notificação → módulo → entidade (rota interna).
  const addNotificacao = useCallback((titulo, descricao, rota) => {
    setNotificacoes(prev => [
      { id: Date.now(), titulo, descricao, rota: rota || null, lida: false, data: new Date().toLocaleString('pt-BR') },
      ...prev,
    ]);
  }, []);

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  }, []);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  // ---- Toasts ----
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Adiciona um toast e agenda a remoção automática (~3s).
  const addToast = useCallback(message => {
    const id = nextToastId();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      mobileNavOpen,
      setMobileNavOpen,
      period,
      setPeriod,
      customRange,
      setCustomRange,
      painel,
      setPainel,
      modo,
      setModo,
      modoAtivo,
      palette,
      setPalette,
      paletaAtiva,
      customCor,
      customAtiva,
      setCustomColor,
      primaryColor,
      notificacoes,
      naoLidas,
      addNotificacao,
      marcarTodasLidas,
      toasts,
      addToast,
      removeToast,
    }),
    [
      theme,
      toggleTheme,
      mobileNavOpen,
      setMobileNavOpen,
      period,
      customRange,
      painel,
      modo,
      setModo,
      modoAtivo,
      palette,
      setPalette,
      paletaAtiva,
      customCor,
      customAtiva,
      setCustomColor,
      primaryColor,
      notificacoes,
      naoLidas,
      addNotificacao,
      marcarTodasLidas,
      toasts,
      addToast,
      removeToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook de acesso ao estado global
// oxlint-disable-next-line react/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp deve ser usado dentro de <AppProvider>');
  }
  return ctx;
}
