import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

// ============================================
// MobileNav — drawer off-canvas para telas < 768px.
// Usa o mesmo componente de navegação do desktop
// (Sidebar ou TopNav conforme o modo ativo).
// ============================================
export function MobileNav({ navTop = false }) {
  const { mobileNavOpen, setMobileNavOpen } = useApp();

  return (
    <>
      {/* Overlay escurecido */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden print:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Painel deslizante */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 md:hidden print:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full" style={{ background: 'var(--tl-sidebar-bg)' }}>
          {navTop
            ? <TopNav onNavigate={() => setMobileNavOpen(false)} />
            : <Sidebar onNavigate={() => setMobileNavOpen(false)} forceExpanded />}
        </div>
      </aside>
    </>
  );
}
