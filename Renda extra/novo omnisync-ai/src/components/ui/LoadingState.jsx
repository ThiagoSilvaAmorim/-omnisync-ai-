import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================
// LoadingState — loading honesto com mensagem contextual.
// ============================================
export function LoadingState({
  message = 'Carregando...',
  size = 'md',
  showSpinner = true,
  inline = false,
}) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };
  const textClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3',
      inline ? 'py-6' : 'py-12'
    )}>
      {showSpinner && (
        <Loader2 className={cn('animate-spin text-primary-600 dark:text-primary-400', sizeClasses[size])} />
      )}
      <p className={cn('font-medium text-slate-600 dark:text-slate-300', textClasses[size])}>
        {message}
      </p>
    </div>
  );
}

// ============================================
// LoadingInline — versão inline para cards/tabelas.
// ============================================
export function LoadingInline({ message = 'Carregando...', height = 'h-32' }) {
  return (
    <div className={cn('flex items-center justify-center', height)}>
      <Loader2 className="animate-spin h-6 w-6 text-primary-600 dark:text-primary-400" />
      <span className="ml-2 text-sm text-slate-500">{message}</span>
    </div>
  );
}