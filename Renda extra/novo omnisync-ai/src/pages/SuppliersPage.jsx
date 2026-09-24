import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, Package, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { FiltersBar } from '../components/fornecedores/FiltersBar';
import { SupplierCard } from '../components/fornecedores/SupplierCard';
import { ProductCard } from '../components/fornecedores/ProductCard';
import { useSuppliers, useSuppliersNiches, LIMITE_PAGINA } from '../hooks/useSuppliers';

// ============================================
// SuppliersPage — catálogo de fornecedores e
// produtos (/fornecedores). As abas Produtos e
// Fornecedores são visões do MESMO catálogo:
// mesma busca, mesmos filtros de UF e nicho,
// refletidos na URL (?q=&uf=&niche=&tab=&page=).
// ============================================

const abas = [
  { id: 'fornecedores', label: 'Fornecedores', Icone: Building2 },
  { id: 'produtos', label: 'Produtos', Icone: Package },
];

export function SuppliersPage() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') || '';
  const uf = params.get('uf') || '';
  const niche = params.get('niche') || '';
  const tab = params.get('tab') === 'produtos' ? 'produtos' : 'fornecedores';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const { items, total, loading, carregandoMais, error, temMais, recarregar } = useSuppliers({
    tab,
    q,
    uf,
    niche,
    page,
  });
  const niches = useSuppliersNiches();

  const atualizarParam = useCallback(
    (chave, valor) => {
      const proximo = new URLSearchParams(params);
      if (valor) proximo.set(chave, valor);
      else proximo.delete(chave);
      if (chave !== 'page') proximo.delete('page');
      setParams(proximo, { replace: true });
    },
    [params, setParams]
  );

  const setQ = useCallback(v => atualizarParam('q', v), [atualizarParam]);
  const setUf = useCallback(v => atualizarParam('uf', v), [atualizarParam]);
  const setNiche = useCallback(v => atualizarParam('niche', v), [atualizarParam]);
  const setTab = useCallback(v => atualizarParam('tab', v), [atualizarParam]);

  const carregarMais = () => atualizarParam('page', String(page + 1));

  const vazio = tab === 'produtos'
    ? { title: 'Nenhum produto encontrado', description: 'Ajuste a busca, o estado ou o nicho.' }
    : { title: 'Nenhum fornecedor encontrado', description: 'Ajuste a busca, o estado ou o nicho.' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Fornecedores</h1>
        <p className="text-sm text-slate-500">
          Encontre produtos e fornecedores ideais para seu negócio — busca direta na base, sem chave externa.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {abas.map(a => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={tab === a.id}
            onClick={() => setTab(a.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === a.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <a.Icone className="h-4 w-4" />
            {a.label}
          </button>
        ))}
      </div>

      <FiltersBar q={q} uf={uf} niche={niche} niches={niches} onQ={setQ} onUf={setUf} onNiche={setNiche} />

      {error && items.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar o catálogo"
          description={error.message || 'Tente novamente em instantes.'}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: LIMITE_PAGINA }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={tab === 'produtos' ? Package : Building2}
          title={vazio.title}
          description={vazio.description}
        />
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {total} {tab === 'produtos' ? 'produto(s)' : 'fornecedor(es)'} na base
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {tab === 'produtos'
              ? items.map(p => <ProductCard key={p.id} produto={p} />)
              : items.map(f => <SupplierCard key={f.id} fornecedor={f} />)}
          </div>

          {error && (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Falha ao carregar mais resultados.
              <Button variant="secondary" size="sm" onClick={recarregar}>
                <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </div>
          )}

          {temMais && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={carregarMais} disabled={carregandoMais}>
                {carregandoMais ? 'Carregando...' : `Carregar mais (${items.length}/${total})`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
