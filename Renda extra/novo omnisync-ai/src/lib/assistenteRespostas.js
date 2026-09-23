// ============================================
// assistenteRespostas.js — respostas do assistente
// a partir de DADOS REAIS do backend (nunca
// inventados). Cada função recebe o objeto `api`
// e devolve texto pronto em pt-BR. Falha de
// consulta vira mensagem honesta, não chute.
// ============================================

function brl(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aceita 'dd/mm/aaaa' e 'aaaa-mm-dd'; resto => null.
export function parseDataLoja(s) {
  if (!s || typeof s !== 'string') return null;
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return null;
}

function ehDoMesCorrente(dataStr) {
  const d = parseDataLoja(dataStr);
  if (!d || Number.isNaN(d.getTime())) return false;
  const agora = new Date();
  return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
}

export async function vendasDoMes(api) {
  try {
    const lista = await api.getPedidos();
    const arr = Array.isArray(lista) ? lista : [];
    const mes = arr.filter(p => ehDoMesCorrente(p.data));
    if (mes.length === 0) return 'Você ainda não tem vendas registradas neste mês.';
    const total = mes.reduce((a, p) => a + (Number(p.total) || 0), 0);
    return `Neste mês você fez ${mes.length} venda(s), totalizando ${brl(total)}.`;
  } catch {
    return 'Não consegui consultar suas vendas agora. Tente novamente em instantes.';
  }
}

export async function baixoEstoque(api) {
  try {
    const data = await api.getProdutos({ limit: 100 });
    const lista = data?.produtos || [];
    const criticos = lista
      .map(p => ({ nome: p.nome, estoque: Number(p.estoque ?? p.atual) || 0, minimo: Number(p.minimo) || 0 }))
      .filter(p => p.minimo > 0 && p.estoque < p.minimo)
      .sort((a, b) => (a.estoque / a.minimo) - (b.estoque / b.minimo))
      .slice(0, 5);
    if (criticos.length === 0) return 'Nenhum produto com estoque abaixo do mínimo. Tudo sob controle.';
    const linhas = criticos.map(c => `• ${c.nome} (estoque ${c.estoque}, mínimo ${c.minimo})`).join('\n');
    return `Produtos com baixo estoque:\n${linhas}`;
  } catch {
    return 'Não consegui consultar seu estoque agora. Tente novamente em instantes.';
  }
}

export async function promocoesVencendo(api) {
  try {
    const lista = await api.getCupons();
    const arr = Array.isArray(lista) ? lista : [];
    const ativos = arr.filter(c => c.ativo);
    if (ativos.length === 0) return 'Você não tem cupons ativos no momento.';
    const agora = new Date();
    const limite = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
    const vencendo = ativos
      .map(c => ({ codigo: c.codigo, validade: parseDataLoja(c.validade) }))
      .filter(c => c.validade && c.validade >= agora && c.validade <= limite);
    if (vencendo.length === 0) {
      return `Você tem ${ativos.length} cupom(ns) ativo(s) e nenhum com validade nos próximos 30 dias.`;
    }
    const linhas = vencendo.map(c => `• ${c.codigo} (vence em ${c.validade.toLocaleDateString('pt-BR')})`).join('\n');
    return `Promoções prestes a vencer:\n${linhas}`;
  } catch {
    return 'Não consegui consultar suas promoções agora. Tente novamente em instantes.';
  }
}

export async function resumoFinanceiro(api) {
  try {
    const lista = await api.getTransacoes();
    const arr = Array.isArray(lista) ? lista : [];
    if (arr.length === 0) return 'Ainda não há movimentações financeiras registradas.';
    const receita = arr.filter(t => Number(t.valor) > 0).reduce((a, t) => a + Number(t.valor), 0);
    const despesa = Math.abs(arr.filter(t => Number(t.valor) < 0).reduce((a, t) => a + Number(t.valor), 0));
    const lucro = receita - despesa;
    return `Resumo financeiro: receita ${brl(receita)}, despesas ${brl(despesa)}, lucro ${brl(lucro)}.`;
  } catch {
    return 'Não consegui consultar seu financeiro agora. Tente novamente em instantes.';
  }
}
