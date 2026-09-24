import { cn } from '../../lib/utils';

// ============================================
// Select — select nativo estilizado com label.
// ============================================
export function Select({ label, value, onChange, options, className, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
          className
        )}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="text-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
