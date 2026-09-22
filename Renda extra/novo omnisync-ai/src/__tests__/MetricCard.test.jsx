import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from '../components/ui/MetricCard';

describe('MetricCard', () => {
  it('renderiza o rótulo do indicador', () => {
    render(<MetricCard label="Faturamento" value={248540} delta={12.4} format="currency" />);
    expect(screen.getByText('Faturamento')).toBeInTheDocument();
  });

  it('exibe delta negativo em vermelho', () => {
    const { container } = render(
      <MetricCard label="Capital parado" value={31200} delta={-6.8} format="currency" />
    );
    expect(container.querySelector('.text-red-500')).toBeInTheDocument();
  });

  it('exibe delta positivo em teal', () => {
    const { container } = render(
      <MetricCard label="Pedidos" value={1284} delta={8.7} format="number" />
    );
    expect(container.querySelector('.text-teal-600')).toBeInTheDocument();
  });

  it.each([null, undefined, NaN])('delta %s exibe Sem histórico, nunca NaN', (delta) => {
    const { container } = render(
      <MetricCard label="Faturamento" value={0} delta={delta} format="currency" />
    );
    expect(screen.getByText('Sem histórico')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });
});
