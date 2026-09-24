import { Link } from 'react-router-dom';
import { MapPin, Package, Star, Store } from 'lucide-react';
import { Badge } from '../ui/Badge';

// ============================================
// SupplierCard — card do fornecedor no grid
// do catálogo (aba Fornecedores). Mostra o
// score (critérios reais do banco, no tooltip)
// e a posição no ranking quando ordenado por
// "melhor avaliado".
// ============================================

const selosMarketplace = {
  mercadolivre: { label: 'ML', variant: 'amber' },
  tiktok: { label: 'TikTok', variant: 'slate' },
  shopee: { label: 'Shopee', variant: 'red' },
};

function iniciais(nome) {
  return String(nome || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

function tituloCriterios(fornecedor) {
  if (!fornecedor.scoreCriterios?.length) return '';
  return fornecedor.scoreCriterios
    .map(c => `${c.label}: ${c.pontos}/${c.max}`)
    .join(' · ');
}

export function SupplierCard({ fornecedor, posicao }) {
  const capa = fornecedor.coverImages?.[0];
  const selos = (fornecedor.marketplaces || [])
    .map(m => selosMarketplace[m])
    .filter(Boolean);
  const temScore = typeof fornecedor.score === 'number';

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-24 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/10 dark:to-slate-900">
        {capa && (
          <img src={capa} alt="" className="h-24 w-full object-cover" loading="lazy" />
        )}
        <div className="absolute -bottom-5 left-4 flex h-11 w-11 items-center justify-center rounded-lg border border-white bg-slate-800 text-sm font-semibold text-white shadow dark:border-slate-900">
          {fornecedor.logoUrl ? (
            <img src={fornecedor.logoUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
          ) : (
            iniciais(fornecedor.name)
          )}
        </div>

        {typeof posicao === 'number' && (
          <span className="absolute left-2 top-2 rounded-md bg-slate-900/90 px-2 py-0.5 text-xs font-bold text-white">
            #{posicao}
          </span>
        )}

        {temScore && (
          <span
            title={tituloCriterios(fornecedor)}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-amber-700 shadow-sm dark:bg-slate-900/90 dark:text-amber-400"
          >
            <Star className="h-3 w-3 fill-current" />
            {fornecedor.score}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 pt-7">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
            {fornecedor.name}
          </h3>
          {fornecedor.niche && <Badge variant="amber">{fornecedor.niche}</Badge>}
        </div>

        <p className="flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {fornecedor.city}/{fornecedor.uf}
        </p>

        <p className="flex items-center gap-1 text-xs text-slate-500">
          <Package className="h-3.5 w-3.5 shrink-0" />
          {fornecedor.productCount} produto(s) no catálogo
        </p>

        {fornecedor.siteUrl && (
          <a
            href={fornecedor.siteUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline dark:text-primary-400"
          >
            <Store className="h-3.5 w-3.5" /> Site do fornecedor
          </a>
        )}

        {selos.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selos.map((s, i) => (
              <Badge key={`${s.label}-${i}`} variant={s.variant}>
                {s.label}
              </Badge>
            ))}
          </div>
        )}

        <Link
          to={`/fornecedores/${fornecedor.slug}`}
          className="mt-auto block rounded-lg bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-400"
        >
          Ver fornecedor
        </Link>
      </div>
    </article>
  );
}
