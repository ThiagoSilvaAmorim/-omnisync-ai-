// ============================================
// utils — helpers compartilhados
// ============================================

// Junta classes condicionais, ignorando valores falsos.
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Formata um valor numérico conforme o tipo do KPI (seguro — trata null/undefined/NaN).
export function formatValue(value, format) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) {
    if (format === 'currency') return 'R$ 0,00';
    return '0';
  }
  if (format === 'currency') {
    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  return number.toLocaleString('pt-BR');
}

// Formata um número para display (sem símbolo de moeda).
export function formatNumber(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('pt-BR');
}

// Formata valores numéricos conforme o tipo do KPI (seguro — trata null/undefined/NaN).
export function formatCurrency(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return 'R$ 0,00';
  return number.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
}

export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0,0%';
  return `${number.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

// Percentual seguro: retorna null se houver divisão por zero ou valores inválidos.
export function safePercent(current, previous) {
  const a = Number(current ?? 0);
  const b = Number(previous ?? 0);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return null;
  }
  return ((a - b) / Math.abs(b)) * 100;
}

// Delta válido para exibição: null/undefined/''/NaN/Infinity são inválidos.
// (Number(null) === 0, por isso o nulo precisa ser rejeitado antes.)
export function isValidDelta(delta) {
  if (delta === null || delta === undefined || delta === '') return false;
  return Number.isFinite(Number(delta));
}

// Variação percentual segura para exibição ("+10,0%", "-10,0%" ou "—").
// Nunca retorna NaN/Infinity/undefined: base zero, nula ou inexistente vira "—".
export function formatVariation(current, previous) {
  const a = Number(current);
  const b = Number(previous);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return '—';
  }
  const variation = ((a - b) / Math.abs(b)) * 100;
  if (!Number.isFinite(variation)) return '—';
  return `${variation >= 0 ? '+' : ''}${variation.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

// Formata uma data em string formatada.
export function formatDate(date) {
  if (!date) return '--';
  return new Date(date).toLocaleString('pt-BR');
}

// Dispara o download de um arquivo de texto no navegador.
export function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(v) {
  const s = String(v ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

// Exporta um array de objetos como CSV (separador ';', BOM UTF-8).
export function exportarCsv(nomeArquivo, colunas, linhas) {
  const cabecalho = colunas.map(c => csvCell(c.titulo)).join(';');
  const corpo = linhas.map(l => colunas.map(c => csvCell(l[c.chave] ?? '')).join(';')).join('\r\n');
  const conteudo = '\uFEFF' + [cabecalho, corpo].join('\r\n');
  downloadFile(nomeArquivo, conteudo, 'text/csv;charset=utf-8;');
}

// Debounce simples de valor (ex.: campo de busca → GET local).
export function debounce(fn, waitMs = 400) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

// Link OSM público (sem chave) a partir de lat/lng ou texto de busca.
export function openStreetMapUrl({ lat, lng, query } = {}) {
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.openstreetmap.org/?mlat=${Number(lat)}&mlon=${Number(lng)}#map=16/${Number(lat)}/${Number(lng)}`;
  }
  if (query) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  }
  return null;
}
