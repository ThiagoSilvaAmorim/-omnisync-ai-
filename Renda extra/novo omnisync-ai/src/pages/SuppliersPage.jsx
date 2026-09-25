import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Building2, Crown, Package, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { FiltersBar } from '../components/fornecedores/FiltersBar';
import { SupplierCard } from '../components/fornecedores/SupplierCard';
import { ProductCard } from '../components/fornecedores/ProductCard';
import { CnpjDialog } from '../components/fornecedores/CnpjDialog';
import { useSuppliers, useSuppliersNiches, useSuppliersCidades, LIMITE_PAGINA } from '../hooks/useSuppliers';

// ============================================
// SuppliersPage — catálogo de fornecedores e
// produtos (/fornecedores). As abas Produtos e
// Fornecedores são visões do MESMO catálogo:
// mesma busca, filtros de UF/nicho/cidade/
// categoria, ordenação por score e posição no
// ranking, refletidos na URL
// (?q=&uf=&niche=&cidade=&order=&category=&tab=&page=).
// ============================================

const abas = [
  { id: 'fornecedores', label: 'Fornecedores', Icone: Building2 },
  { id: 'produtos', label: 'Produtos', Icone: Package },
];

export function SuppliersPage() {
  const [params, setParams] = useSearchParams();
  const [dialogCnpj, setDialogCnpj] = useState(false);

  const q = params.get('q') || '';
  const uf = params.get('uf') || '';
  const niche = params.get('niche') || '';
  const cidade = params.get('cidade') || '';
  const order = params.get('order') || '';
  const category = params.get('category') || '';
  const tab = params.get('tab') === 'produtos' ? 'produtos' : 'fornecedores';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const { items, total, categorias, loading, carregandoMais, error, temMais, recarregar } = useSuppliers({
    tab,
    q,
    uf,
    niche,
    cidade,
    order,
    category,
    page,
  });
  const niches = useSuppliersNiches();
  const cidades = useSuppliersCidades();

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
  const setOrder = useCallback(v => atualizarParam('order', v), [atualizarParam]);
  const setCategory = useCallback(v => atualizarParam('category', v), [atualizarParam]);
  const setTab = useCallback(v => atualizarParam('tab', v), [atualizarParam]);

  // Escolher uma cidade monta o rank dela: ordena por "melhor avaliado".
  const setCidade = useCallback(v => {
    const proximo = new URLSearchParams(params);
    if (v) {
      proximo.set('cidade', v);
      proximo.set('order', 'score');
    } else {
      proximo.delete('cidade');
      proximo.delete('order');
    }
    proximo.delete('page');
    setParams(proximo, { replace: true });
  }, [params, setParams]);

  const carregarMais = () => atualizarParam('page', String(page + 1));

  const vazio = tab === 'produtos'
    ? { title: 'Nenhum produto encontrado', description: 'Ajuste a busca, o estado ou a categoria.' }
    : { title: 'Nenhum fornecedor encontrado', description: 'Ajuste a busca, o estado ou a cidade.' };

  const emRanking = tab === 'fornecedores' && order === 'score';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Fornecedores</h1>
          <p className="text-sm text-slate-500">
            Encontre produtos e fornecedores ideais para seu negócio — busca direta na base, sem chave externa.
          </p>
        </div>
        {tab === 'fornecedores' && (
          <Button onClick={() => setDialogCnpj(true)} data-testid="btn-add-cnpj">
            <Plus className="h-4 w-4" /> Adicionar por CNPJ
          </Button>
        )}
      </div>

      <CnpjDialog open={dialogCnpj} onClose={() => setDialogCnpj(false)} />

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

      <FiltersBar
        tab={tab}
        q={q}
        uf={uf}
        niche={niche}
        niches={niches}
        cidade={cidade}
        cidades={cidades}
        order={order}
        category={category}
        categorias={categorias}
        onQ={setQ}
        onUf={setUf}
        onNiche={setNiche}
        onCidade={setCidade}
        onOrder={setOrder}
        onCategory={setCategory}
      />

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
          {emRanking && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <Crown className="h-4 w-4 shrink-0" />
              Ranking {cidade ? `de ${cidade}` : 'dos melhores avaliados'} — posição por score
              (site, dropshipping, produtos, logo e contato).
            </div>
          )}

          <p className="text-xs text-slate-500">
            {total} {tab === 'produtos' ? 'produto(s)' : 'fornecedor(es)'}
            {cidade ? ` em ${cidade}` : ''} na base
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {tab === 'produtos'
              ? items.map(p => <ProductCard key={p.id} produto={p} />)
              : items.map((f, i) => (
                  <SupplierCard
                    key={f.id}
                    fornecedor={f}
                    posicao={emRanking ? (page - 1) * LIMITE_PAGINA + i + 1 : undefined}
                  />
                ))}
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
