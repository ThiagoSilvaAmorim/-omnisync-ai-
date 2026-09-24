import { cn } from '../../lib/utils';

// ============================================
// Input — input de texto/número estilizado com label.
// ============================================
export function Input({ label, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>}
      <input
        className={cn(
          'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500',
          className
        )}
        {...props}
      />
    </label>
  );
}
