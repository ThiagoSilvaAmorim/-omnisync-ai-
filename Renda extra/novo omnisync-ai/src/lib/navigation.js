// ============================================
// navigation.js — fonte única de navegação.
// Hierarquia curta (referência SNV): Principal,
// Operação, Fornecimento, Inteligência, Finanças,
// Integrações e Configurações.
// ============================================

import {
  Activity,
  AlertTriangle,
  AppWindow,
  Barcode,
  Bot,
  Boxes,
  Building2,
  Calculator,
  Calendar,
  ChevronDown,
  Crown,
  Factory,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Package,
  PackageSearch,
  PieChart,
  Plug,
  Radar,
  Rocket,
  Send,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';

// ---------- Seções da sidebar ----------
// Cada seção tem ícone (modo colapsado), título e itens.
const NAV_SECTIONS = [
  {
    titulo: 'Principal',
    Icone: LayoutDashboard,
    itens: [
      { nome: 'Dashboard', rota: '/dashboard', Icone: LayoutDashboard },
      { nome: 'Tarefas', rota: '/tarefas', Icone: ListTodo },
      { nome: 'Central de IA', rota: '/central-ia', Icone: Bot, destaque: true },
      { nome: 'Atividade', rota: '/atividade', Icone: Activity },
    ],
  },
  {
    titulo: 'Operação',
    Icone: ShoppingCart,
    itens: [
      { nome: 'Pedidos', rota: '/pedidos', Icone: ShoppingCart },
      { nome: 'Vendas', rota: '/vendas', Icone: TrendingUp },
      { nome: 'Produtos', rota: '/produtos', Icone: Package },
      { nome: 'Estoque', rota: '/estoque', Icone: Boxes },
      { nome: 'Publicações', rota: '/publicacoes', Icone: Send },
      { nome: 'Marketing', rota: '/marketing', Icone: Tag },
      { nome: 'Conteúdo IA', rota: '/conteudo-ia', Icone: Sparkles },
      { nome: 'Logística', rota: '/logistica', Icone: Truck },
      { nome: 'Calendário', rota: '/calendario', Icone: Calendar },
      { nome: 'Clientes / CRM', rota: '/clientes', Icone: Users },
      { nome: 'Gerador de EAN', rota: '/ean', Icone: Barcode },
    ],
  },
  {
    titulo: 'Fornecimento',
    Icone: Factory,
    itens: [
      { nome: 'Fornecedores', rota: '/fornecedores', Icone: Factory },
      { nome: 'Compras', rota: '/compras', Icone: ShoppingBag },
    ],
  },
  {
    titulo: 'Inteligência',
    Icone: Radar,
    itens: [
      { nome: 'Radar de Mercado', rota: '/radar-mercado', Icone: Radar },
      { nome: 'Análise de Mercado', rota: '/analise-mercado', Icone: PackageSearch },
      { nome: 'Laboratório de Oportunidades', rota: '/laboratorio-oportunidades', Icone: FlaskConical },
      { nome: 'Inteligência do Produto', rota: '/produto-intel', Icone: PackageSearch },
      { nome: 'Simulador de Negócio', rota: '/simulador', Icone: Calculator },
      { nome: 'ADS', rota: '/ads', Icone: Megaphone },
      { nome: 'Central de B.O.', rota: '/central-bo', Icone: AlertTriangle },
    ],
  },
  {
    titulo: 'Finanças',
    Icone: Wallet,
    itens: [
      { nome: 'Financeiro', rota: '/financeiro', Icone: Wallet },
      { nome: 'Fiscal', rota: '/fiscal', Icone: FileText },
      { nome: 'Metas', rota: '/metas', Icone: Target },
      { nome: 'Relatórios', rota: '/relatorios', Icone: PieChart },
      { nome: 'Painel do Diretor', rota: '/diretor', Icone: Crown },
    ],
  },
  {
    titulo: 'Integrações',
    Icone: Plug,
    itens: [
      { nome: 'Integrações', rota: '/integracao', Icone: Plug },
      { nome: 'Conexões (ML/Shopee)', rota: '/integrations', Icone: Plug },
    ],
  },
  {
    titulo: 'Configurações',
    Icone: Shield,
    itens: [
      { nome: 'Comece por aqui', rota: '/onboarding', Icone: Rocket },
      { nome: 'Segurança', rota: '/seguranca', Icone: Shield },
      { nome: 'Usuários', rota: '/usuarios', Icone: UserCog },
      { nome: 'Empresa', rota: '/empresa', Icone: Building2 },
    ],
  },
];

export const SECTIONS = NAV_SECTIONS;
export { ChevronDown, AppWindow };

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
