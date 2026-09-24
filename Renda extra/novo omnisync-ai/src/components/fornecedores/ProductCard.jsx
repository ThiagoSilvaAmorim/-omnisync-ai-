import { Link } from 'react-router-dom';
import { Building2, Package } from 'lucide-react';
import { Badge } from '../ui/Badge';

// ============================================
// ProductCard — card do produto no grid do
// catálogo (aba Produtos). Mostra o fornecedor
// dono do produto (o mesmo produto pode aparecer
// em fornecedores diferentes).
// ============================================

const BRL = v =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductCard({ produto }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-28 items-center justify-center bg-slate-100 dark:bg-slate-800">
        {produto.imageUrl ? (
          <img src={produto.imageUrl} alt={produto.name} className="h-28 w-full object-cover" loading="lazy" />
        ) : (
          <Package className="h-10 w-10 text-slate-400" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
            {produto.name}
          </h3>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {produto.category && <Badge variant="teal">{produto.category}</Badge>}
            {produto.niche && <Badge variant="amber">{produto.niche}</Badge>}
          </div>
        </div>

        {produto.sku && <p className="text-xs text-slate-500">SKU: {produto.sku}</p>}

        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Custo: {produto.costPrice != null ? BRL(produto.costPrice) : '—'}
        </p>

        {produto.supplier && (
          <Link
            to={`/fornecedores/${produto.supplier.slug}`}
            className="mt-auto flex items-center gap-1 text-xs text-primary-600 hover:underline dark:text-primary-400"
          >
            <Building2 className="h-3.5 w-3.5" />
            {produto.supplier.name} · {produto.supplier.city}/{produto.supplier.uf}
          </Link>
        )}
      </div>
    </article>
  );
}
