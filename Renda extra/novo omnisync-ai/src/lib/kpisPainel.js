import { formatNumber } from './utils';

// ============================================
// kpisPainel — FONTE ÚNICA de status de estoque e
// de KPIs exibidos nos painéis de Produtos e
// Integrações.
//
// Regras de status de estoque (derivadas de
// estoque/minimo — NUNCA do campo `status` do
// backend, que é status de publicação: ativo/inativo):
//   minimo > 0: critico  = atual <= minimo
//               baixo    = atual <= 2 x minimo
//               excesso  = atual >= 4 x minimo
//               normal   = demais casos
//   minimo = 0: critico  = atual <= 0 (ruptura)
//               normal   = demais casos
// Dados que já trazem status de estoque explícito
// (mock local: normal/baixo/critico/excesso) são
// respeitados sem rederivação.
//
// Vermeelho nos cards só quando o valor é realmente
// problemático (nunca para zeros neutros).
// ============================================

const STATUS_ESTOQUE_VALIDOS = ['normal', 'baixo', 'critico', 'excesso'];

export function statusEstoque(p) {
  if (STATUS_ESTOQUE_VALIDOS.includes(p?.status)) return p.status;
  const atual = Math.max(0, Number(p?.estoque ?? p?.atual ?? 0) || 0);
  const minimo = Math.max(0, Number(p?.minimo ?? 0) || 0);
  if (minimo > 0) {
    if (atual <= minimo) return 'critico';
    if (atual <= minimo * 2) return 'baixo';
    if (atual >= minimo * 4) return 'excesso';
    return 'normal';
  }
  if (atual <= 0) return 'critico';
  return 'normal';
}

export function contarPorStatus(lista) {
  const contagem = { normal: 0, baixo: 0, critico: 0, excesso: 0 };
  for (const p of lista || []) {
    const s = statusEstoque(p);
    if (s in contagem) contagem[s] += 1;
  }
  return contagem;
}

export function calcularKpisProdutos(lista) {
  const itens = lista || [];
  const contagem = contarPorStatus(itens);
  return {
    totalItens: itens.length,
    valorTotal: itens.reduce((a, p) => a + (Number(p.preco) || 0) * (Number(p.estoque ?? p.atual ?? 0) || 0), 0),
    itensBaixoEstoque: contagem.baixo,
    produtosCriticos: contagem.critico,
  };
}

// Cards de KPI de Produtos — vermelho só se problema real.
export function cardsProdutos(kpis) {
  const k = kpis || {};
  const baixos = Number(k.itensBaixoEstoque ?? 0);
  const criticos = Number(k.produtosCriticos ?? 0);
  return [
    { label: 'Total de Itens', valor: Number(k.totalItens ?? 0), destaque: false },
    { label: 'Valor Total em Estoque', valor: `R$ ${formatNumber(Number(k.valorTotal ?? 0))}`, destaque: false },
    { label: 'Itens com Estoque Baixo', valor: baixos, destaque: baixos > 0 },
    { label: 'Produtos Críticos', valor: criticos, destaque: criticos > 0 },
  ];
}

// Cards de KPI de Integrações — vermelho só se problema real:
// ativas === 0 (nada conectado) ou pendências > 0.
export function cardsIntegracao(kpis) {
  const k = kpis || {};
  const ativas = Number(k.integracaoAtiva ?? 0);
  const pendencias = Number(k.pending ?? 0);
  return [
    { label: 'Integrações ativas', valor: ativas, destaque: ativas === 0 },
    { label: 'Total de envios', valor: k.totalEnvios ?? '—', destaque: false },
    { label: 'Taxa de sucesso', valor: k.taxaSucesso == null ? '—' : `${k.taxaSucesso}%`, destaque: false },
    { label: 'Pendências', valor: pendencias, destaque: pendencias > 0 },
  ];
}
