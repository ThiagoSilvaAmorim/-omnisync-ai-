import { describe, it, expect, vi } from 'vitest';
import { vendasDoMes, baixoEstoque, promocoesVencendo, resumoFinanceiro, parseDataLoja } from '../lib/assistenteRespostas';

function apiMock(sobrescrita = {}) {
  return {
    getPedidos: vi.fn(async () => []),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
    getCupons: vi.fn(async () => []),
    getTransacoes: vi.fn(async () => []),
    ...sobrescrita,
  };
}

function mesCorrenteISO(dia = 10) {
  const agora = new Date();
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  return `${agora.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}`;
}

describe('assistenteRespostas (dados reais)', () => {
  it('parseDataLoja aceita dd/mm/aaaa e aaaa-mm-dd', () => {
    expect(parseDataLoja('23/09/2026')?.getDate()).toBe(23);
    expect(parseDataLoja('2026-09-23')?.getDate()).toBe(23);
    expect(parseDataLoja('invalida')).toBe(null);
  });

  it('vendas do mês soma pedidos reais', async () => {
    const api = apiMock({
      getPedidos: vi.fn(async () => [
        { id: 'P1', total: 100, data: mesCorrenteISO(5) },
        { id: 'P2', total: 250, data: mesCorrenteISO(12) },
        { id: 'P0', total: 9999, data: '2020-01-01' },
      ]),
    });
    const r = await vendasDoMes(api);
    expect(r).toContain('2 venda(s)');
    expect(r).toContain('R$ 350,00');
  });

  it('sem vendas no mês responde honestamente', async () => {
    const r = await vendasDoMes(apiMock());
    expect(r).toContain('ainda não tem vendas');
  });

  it('baixo estoque lista críticos reais', async () => {
    const api = apiMock({
      getProdutos: vi.fn(async () => ({ produtos: [
        { id: 1, nome: 'Fone', estoque: 2, minimo: 10 },
        { id: 2, nome: 'Capa', estoque: 50, minimo: 10 },
      ] })),
    });
    const r = await baixoEstoque(api);
    expect(r).toContain('Fone');
    expect(r).not.toContain('Capa');
  });

  it('promoções vencendo filtra por validade real', async () => {
    const daqui20 = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const iso = daqui20.toISOString().slice(0, 10);
    const api = apiMock({
      getCupons: vi.fn(async () => [
        { codigo: 'VENCE', ativo: true, validade: iso },
        { codigo: 'SEMDATA', ativo: true, validade: '' },
      ]),
    });
    const r = await promocoesVencendo(api);
    expect(r).toContain('VENCE');
    expect(r).not.toContain('SEMDATA');
  });

  it('resumo financeiro calcula de transações reais', async () => {
    const api = apiMock({
      getTransacoes: vi.fn(async () => [
        { valor: 1000 }, { valor: -400 },
      ]),
    });
    const r = await resumoFinanceiro(api);
    expect(r).toContain('R$ 1.000,00');
    expect(r).toContain('R$ 600,00');
  });

  it('falha de API vira mensagem honesta', async () => {
    const api = apiMock({ getPedidos: vi.fn(async () => { throw new Error('down'); }) });
    expect(await vendasDoMes(api)).toContain('Não consegui');
  });
});
