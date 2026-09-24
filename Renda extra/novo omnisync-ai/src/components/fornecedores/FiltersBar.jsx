import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { UFS } from '../../data/ufs';

// ============================================
// FiltersBar — busca + UF + nicho do catálogo.
// O texto é emitido a cada tecla (o debounce de
// 300ms acontece no useSuppliers).
// ============================================

const ufOptions = [
  { value: '', label: 'Todos os estados' },
  ...UFS.map(u => ({ value: u.sigla, label: `${u.sigla} — ${u.nome}` })),
];

export function FiltersBar({ q, uf, niche, niches, onQ, onUf, onNiche }) {
  const nicheOptions = [
    { value: '', label: 'Todos os nichos' },
    ...niches.map(n => ({ value: n, label: n })),
  ];
  const temFiltro = Boolean(q || uf || niche);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          aria-label="Buscar no catálogo"
          placeholder="Buscar por nome, cidade, nicho ou SKU..."
          value={q}
          onChange={e => onQ(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:w-64 sm:grid-cols-2">
        <Select aria-label="Estado" value={uf} onChange={onUf} options={ufOptions} />
        <Select aria-label="Nicho" value={niche} onChange={onNiche} options={nicheOptions} />
      </div>
      {temFiltro && (
        <button
          type="button"
          onClick={() => {
            onQ('');
            onUf('');
            onNiche('');
          }}
          className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-4 w-4" /> Limpar
        </button>
      )}
    </div>
  );
}
