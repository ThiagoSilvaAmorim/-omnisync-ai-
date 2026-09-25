// ============================================
// permissoes.js — matriz canônica de perfis do OmniSync AI.
// Perfis oficiais: Diretor, Comercial e Estoquista.
// Os rótulos legados (Admin, Operador, Visualizador,
// Usuario) são normalizados para não quebrar
// sessões e telas já existentes.
// ============================================

export const PERFIS = ['Diretor', 'Comercial', 'Estoquista'];

// Equivalências legadas -> perfil canônico.
const LEGADO_PARA_CANONICO = {
  Admin: 'Diretor',
  Diretor: 'Diretor',
  Operador: 'Comercial',
  Comercial: 'Comercial',
  Estoquista: 'Estoquista',
  Visualizador: 'Comercial',
  Usuario: 'Comercial',
};

export function normalizarPerfil(perfil) {
  if (!perfil) return 'Comercial';
  const chave = String(perfil).trim();
  return LEGADO_PARA_CANONICO[chave] || 'Comercial';
}

// Módulos por perfil (chaves = segmentos da rota). O Diretor acessa tudo.
// Comercial: frente de vendas e marketing. Estoquista: cadeia de suprimento.
const MATRIZ_ACESSO = {
  Diretor: ['*'],
  Comercial: ['dashboard', 'vendas', 'pedidos', 'clientes', 'marketing', 'publicacoes', 'conteudo-ia', 'calendario', 'relatorios', 'atividade'],
  Estoquista: ['dashboard', 'produtos', 'produto-intel', 'estoque', 'compras', 'fornecedores', 'logistica', 'relatorios', 'atividade', 'ean'],
};

// Rotas sensíveis exclusivas da direção (mesmo Comercial/Estoquista não entram).
const MODULOS_DIRECAO = ['diretor', 'metas', 'seguranca', 'empresa', 'financeiro', 'fiscal', 'central-ia', 'central-bo', 'tarefas', 'simulador', 'radar-mercado', 'analise-mercado', 'laboratorio-oportunidades', 'integracoes', 'integracao', 'configuracoes', 'ads'];

export function podeAcessar(perfil, modulo) {
  const canonico = normalizarPerfil(perfil);
  if (canonico === 'Diretor') return true;
  // Exceções personalizadas (editor de RBAC em Segurança), por perfil.
  try {
    const raw = localStorage.getItem('nexora-rbac');
    if (raw) {
      const ex = JSON.parse(raw)[canonico];
      if (ex && Object.prototype.hasOwnProperty.call(ex, modulo)) return !!ex[modulo];
    }
  } catch { /* sem exceções */ }
  if (MODULOS_DIRECAO.includes(modulo)) return false;
  const permissoes = MATRIZ_ACESSO[canonico] || [];
  return permissoes.includes(modulo);
}

// Módulos editáveis no RBAC personalizado (segmentos de rota).
export const MODULOS_EDITAVEIS = [
  'dashboard', 'vendas', 'pedidos', 'clientes', 'produtos', 'estoque',
  'compras', 'fornecedores', 'logistica', 'financeiro', 'fiscal',
  'marketing', 'relatorios', 'atividade', 'ean',
];

// Atalho usado nas telas exclusivas da direção.
export function ehDiretor(user) {
  return normalizarPerfil(user?.perfil) === 'Diretor';
}
