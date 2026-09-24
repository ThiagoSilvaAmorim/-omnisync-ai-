// ============================================
// navigationBeta.js — PRÉVIA da navegação com
// 6 itens (não vai para produção sem aprovação).
// Reaproveita as rotas atuais; só reagrupa o
// menu para avaliar a organização. Ativada pelo
// interruptor "Testar novo menu" na Sidebar.
// ============================================

import {
  Bot,
  Factory,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
} from 'lucide-react';

export const BETA_SECTIONS = [
  {
    titulo: 'Menu principal (prévia)',
    itens: [
      { nome: 'Dashboard', rota: '/dashboard', Icone: LayoutDashboard },
      { nome: 'Pedidos', rota: '/pedidos', Icone: ShoppingCart },
      { nome: 'Produtos', rota: '/produtos', Icone: Package },
      { nome: 'Fornecedores', rota: '/fornecedores', Icone: Factory },
      { nome: 'IA & Automação', rota: '/ia-automacao', Icone: Bot, destaque: true },
      { nome: 'Configurações', rota: '/configuracoes-hub', Icone: Settings },
    ],
  },
];

const CHAVE = 'nexora-menu-beta';

export function menuBetaAtivo() {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

export function alternarMenuBeta() {
  try {
    const proximo = !menuBetaAtivo();
    localStorage.setItem(CHAVE, proximo ? '1' : '0');
    return proximo;
  } catch {
    return false;
  }
}
