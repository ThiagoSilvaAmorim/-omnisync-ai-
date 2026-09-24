import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

// ============================================
// InsightCard — bloco de recomendação de IA
// (OmniAdvisor) presente em todos os painéis.
// Usa a cor primária dinâmica (paleta ativa).
// ============================================
export function InsightCard({ titulo = 'Insight IA — OmniAdvisor', acontecendo, recomendacao }) {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:from-primary-500/10 dark:to-primary-500/10 dark:ring-1 dark:ring-slate-800">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            O que está acontecendo
          </p>
          <ul className="mt-2 space-y-2">
            {acontecendo.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Ação recomendada
          </p>
          <ul className="mt-2 space-y-2">
            {recomendacao.map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5">
        <Link
          to="/central-ia"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-primary-500 active:scale-95"
        >
          Ver análise completa
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
