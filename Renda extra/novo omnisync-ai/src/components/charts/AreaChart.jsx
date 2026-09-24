import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../../context/AppContext';

// ============================================
// AreaChart — encapsula o Recharts para gráficos
// de área (curva suave). A cor segue a paleta
// ativa (primaryColor do contexto).
// ============================================
export function AreaChart({ data, theme = 'light', height = 260, dataKey = 'valor', label = 'Faturamento' }) {
  const { primaryColor } = useApp();
  const dark = theme === 'dark';
  const grid = dark ? '#1e293b' : '#e2e8f0';
  const tick = dark ? '#94a3b8' : '#64748b';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
            <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
        <XAxis
          dataKey="data"
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
          formatter={value => [`R$ ${Number(value ?? 0).toLocaleString('pt-BR')}`, label]}
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${grid}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: dark ? '#e2e8f0' : '#1e293b' }}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={primaryColor}
          strokeWidth={2.5}
          fill="url(#areaGrad)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
