import { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { MODOS } from '../../lib/modes';
import { PALETAS } from '../../lib/palettes';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

// ============================================
// ThemeSwitcher — troca o MODO inteiro (sistema
// visual) + permite personalizar a cor primária.
// Abre como modal com preview de cada modo.
// ============================================

// Preview em miniatura do layout de cada modo.
function Preview({ modo }) {
  const topo = modo.nav === 'topo';
  return (
    <div className="flex h-16 w-full overflow-hidden [border-radius:var(--tl-radius-sm)] border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
      {!topo && <div className="w-6 shrink-0" style={{ background: modo.style.sidebarBg }} />}
      <div className="flex-1 p-1.5">
        <div className="mb-1 flex gap-1">
          <div className="flex h-2 w-8" style={{ background: 'rgba(148,163,184,0.4)', borderRadius: 2 }} />
          <div className="flex h-2 w-4" style={{ background: 'rgba(148,163,184,0.25)', borderRadius: 2 }} />
        </div>
        {topo && (
          <div className="mb-1 flex gap-1">
            <div className="h-1.5 flex-1" style={{ background: 'rgba(148,163,184,0.3)', borderRadius: 2 }} />
            <div className="h-1.5 w-1/3" style={{ background: 'rgba(148,163,184,0.3)', borderRadius: 2 }} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-1">
          <div className="h-5 rounded-sm bg-white shadow-sm dark:bg-slate-700" />
          <div className="h-5 rounded-sm" style={{ background: 'rgb(var(--primary-500))' }} />
          <div className="h-5 rounded-sm bg-white shadow-sm dark:bg-slate-700" />
          <div className="h-5 rounded-sm bg-white shadow-sm dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export function ThemeSwitcher({ open, onClose }) {
  const { modo, setModo, palette, setPalette, customCor, setCustomColor } = useApp();
  // Cor customizada do modo atual — inicializada uma vez por abertura (key={modo}).
  const [cor, setCor] = useState(customCor[modo] || '');

  if (!open) return null;
  const ativo = MODOS.find(m => m.id === modo);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Temas do sistema</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Cada tema é um <strong>sistema visual completo</strong> — muda navegação, gráficos e estilo. Escolha e personalize a cor.
        </p>

        {/* Grade de modos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MODOS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModo(m.id)}
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-3 text-left transition-all',
                modo === m.id
                  ? 'border-primary-500 ring-2 ring-primary-500/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              )}
            >
              <Preview modo={m} />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.nome}</p>
                  <p className="text-xs text-slate-400">{m.sub} · {m.vibe}</p>
                </div>
                {modo === m.id && <Check className="h-4 w-4 text-primary-600" />}
              </div>
              <p className="text-xs text-slate-500">{m.descricao}</p>
            </button>
          ))}
        </div>

        {/* Cor personalizada */}
        <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Personalizar cor · {ativo?.nome}</p>
          <p className="text-xs text-slate-400">Escolha uma cor para este tema (opcional).</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={cor || '#7c3aed'}
              onChange={e => setCor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white dark:border-slate-700"
              aria-label="Cor primária"
            />
            <div className="flex flex-wrap gap-2">
              {PALETAS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  title={p.nome}
                  onClick={() => {
                    setCor('');
                    setPalette(p.id);
                  }}
                  className={cn(
                    'h-7 w-7 rounded-full ring-2 transition-transform hover:scale-110',
                    !cor && palette === p.id ? 'ring-slate-400' : 'ring-transparent'
                  )}
                  style={{ backgroundColor: `rgb(${p.cores['500']})` }}
                  aria-label={p.nome}
                />
              ))}
            </div>
            <button
              type="button"
              disabled={!cor}
              onClick={() => { setCustomColor(modo, cor); onClose(); }}
              className="ml-auto rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-40"
            >
              Aplicar cor
            </button>
            {customCor[modo] && (
              <button
                type="button"
                onClick={() => { setCustomColor(modo, ''); setCor(''); }}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                Limpar custom
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
