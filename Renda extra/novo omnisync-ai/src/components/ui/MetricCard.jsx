import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn, formatValue, formatPercent, isValidDelta } from '../../lib/utils';
import { useCountUp } from '../../hooks/useCountUp';

// ============================================
// MetricCard — cartão de KPI do Dashboard.
// Exibe rótulo, valor (com contagem animada) e
// variação percentual (verde/vermelho conforme sinal).
// ============================================
export function MetricCard({ label, value, delta, format = 'number' }) {
  const animated = useCountUp(value);
  const deltaNumber = Number(delta);
  const deltaValido = isValidDelta(delta);
  const positive = deltaValido && deltaNumber >= 0;
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;

  // Moeda mantém 2 casas; demais formatos arredondam para inteiro.
  const valor = format === 'currency' ? Math.round(animated * 100) / 100 : Math.round(animated);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
        {formatValue(valor, format)}
      </p>
      <div className="mt-2 flex items-center gap-1">
        {deltaValido ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              positive ? 'text-teal-600 dark:text-teal-400' : 'text-red-500 dark:text-red-400'
            )}
          >
            <DeltaIcon className="h-3.5 w-3.5" />
            {positive ? '+' : ''}
            {formatPercent(deltaNumber)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-400">—</span>
        )}
        <span className="text-xs text-slate-400">{deltaValido ? 'vs mês anterior' : 'Sem histórico'}</span>
      </div>
    </div>
  );
}
