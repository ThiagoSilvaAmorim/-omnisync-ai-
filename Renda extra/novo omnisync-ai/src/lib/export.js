import {
  executivoKpis,
  executivoSerie,
  funilCrm,
  getDashboardKpis,
  getFaturamentoSerie,
  getPeriodoLabel,
  getVendasPorCanal,
  operacionalKpis,
  operacionalSerie,
  pedidosPorArmazem,
} from '../data/mockData';

// ============================================
// export.js — impressão e exportação do painel.
// Exportar Excel gera um CSV (compatível com o
// Excel pt-BR via separador ';' e BOM UTF-8).
// Imprimir/PDF usam window.print() com CSS de
// impressão que oculta sidebar/header.
// ============================================

// Escapa uma célula CSV quando necessário.
function csvCell(value) {
  const s = String(value ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Converte uma matriz de linhas em texto CSV.
function toCsv(rows) {
  return rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}

// Dispara o download de um arquivo no navegador.
function download(filename, content, mime) {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Retorna os dados do painel ativo (para o CSV).
function getDadosPainel(painel, period, customRange) {
  const periodoLabel = getPeriodoLabel(period, customRange);
  if (painel === 'operacional') {
    return {
      titulo: 'Dashboard Operacional (Estoque & Logística)',
      periodoLabel,
      kpis: operacionalKpis,
      serie: operacionalSerie,
      barras: pedidosPorArmazem,
      barrasTitulo: 'Pedidos por armazém',
      barrasX: 'armazem',
    };
  }
  if (painel === 'executivo') {
    return {
      titulo: 'Dashboard Executivo (Financeiro & CRM)',
      periodoLabel,
      kpis: executivoKpis,
      serie: executivoSerie,
      barras: funilCrm,
      barrasTitulo: 'Funil de CRM',
      barrasX: 'canal',
    };
  }
  return {
    titulo: 'Dashboard Comercial (Vendas & Faturamento)',
    periodoLabel,
    kpis: getDashboardKpis(period, customRange),
    serie: getFaturamentoSerie(period, customRange),
    barras: getVendasPorCanal(period, customRange),
    barrasTitulo: 'Vendas por canal',
    barrasX: 'canal',
  };
}

// Exporta o painel ativo como arquivo .csv.
export function exportarExcel(painel, period, customRange = null) {
  const d = getDadosPainel(painel, period, customRange);

  const rows = [
    [`OmniSync AI — ${d.titulo}`],
    d.periodoLabel ? [`Período: ${d.periodoLabel}`] : [],
    [],
    ['Indicador', 'Valor', 'Variação (%)'],
    ...d.kpis.map(k => [k.label, k.value, k.delta]),
    [],
    [d.barrasTitulo],
    ['Item', 'Valor'],
    ...d.barras.map(b => [b[d.barrasX], b.valor]),
    [],
    ['Série histórica'],
    ['Data', 'Valor'],
    ...d.serie.map(s => [s.data, s.valor]),
  ];

  download(`omnisync-${painel}-${period}.csv`, toCsv(rows), 'text/csv;charset=utf-8;');
}

// Abre a janela de impressão otimizada da tela.
export function imprimir() {
  window.print();
}

// Abre a impressão para salvar o relatório em PDF
// (o navegador oferece "Salvar como PDF").
export function exportarPdf() {
  window.print();
}
