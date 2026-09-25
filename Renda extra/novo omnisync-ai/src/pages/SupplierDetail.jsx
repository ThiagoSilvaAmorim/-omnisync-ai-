import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, BadgeCheck, CalendarDays, MapPin, Package, Store } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { ProductCard } from '../components/fornecedores/ProductCard';
import { api } from '../services/api';

// ============================================
// SupplierDetail — /fornecedores/:slug
// Cabeçalho do fornecedor + catálogo de
// produtos dele. 404 honesto para slug
// desconhecido (ou fora do catálogo).
// ============================================

const selosMarketplace = {
  mercadolivre: { label: 'Mercado Livre', variant: 'amber' },
  tiktok: { label: 'TikTok Shop', variant: 'slate' },
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

export function SupplierDetail() {
  const { slug } = useParams();
  const [estado, setEstado] = useState({ carregando: true, erro: null, fornecedor: null, produtos: [] });

  useEffect(() => {
    let ativo = true;
    setEstado({ carregando: true, erro: null, fornecedor: null, produtos: [] });

    api.getSupplierBySlug(slug)
      .then(r => {
        if (ativo) {
          setEstado({ carregando: false, erro: null, fornecedor: r.fornecedor, produtos: r.produtos || [] });
        }
      })
      .catch(e => {
        if (ativo) setEstado({ carregando: false, erro: e, fornecedor: null, produtos: [] });
      });

    return () => {
      ativo = false;
    };
  }, [slug]);

  if (estado.carregando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const naoEncontrado = estado.erro && /não encontrado/i.test(estado.erro.message || '');
  if (naoEncontrado) {
    return (
      <div className="space-y-4">
        <Link
          to="/fornecedores"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>
        <EmptyState title="Fornecedor não encontrado" description="Volte ao catálogo e escolha outro fornecedor." />
      </div>
    );
  }

  if (estado.erro) {
    return (
      <div className="space-y-4">
        <Link
          to="/fornecedores"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
        </Link>
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar o fornecedor"
          description={estado.erro.message || 'Tente novamente em instantes.'}
        />
      </div>
    );
  }

  const f = estado.fornecedor;
  const capa = f.coverImages?.[0];
  const selos = (f.marketplaces || []).map(m => selosMarketplace[m]).filter(Boolean);
  const situacao = f.situacaoCadastral;
  const anos = f.abertoEm
    ? new Date().getUTCFullYear() - new Date(f.abertoEm).getUTCFullYear()
    : null;

  return (
    <div className="space-y-6">
      <Link
        to="/fornecedores"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao catálogo
      </Link>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative h-32 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-500/10 dark:to-slate-900">
          {capa && <img src={capa} alt="" className="h-32 w-full object-cover" />}
          <div className="absolute -bottom-6 left-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-slate-800 text-lg font-semibold text-white shadow dark:border-slate-900">
            {f.logoUrl ? (
              <img src={f.logoUrl} alt={`Logo de ${f.name}`} className="h-14 w-14 object-cover" />
            ) : (
              iniciais(f.name)
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5 pt-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{f.name}</h1>
            {f.niche && <Badge variant="amber">{f.niche}</Badge>}
            {selos.map((s, i) => (
              <Badge key={`${s.label}-${i}`} variant={s.variant}>
                {s.label}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {f.city}/{f.uf}
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4" /> {f.productCount} produto(s)
            </span>
            {f.siteUrl && (
              <a
                href={f.siteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
              >
                <Store className="h-4 w-4" /> Site do fornecedor
              </a>
            )}
          </div>
        </div>
      </div>

      {f.cnpjVerificado && (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" data-testid="sobre-receita">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Sobre (Receita Federal)</h2>
            {situacao && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  situacao === 'ATIVA'
                    ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                }`}
              >
                {situacao}
              </span>
            )}
          </div>

          {f.descricao && <p className="text-sm text-slate-600 dark:text-slate-300">{f.descricao}</p>}

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {f.cnpj && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">CNPJ</dt>
                <dd className="font-medium text-slate-700 dark:text-slate-200">{f.cnpj}</dd>
              </div>
            )}
            {f.razaoSocial && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Razão social</dt>
                <dd className="font-medium text-slate-700 dark:text-slate-200">{f.razaoSocial}</dd>
              </div>
            )}
            {f.abertoEm && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Abertura</dt>
                <dd className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(f.abertoEm).toLocaleDateString('pt-BR')}
                  {anos != null && anos >= 0 ? ` (${anos} ano${anos === 1 ? '' : 's'})` : ''}
                </dd>
              </div>
            )}
            {f.cnaeDescricao && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">CNAE</dt>
                <dd className="font-medium text-slate-700 dark:text-slate-200">
                  {f.cnae ? `${f.cnae} — ` : ''}{f.cnaeDescricao}
                </dd>
              </div>
            )}
            {f.capitalSocial != null && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Capital social</dt>
                <dd className="font-medium text-slate-700 dark:text-slate-200">
                  {Number(f.capitalSocial).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </dd>
              </div>
            )}
            {f.endereco && (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Endereço</dt>
                <dd className="font-medium text-slate-700 dark:text-slate-200">{f.endereco}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Catálogo de produtos</h2>
        {estado.produtos.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Este fornecedor ainda não tem produtos no catálogo."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {estado.produtos.map(p => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
