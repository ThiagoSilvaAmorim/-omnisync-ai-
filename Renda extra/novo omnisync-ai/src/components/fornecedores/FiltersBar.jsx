import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { UFS } from '../../data/ufs';

// ============================================
// FiltersBar — busca + filtros do catálogo.
// Aba Fornecedores: UF, nicho, CIDADE e
// ordenação (melhor avaliado = score real).
// Aba Produtos: UF, nicho e CATEGORIA.
// A busca é emitida a cada tecla (debounce de
// 300ms acontece no useSuppliers).
// ============================================

const ufOptions = [
  { value: '', label: 'Todos os estados' },
  ...UFS.map(u => ({ value: u.sigla, label: `${u.sigla} — ${u.nome}` })),
];

const orderOptions = [
  { value: '', label: 'Ordenar: A-Z' },
  { value: 'score', label: '★ Melhor avaliado' },
];

export function FiltersBar({
  tab = 'fornecedores',
  q, uf, niche, niches,
  cidade, cidades,
  order,
  category, categorias,
  onQ, onUf, onNiche, onCidade, onOrder, onCategory,
}) {
  const nicheOptions = [
    { value: '', label: 'Todos os nichos' },
    ...niches.map(n => ({ value: n, label: n })),
  ];
  const cidadeOptions = [
    { value: '', label: 'Todas as cidades' },
    ...cidades.map(c => ({ value: c.city, label: `${c.city} (${c.total})` })),
  ];
  const categoriaOptions = [
    { value: '', label: 'Todas as categorias' },
    ...(categorias || []).map(c => ({ value: c.category, label: `${c.category} (${c.total})` })),
  ];
  const temFiltro = Boolean(q || uf || niche || cidade || order || category);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          aria-label="Buscar no catálogo"
          placeholder="Buscar por nome, cidade, nicho ou SKU..."
          value={q}
          onChange={e => onQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
          <Select aria-label="Estado" value={uf} onChange={onUf} options={ufOptions} />
          <Select aria-label="Nicho" value={niche} onChange={onNiche} options={nicheOptions} />
          {tab === 'produtos' ? (
            <Select
              aria-label="Categoria do produto"
              value={category}
              onChange={onCategory}
              options={categoriaOptions}
            />
          ) : (
            <>
              <Select
                aria-label="Cidade"
                value={cidade}
                onChange={onCidade}
                options={cidadeOptions}
              />
              <Select
                aria-label="Ordenação"
                value={order}
                onChange={onOrder}
                options={orderOptions}
              />
            </>
          )}
        </div>

        {temFiltro && (
          <button
            type="button"
            onClick={() => {
              onQ('');
              onUf('');
              onNiche('');
              onCidade?.('');
              onOrder?.('');
              onCategory?.('');
            }}
            className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}
