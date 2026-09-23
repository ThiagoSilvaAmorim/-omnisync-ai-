import { describe, it, expect } from 'vitest';
import { agruparPorCampo, topVendidos, topAvaliados, menorPreco } from '../lib/radarAgregacoes';

const ITENS = [
  { id: '1', nome: 'A', preco: 100, marca: 'Loja X', categoria: 'Eletrônicos', avaliacao: 4.5, vendidos: 50 },
  { id: '2', nome: 'B', preco: 200, marca: 'Loja X', categoria: 'Eletrônicos', avaliacao: 4.8, vendidos: 150 },
  { id: '3', nome: 'C', preco: null, marca: '', categoria: 'Moda', avaliacao: null, vendidos: null },
  { id: '4', nome: 'D', preco: 50, marca: 'Loja Y', categoria: 'Moda', avaliacao: 3.9, vendidos: 10 },
];

describe('radarAgregacoes (puro)', () => {
  it('agrupa vendedores com qtd, preço médio e vendidos', () => {
    const g = agruparPorCampo(ITENS, 'marca');
    const x = g.find(v => v.chave === 'Loja X');
    expect(x.qtd).toBe(2);
    expect(x.precoMedio).toBe(150);
    expect(x.vendidosTotal).toBe(200);
    expect(g.find(v => v.chave === 'Sem informação')).toBeTruthy();
  });

  it('agrupa categorias', () => {
    const g = agruparPorCampo(ITENS, 'categoria');
    expect(g.find(v => v.chave === 'Moda').qtd).toBe(2);
  });

  it('top vendidos ignora nulos', () => {
    const t = topVendidos(ITENS);
    expect(t.map(p => p.id)).toEqual(['2', '1', '4']);
  });

  it('top avaliados e menor preço ignoram nulos', () => {
    expect(topAvaliados(ITENS).map(p => p.id)).toEqual(['2', '1', '4']);
    expect(menorPreco(ITENS).map(p => p.id)).toEqual(['4', '1', '2']);
  });
});
