import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';

// ============================================
// LineChart — encapsula o Recharts para gráficos
// de linha. A cor segue a paleta ativa. Suporta
// valores simples ou monetários (via prop currency).
// ============================================
export function LineChart({
  data,
  theme = 'light',
  height = 260,
  xKey = 'mes',
  dataKey = 'vendas',
  label = 'Vendas',
  currency = false,
}) {
  const { primaryColor } = useApp();
  const dark = theme === 'dark';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const tick = dark ? '#94a3b8' : '#64748b';

  const format = v =>
    currency
      ? `R$ ${Number(v ?? 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0
        })}`
      : `${Number(v ?? 0).toLocaleString('pt-BR')}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={format}
          width={56}
        />
        <Tooltip
          formatter={value => [format(value), label]}
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${grid}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: dark ? '#e2e8f0' : '#1e293b' }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={primaryColor}
          strokeWidth={2.5}
          dot={{ r: 3, fill: primaryColor }}
          activeDot={{ r: 5 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
