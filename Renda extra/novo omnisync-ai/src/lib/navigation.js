// ============================================
// navigation.js — fonte única de navegação.
// Mantém as seções do menu, o mapa rota->seção e um
// helper para o cabeçalho/breadcrumb de cada página.
// ============================================

import {
  Activity,
  AlertTriangle,
  Barcode,
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
  ListTodo,
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

// ---------- Estrutura da sidebar ----------
// Seções -> itens -> ícone + rota.
// Seções espelham a operação de marketplace:
// Principal, Cadastros, Marketplaces, Dados,
// Finanças e Configurações.
const NAV_SECTIONS = [
  {
    titulo: 'Principal',
    itens: [
      { nome: 'Dashboard', rota: '/dashboard', Icone: LayoutDashboard },
      { nome: 'Tarefas', rota: '/tarefas', Icone: ListTodo },
      { nome: 'Central de IA', rota: '/central-ia', Icone: Bot, destaque: true },
      { nome: 'Atividade', rota: '/atividade', Icone: Activity },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { nome: 'Produtos', rota: '/produtos', Icone: Package },
      { nome: 'Estoque', rota: '/estoque', Icone: Boxes },
      { nome: 'Compras', rota: '/compras', Icone: ShoppingBag },
      { nome: 'Fornecedores', rota: '/fornecedores', Icone: Factory },
      { nome: 'Gerador de EAN', rota: '/ean', Icone: Barcode },
      { nome: 'Clientes / CRM', rota: '/clientes', Icone: Users },
      { nome: 'Logística', rota: '/logistica', Icone: Truck },
    ],
  },
  {
    titulo: 'Marketplaces',
    itens: [
      { nome: 'Integrações', rota: '/integracao', Icone: Plug },
      { nome: 'Vendas', rota: '/vendas', Icone: TrendingUp },
      { nome: 'Pedidos', rota: '/pedidos', Icone: ShoppingCart },
      { nome: 'Publicações', rota: '/publicacoes', Icone: Send },
      { nome: 'Marketing', rota: '/marketing', Icone: Tag },
      { nome: 'Conteúdo IA', rota: '/conteudo-ia', Icone: Sparkles },
      { nome: 'Calendário', rota: '/calendario', Icone: Calendar },
    ],
  },
  {
    titulo: 'Dados',
    itens: [
      { nome: 'Radar de Mercado', rota: '/radar-mercado', Icone: Radar },
      { nome: 'Laboratório de Oportunidades', rota: '/laboratorio-oportunidades', Icone: FlaskConical },
      { nome: 'Inteligência do Produto', rota: '/produto-intel', Icone: PackageSearch },
      { nome: 'Simulador de Negócio', rota: '/simulador', Icone: Calculator },
      { nome: 'Central de B.O.', rota: '/central-bo', Icone: AlertTriangle },
    ],
  },
  {
    titulo: 'Finanças',
    itens: [
      { nome: 'Financeiro', rota: '/financeiro', Icone: Wallet },
      { nome: 'Fiscal', rota: '/fiscal', Icone: FileText },
      { nome: 'Metas', rota: '/metas', Icone: Target },
      { nome: 'Relatórios', rota: '/relatorios', Icone: PieChart },
      { nome: 'Painel do Diretor', rota: '/diretor', Icone: Crown },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [
      { nome: 'Comece por aqui', rota: '/onboarding', Icone: Rocket },
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
