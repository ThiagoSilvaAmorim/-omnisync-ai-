// ============================================
// modes.js — os 4 MODOS radicais do sistema.
// Cada modo é um "sistema" visual completo:
// layout de navegação, tipo de gráficos da home,
// cantos, sombras, vibe e o estilo da sidebar.
// O usuário alterna entre eles em 1 clique.
// ============================================

export const MODOS = [
  {
    id: 'classico',
    nome: 'Clássico',
    sub: 'Sidebar + cartões',
    descricao: 'Navegação lateral, cartões e gráficos de área. O padrão corporativo.',
    nav: 'sidebar',
    home: 'sinopse',
    vibe: 'Equilibrado',
    style: {
      radius: 14,
      radiusSm: 9,
      shadow: '0 4px 16px -4px rgba(124,58,237,0.10), 0 2px 4px rgba(15,23,42,0.04)',
      sidebarBg: 'linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%)',
      sidebarActive: 'rgba(255,255,255,1)',
      chip: 'rounded-full',
      glow: false,
    },
  },
  {
    id: 'comando',
    nome: 'Comando',
    sub: 'Mega-menu no topo',
    descricao: 'Navegação por grandes categorias no topo, cantos retos, visual "cmd center".',
    nav: 'topo',
    home: 'sinopse',
    vibe: 'Nítido',
    style: {
      radius: 6,
      radiusSm: 4,
      shadow: '0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(79,70,229,0.06)',
      sidebarBg: 'linear-gradient(180deg, #111827 0%, #1e1b4b 100%)',
      sidebarActive: 'rgba(224,231,255,1)',
      chip: 'rounded-md',
      glow: false,
    },
  },
  {
    id: 'moderno',
    nome: 'Moderno',
    sub: 'Bento-grid + donut',
    descricao: 'Home em grade assimétrica (bento) com donut, radial e barras empilhadas.',
    nav: 'sidebar',
    home: 'bento',
    vibe: 'Contemporâneo',
    style: {
      radius: 20,
      radiusSm: 12,
      shadow: '0 6px 24px -6px rgba(5,150,105,0.14), 0 2px 6px rgba(15,23,42,0.04)',
      sidebarBg: 'linear-gradient(180deg, #022c22 0%, #0f172a 100%)',
      sidebarActive: 'rgba(209,250,229,1)',
      chip: 'rounded-full',
      glow: false,
    },
  },
  {
    id: 'neon',
    nome: 'Neon Ops',
    sub: 'Escuro + brilhos',
    descricao: 'Tema escuro dramático, barras empilhadas, medidores radiais e brilho neon.',
    nav: 'topo',
    home: 'bento',
    vibe: 'Elétrico',
    style: {
      radius: 10,
      radiusSm: 6,
      shadow: '0 0 0 1px rgba(16,185,129,0.15), 0 8px 30px -8px rgba(16,185,129,0.35)',
      sidebarBg: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
      sidebarActive: 'rgba(16,185,129,0.15)',
      chip: 'rounded-lg',
      glow: true,
      darkDefault: true,
    },
  },
];

export const MODO_PADRAO = 'classico';

export function getModo(id) {
  return MODOS.find(m => m.id === id) ?? MODOS[0];
}
