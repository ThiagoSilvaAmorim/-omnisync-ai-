import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Package, Scale, Sparkles, TrendingDown } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';

// ============================================
// ProductCard — card do produto no grid do
// catálogo (aba Produtos) e no detalhe do
// fornecedor. Quando o produto tem o MESMO
// item em outros fornecedores (comparacoes),
// mostra o bloco de comparação com o custo de
// cada um e o botão "Melhor compra (Gemini)".
// ============================================

const BRL = v =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductCard({ produto }) {
  const comp = produto.comparacoes;
  const outras = comp?.outrasOfertas || [];
  const resumo = comp?.resumo;

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

        {outras.length > 0 && (
          <Comparacao produto={produto} outras={outras} resumo={resumo} />
        )}

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

// ---- Comparação do mesmo produto em outros fornecedores + Gemini ----
function Comparacao({ produto, outras, resumo }) {
  const [estado, setEstado] = useState({ carregando: false, erro: null, analise: null });

  async function melhorCompra() {
    if (estado.carregando) return;
    setEstado({ carregando: true, erro: null, analise: null });
    try {
      const r = await api.analisarDominio('purchase', { produtoId: produto.id });
      if (r?.ok === false) {
        setEstado({ carregando: false, erro: r.message || 'Dados insuficientes para recomendar.', analise: null });
      } else {
        setEstado({ carregando: false, erro: null, analise: r });
      }
    } catch (e) {
      setEstado({ carregando: false, erro: e.message || 'Falha ao consultar o Gemini.', analise: null });
    }
  }

  return (
    <div className="mt-1 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 dark:border-amber-500/25 dark:bg-amber-500/5" data-testid="comparacao-ofertas">
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        <Scale className="h-3.5 w-3.5" />
        Mesmo produto em {outras.length} outro(s) fornecedor(es)
      </p>

      <ul className="space-y-1">
        {outras.map(o => (
          <li key={o.productId} className="flex items-baseline justify-between gap-2 text-xs" data-testid="oferta-concorrente">
            <Link
              to={`/fornecedores/${o.supplier.slug}`}
              className="truncate text-slate-600 hover:text-primary-600 hover:underline dark:text-slate-300"
            >
              {o.supplier.name}
              <span className="text-slate-400"> · {o.supplier.city}/{o.supplier.uf}</span>
            </Link>
            <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">{BRL(o.costPrice)}</span>
          </li>
        ))}
      </ul>

      {resumo && !resumo.souOMenor && (
        <p className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400" data-testid="diferenca-preco">
          <TrendingDown className="h-3.5 w-3.5" />
          Economia de {BRL(resumo.diferenca)} comprando em {outras.length > 1 ? 'outro fornecedor' : 'o concorrente'}
        </p>
      )}
      {resumo?.souOMenor && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400" data-testid="menor-preco">
          Este é o menor custo entre {resumo.totalOfertas} oferta(s).
        </p>
      )}

      <button
        type="button"
        onClick={melhorCompra}
        disabled={estado.carregando}
        data-testid="btn-melhor-compra"
        className="flex w-full items-center justify-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-500/10"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {estado.carregando ? 'Analisando…' : 'Melhor compra (Gemini)'}
      </button>

      {estado.erro && (
        <p className="text-xs text-red-600 dark:text-red-400" data-testid="erro-melhor-compra">{estado.erro}</p>
      )}

      {estado.analise && (
        <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200" data-testid="analise-melhor-compra">
          <p>{estado.analise.analysis}</p>
          {Array.isArray(estado.analise.recommendations) && estado.analise.recommendations.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4">
              {estado.analise.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
          {Array.isArray(estado.analise.risks) && estado.analise.risks.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-amber-700 dark:text-amber-300">
              {estado.analise.risks.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
