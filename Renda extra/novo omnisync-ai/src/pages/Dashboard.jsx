import { useApp } from '../context/AppContext';
import { DashboardCommandCenter } from '../components/dashboard/DashboardCommandCenter';
import { BentoHome } from '../components/dashboard/BentoHome';

// ============================================
// Tela 01 — Dashboard / Home.
// A página inicial muda conforme o modo ativo:
//  - Sinopse: Command Center (Clássico / Comando)
//  - Bento: grade assimétrica nova (Moderno / Neon)
// ============================================

export function Dashboard() {
  const { modo, period, customRange } = useApp();
  const bento = modo === 'moderno' || modo === 'neon';

  return (
    <div className="space-y-6">
      {bento ? (
        <BentoHome period={period} customRange={customRange} />
      ) : (
        <DashboardCommandCenter period={period} customRange={customRange} />
      )}
    </div>
  );
}
