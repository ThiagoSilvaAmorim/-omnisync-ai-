import { useState } from 'react';

// ============================================
// AiActionButton — botão de ação de IA com fluxo
// de produto visível: idle → loading → success
// (resultado) | insufficient (dados insuficientes)
// | error (erro explícito). Usado por todas as
// ações "Analisar com Gemini" do OmniSync.
// ============================================

export function AiActionButton({ label, onRun, onResult, disabled, variant = 'secondary', className = '' }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function run() {
    setStatus('loading');
    setError(null);
    try {
      const response = await onRun();
      if (response && response.ok === false) {
        setStatus('insufficient');
      } else {
        setStatus('success');
      }
      if (onResult) onResult(response);
    } catch (e) {
      setError(e?.message || 'Falha na análise.');
      setStatus('error');
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled || status === 'loading'}
        onClick={run}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:border-primary-500 disabled:opacity-50 dark:border-slate-700"
      >
        {status === 'loading' ? 'Analisando com IA...' : label}
      </button>
      {status === 'error' && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {status === 'insufficient' && (
        <p className="mt-1 text-xs text-slate-500">Dados insuficientes para uma análise confiável.</p>
      )}
    </div>
  );
}
