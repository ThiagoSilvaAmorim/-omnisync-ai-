import { ResponsiveContainer, RadialBar, RadialBarChart as RechartsRadialBar } from 'recharts';
import { useApp } from '../../context/AppContext';

// ============================================
// RadialGauge — medidor semicircular (progresso).
// value 0-100. Usado para metas / metas de operação.
// ============================================
export function RadialGauge({ value, label, theme = 'light', size = 180 }) {
  const { primaryColor } = useApp();
  const dark = theme === 'dark';
  const tick = dark ? '#94a3b8' : '#64748b';
  const data = [{ name: label, value: Math.max(0, Math.min(100, value)) }];

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RechartsRadialBar
        cx="50%"
        cy="50%"
        innerRadius="75%"
        outerRadius="95%"
        data={data}
        startAngle={225}
        endAngle={-45}
      >
        <RadialBar
          dataKey="value"
          cornerRadius={8}
          fill={primaryColor}
          background={{ fill: dark ? '#1e293b' : '#f1f5f9' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
<tspan x="50%" dy="-8" fill={tick} fontSize={label ? 13 : 0}>
              {`${Number(value ?? 0)}%`}
            </tspan>
          {label && (
            <tspan x="50%" dy="20" fill={dark ? '#94a3b8' : '#64748b'} fontSize={11}>
              {label}
            </tspan>
          )}
        </text>
      </RechartsRadialBar>
    </ResponsiveContainer>
  );
}
