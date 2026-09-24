import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';

// ============================================
// BarChart — encapsula o Recharts para gráficos
// de barras. A cor segue a paleta ativa.
// ============================================
export function BarChart({ data, theme = 'light', height = 260, dataKey = 'valor', xKey = 'canal', label = 'Vendas' }) {
  const { primaryColor } = useApp();
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
          interval={0}
          angle={-20}
          textAnchor="end"
        />
        <YAxis
          tick={{ fill: tick, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `R$${(v ?? 0) / 1000}k`}
          width={48}
        />
        <Tooltip
          formatter={value => [`R$ ${Number(value ?? 0).toLocaleString('pt-BR')}`, label]}
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${grid}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: dark ? '#e2e8f0' : '#1e293b' }}
          cursor={{ fill: dark ? 'rgba(148,163,184,0.08)' : 'rgba(100,116,139,0.08)' }}
        />
        <Bar dataKey={dataKey} fill={primaryColor} radius={[6, 6, 0, 0]} maxBarSize={42} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
