// ============================================
// navigation.js — fonte única de navegação.
// Mantém as seções do menu, o mapa rota->seção e um
// helper para o cabeçalho/breadcrumb de cada página.
// ============================================

import {
  Activity,
  AlertTriangle,
  Bot,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  Crown,
  Factory,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Package,
  PackageSearch,
  PieChart,
  Plug,
  Radar,
  Send,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

// ---------- Estrutura da sidebar ----------
// Seções -> itens -> ícone + rota.
const NAV_SECTIONS = [
  {
    titulo: 'Diretoria',
    itens: [
      { nome: 'Painel do Diretor', rota: '/diretor', Icone: Crown },
      { nome: 'Metas', rota: '/metas', Icone: Target },
      { nome: 'Relatórios', rota: '/relatorios', Icone: PieChart },
      { nome: 'Atividade', rota: '/atividade', Icone: Activity },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { nome: 'Dashboard', rota: '/dashboard', Icone: LayoutDashboard },
      { nome: 'Vendas', rota: '/vendas', Icone: TrendingUp },
      { nome: 'Pedidos', rota: '/pedidos', Icone: ShoppingCart },
      { nome: 'Produtos', rota: '/produtos', Icone: Package },
      { nome: 'Estoque', rota: '/estoque', Icone: Boxes },
      { nome: 'Compras', rota: '/compras', Icone: ShoppingBag },
      { nome: 'Fornecedores', rota: '/fornecedores', Icone: Factory },
      { nome: 'Clientes / CRM', rota: '/clientes', Icone: Users },
      { nome: 'Financeiro', rota: '/financeiro', Icone: Wallet },
      { nome: 'Fiscal', rota: '/fiscal', Icone: FileText },
      { nome: 'Logística', rota: '/logistica', Icone: Truck },
      { nome: 'Central de B.O.', rota: '/central-bo', Icone: AlertTriangle },
    ],
  },
  {
    titulo: 'Inteligência',
    itens: [
      { nome: 'Inteligência do Produto', rota: '/produto-intel', Icone: PackageSearch },
      { nome: 'Radar de Mercado', rota: '/radar-mercado', Icone: Radar },
      { nome: 'Laboratório de Oportunidades', rota: '/laboratorio-oportunidades', Icone: FlaskConical },
      { nome: 'Simulador de Negócio', rota: '/simulador', Icone: Calculator },
      { nome: 'Central de IA', rota: '/central-ia', Icone: Bot, destaque: true },
    ],
  },
  {
    titulo: 'Marketing & Social',
    itens: [
      { nome: 'Central de Publicações', rota: '/publicacoes', Icone: Send },
      { nome: 'Calendário', rota: '/calendario', Icone: Calendar },
      { nome: 'Conteúdo IA', rota: '/conteudo-ia', Icone: Sparkles },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [
      { nome: 'Integrações', rota: '/integracao', Icone: Plug },
      { nome: 'Segurança', rota: '/seguranca', Icone: Shield },
      { nome: 'Usuários', rota: '/usuarios', Icone: UserCog },
      { nome: 'Empresa', rota: '/empresa', Icone: Building2 },
    ],
  },
];

export const SECTIONS = NAV_SECTIONS;

/** Mapa rota-base -> seção (para breadcrumb e agrupamento). */
export const SECAO_POR_ROTA = (() => {
  const map = {};
  NAV_SECTIONS.forEach(secao => {
    secao.itens.forEach(item => {
      map[item.rota] = secao.titulo;
    });
  });
  return map;
})();

/** Lista achatada de itens (rota -> { nome, Icone, secao }). */
const ITENS = NAV_SECTIONS.flatMap(secao =>
  secao.itens.map(item => ({ ...item, secao: secao.titulo }))
);

/**
 * Retorna os metadados de uma rota (para o cabeçalho da página):
 * { nome, Icone, secao }. Ignora IDs dinâmicos (/x/123 -> /x).
 */
export function getPageMeta(path) {
  const base = path.split('/').slice(0, 2).join('/');
  const item = ITENS.find(i => i.rota === base) || ITENS.find(i => i.rota === path);
  return {
    nome: item?.nome || 'Página',
    Icone: item?.Icone || LayoutDashboard,
    secao: item?.secao || '',
  };
}
