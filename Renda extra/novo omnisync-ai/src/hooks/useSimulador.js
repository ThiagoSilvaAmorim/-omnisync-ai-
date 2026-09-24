import { useMemo } from 'react';

// ============================================
// useSimulador — calcula os resultados do
// Simulador de Negócio a partir dos inputs.
// Fórmulas (por unidade):
//   lucro = preço − custo − frete − impostos − taxa
//   (impostos e taxa convertidos de % para valor)
// ============================================
export function calcularSimulador({ custo, frete, impostos, taxa, preco, quantidade }) {
  const custoUnitario = custo + frete;
  const impostosValor = (preco * impostos) / 100;
  const taxaValor = (preco * taxa) / 100;

  const lucroUnitario = preco - custoUnitario - impostosValor - taxaValor;
  const lucroTotal = lucroUnitario * quantidade;
  const roi = custoUnitario > 0 ? (lucroUnitario / custoUnitario) * 100 : 0;
  const margem = preco > 0 ? (lucroUnitario / preco) * 100 : 0;
  // Unidades necessárias para recuperar o custo total investido.
  const pontoEquilibrio = lucroUnitario > 0 ? Math.ceil((custoUnitario * quantidade) / lucroUnitario) : null;

  return { custoUnitario, impostosValor, taxaValor, lucroUnitario, lucroTotal, roi, margem, pontoEquilibrio };
}

export function useSimulador({ custo, frete, impostos, taxa, preco, quantidade }) {
  return useMemo(
    () => calcularSimulador({ custo, frete, impostos, taxa, preco, quantidade }),
    [custo, frete, impostos, taxa, preco, quantidade]
  );
}
