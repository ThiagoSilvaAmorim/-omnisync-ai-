import { Search, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { UFS } from '../../data/ufs';
import { LocalAutocomplete } from './LocalAutocomplete';

// ============================================
// FiltersBar — busca + filtros do catálogo.
// Aba Fornecedores: UF, nicho, CIDADE e
// ordenação (melhor avaliado = score real).
// Aba Produtos: UF, nicho e CATEGORIA.
// A busca é emitida a cada tecla (debounce de
// 300ms acontece no useSuppliers).
// LocalAutocomplete (Google Places): escolher
// uma sugestão aplica cidade/UF do catálogo —
// ou cai na busca textual se a cidade ainda
// não tem fornecedor cadastrado.
// ============================================

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

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

  // Sugestão do Google Places → filtros do catálogo.
  function aplicarLocal(s) {
    const sigla = UFS.find(u => norm(u.nome) === norm(s.estado))?.sigla || '';
    const doCatalogo = cidades.find(c => norm(c.city) === norm(s.cidade));
    if (doCatalogo) {
      onQ('');
      if (sigla) onUf(sigla);
      onCidade?.(doCatalogo.city);
      return;
    }
    // Cidade ainda sem fornecedor: busca textual + UF (estado vazio é honesto).
    onCidade?.('');
    if (s.cidade) {
      onQ(s.cidade);
      if (sigla) onUf(sigla);
    } else {
      onQ(s.principal || s.descricao || '');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Buscar no catálogo"
            placeholder="Buscar por nome, cidade, nicho ou SKU..."
            value={q}
            onChange={e => onQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-72">
          <LocalAutocomplete onSelecionar={aplicarLocal} />
        </div>
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
