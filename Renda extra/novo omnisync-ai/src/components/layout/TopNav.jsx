import { NavLink } from 'react-router-dom';
import { Infinity as InfinityIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SECTIONS } from '../../lib/navigation';

// ============================================
// TopNav — navegação "mega-menu" no topo (modo
// Comando/Neon). Mostra cada seção como uma
// categoria grande, com seus itens em estilo de
// chip. Substitui a sidebar lateral.
// ============================================
const LAYOUT = [
  { secao: 'Principal', rota: '/dashboard' },
  { secao: 'Operação', rota: '/pedidos' },
  { secao: 'Fornecimento', rota: '/fornecedores' },
  { secao: 'Inteligência', rota: '/radar-mercado' },
  { secao: 'Finanças', rota: '/financeiro' },
  { secao: 'Integrações', rota: '/integracao' },
  { secao: 'Configurações', rota: '/seguranca' },
];

export function TopNav({ onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <span className="flex h-9 w-9 items-center justify-center bg-primary-600 [border-radius:var(--tl-radius-sm)]">
          <InfinityIcon className="h-5 w-5 text-white" />
        </span>
        <span className="text-base font-bold text-white">OmniSync AI</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {LAYOUT.map(({ secao }) => {
          const itens = SECTIONS.find(s => s.titulo === secao)?.itens || [];
          return (
            <div key={secao}>
              <p className="pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {secao}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {itens.map(item => (
                  <NavLink
                    key={item.nome}
                    to={item.rota}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
                        '[border-radius:var(--tl-radius-sm)]',
                        isActive
                          ? 'text-primary-700'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      )
                    }
                    style={({ isActive }) =>
                      isActive ? { background: 'var(--tl-sidebar-active)' } : undefined
                    }
                  >
                    <item.Icone className="h-3.5 w-3.5" />
                    {item.nome}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
