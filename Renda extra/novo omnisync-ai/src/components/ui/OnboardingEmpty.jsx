import { Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

// ============================================
// OnboardingEmpty — estado vazio de boas-vindas
// quando o usuário não tem dados configurados.
// ============================================
export function OnboardingEmpty({
  title = 'Nenhum dado encontrado',
  description = 'Comece adicionando seus primeiros registros.',
  primaryAction,
  secondaryAction,
  icon: Icon = Target,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-12 text-center', className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
        <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="max-w-md">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {primaryAction && (
          <Link
            to={primaryAction.href}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              primaryAction.variant === 'outline'
                ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                : 'bg-primary-600 text-white hover:bg-primary-500'
            )}
          >
            {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
            {primaryAction.label}
          </Link>
        )}
        {secondaryAction && (
          <Link
            to={secondaryAction.href}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              secondaryAction.variant === 'outline'
                ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                : 'bg-primary-600 text-white hover:bg-primary-500'
            )}
          >
            {secondaryAction.icon && <secondaryAction.icon className="h-4 w-4" />}
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}