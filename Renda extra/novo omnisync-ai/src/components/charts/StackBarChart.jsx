import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ============================================
// StackBarChart — gráfico de barras empilhadas
// (multissérie). data: [{ nome, a: x, b: y }].
// series: [{ key, name, color }]
// ============================================
export function StackBarChart({
  data,
  series,
  theme = 'light',
  height = 260,
  xKey = 'data',
}) {
  const dark = theme === 'dark';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const tick = dark ? '#94a3b8' : '#64748b';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tickFormatter={v => `R$${(v ?? 0) / 1000}k`}
          width={48}
        />
        <Tooltip
          formatter={(value, name) => [`R$ ${Number(value ?? 0).toLocaleString('pt-BR')}`, name]}
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${grid}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: dark ? '#e2e8f0' : '#1e293b' }}
          cursor={{ fill: dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map(s => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId="a"
            fill={s.color}
            maxBarSize={38}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
