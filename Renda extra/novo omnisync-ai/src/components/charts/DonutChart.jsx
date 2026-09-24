import { Pie, PieChart as RechartsPieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// ============================================
// DonutChart — gráfico de rosca (proporções).
// Usa uma paleta de cores derivada da primária.
// data: [{ name, valor }]
// ============================================
const CORE = ['var(--primary-500)', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

export function DonutChart({ data, theme = 'light', height = 220, dataKey = 'valor', nameKey = 'name' }) {
  const dark = theme === 'dark';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={CORE[i % CORE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [`${Number(value ?? 0).toLocaleString('pt-BR')}`, name]}
          contentStyle={{
            backgroundColor: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: dark ? '#e2e8f0' : '#1e293b' }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
