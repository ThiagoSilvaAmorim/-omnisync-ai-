import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { TrendingDown, TrendingUp, X } from 'lucide-react';

// ============================================
// Financeiro — fluxo de caixa (receitas/despesas)
// + projeção para os próximos 30 dias.
// Dados reais via GET /api/transacoes (Neon:
// pedidos como receitas, ordens de compra
// como despesas), com fallback local.
// ============================================

const BRL = v => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Referência temporal fixada no carregamento do módulo para o filtro de período.
const REFERENCIA_MS = Date.now();

export function Financeiro() {
  const toast = useToast();
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState('todas');
  const [periodoFiltro, setPeriodoFiltro] = useState('tudo');
  const [detalhe, setDetalhe] = useState(null);

  const parseData = s => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  };

  const filtradas = useMemo(() => transacoes.filter(t => {
    if (tipoFiltro !== 'todas' && t.tipo !== tipoFiltro) return false;
    if (periodoFiltro !== 'tudo') {
      const d = parseData(t.data);
      if (!d) return false;
      const dias = (REFERENCIA_MS - d.getTime()) / 86400000;
      if (periodoFiltro === '7d' && dias > 7) return false;
      if (periodoFiltro === '30d' && dias > 30) return false;
    }
    return true;
  }), [transacoes, tipoFiltro, periodoFiltro]);

  // Série diária para o gráfico de evolução (receitas x despesas por data).
  const serie = useMemo(() => {
    const mapa = new Map();
    filtradas.forEach(t => {
      const chave = t.data || '—';
      if (!mapa.has(chave)) mapa.set(chave, { data: chave, receita: 0, despesa: 0 });
      const item = mapa.get(chave);
      const v = Number(t.valor) || 0;
      if (v >= 0) item.receita += v;
      else item.despesa += Math.abs(v);
    });
    return [...mapa.values()].slice(-14);
  }, [filtradas]);

  const maxSerie = Math.max(1, ...serie.flatMap(s => [s.receita, s.despesa]));

  useEffect(() => {
    let ativo = true;
    api.getTransacoes()
      .then(lista => { if (ativo) setTransacoes(Array.isArray(lista) ? lista : []); })
      .catch(e => {
        console.error('Erro ao carregar transações:', e);
        toast('Erro ao carregar transações');
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [toast]);

  const receita = filtradas.filter(t => Number(t.valor) > 0).reduce((a, t) => a + Number(t.valor), 0);
  const despesa = Math.abs(filtradas.filter(t => Number(t.valor) < 0).reduce((a, t) => a + Number(t.valor), 0));
  const saldo = receita - despesa;

  // Projeção: fluxo diário médio (20 dias úteis) projetado em 30/60 dias.
  const fluxoDia = (receita - despesa) / 20;
  const projecao30 = saldo + fluxoDia * 30;
  const projecao60 = saldo + fluxoDia * 60;

  const kpis = [
    { label: 'Receita', valor: BRL(receita), cor: 'text-teal-600 dark:text-teal-400' },
    { label: 'Despesas', valor: BRL(despesa), cor: 'text-red-500 dark:text-red-400' },
    { label: 'Saldo', valor: BRL(saldo), cor: 'text-slate-800 dark:text-slate-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Financeiro</h1>
        <p className="text-sm text-slate-500">Fluxo de caixa e movimentações</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading ? (
          [0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          kpis.map(k => (
            <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
              <p className={`mt-2 text-2xl font-semibold tracking-tight ${k.cor}`}>{k.valor}</p>
            </div>
          ))
        )}
      </div>

      {/* Fluxo de caixa projetado */}
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de caixa projetado</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 gap-4 p-5 pt-0 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">Fluxo médio por dia</p>
            <p className={`mt-1 flex items-center gap-1 text-xl font-semibold ${fluxoDia >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500 dark:text-red-400'}`}>
              {fluxoDia >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {BRL(fluxoDia)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">Projeção em 30 dias</p>
            <p className={`mt-1 text-xl font-semibold ${projecao30 >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-500'}`}>
              {BRL(projecao30)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">Projeção em 60 dias</p>
            <p className={`mt-1 text-xl font-semibold ${projecao60 >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-500'}`}>
              {BRL(projecao60)}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução financeira (por data)</CardTitle>
        </CardHeader>
        <div className="px-5 pb-5">
          {loading ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : serie.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Sem dados no período.</p>
          ) : (
            <div>
              <div className="mb-2 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Receitas</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Despesas</span>
              </div>
              <svg viewBox="0 0 600 220" className="w-full" role="img" aria-label="Evolução de receitas e despesas">
                {serie.map((s, i) => {
                  const x = 40 + (i / Math.max(1, serie.length - 1)) * 520;
                  const hRec = (s.receita / maxSerie) * 160;
                  const hDes = (s.despesa / maxSerie) * 160;
                  return (
                    <g key={s.data}>
                      <rect x={x - 12} y={190 - hRec} width="10" height={hRec} rx="2" fill="#14b8a6">
                        <title>{`${s.data} — receitas ${BRL(s.receita)}`}</title>
                      </rect>
                      <rect x={x + 2} y={190 - hDes} width="10" height={hDes} rx="2" fill="#ef4444">
                        <title>{`${s.data} — despesas ${BRL(s.despesa)}`}</title>
                      </rect>
                      <text x={x} y={205} textAnchor="middle" fontSize="9" fill="#94a3b8">{s.data.slice(0, 5)}</text>
                    </g>
                  );
                })}
                <line x1="30" y1="190" x2="590" y2="190" stroke="#e2e8f0" strokeWidth="1" />
              </svg>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimentações recentes</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {['todas', 'receita', 'despesa'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoFiltro(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tipoFiltro === t ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
              >
                {t === 'todas' ? 'Todas' : t === 'receita' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
            <Select label="Período" value={periodoFiltro} onChange={setPeriodoFiltro} options={[{ value: 'tudo', label: 'Tudo' }, { value: '7d', label: 'Últimos 7 dias' }, { value: '30d', label: 'Últimos 30 dias' }]} />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 font-medium">Categoria</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-3">
                    <Skeleton className="h-12 rounded-lg" />
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-500">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                filtradas.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => setDetalhe(t)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    title="Clique para ver detalhes"
                  >
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{t.descricao}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.categoria}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{t.data}</td>
                    <td className={`px-5 py-3 text-right font-medium ${Number(t.valor) > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500 dark:text-red-400'}`}>
                      {BRL(t.valor)}
                    </td>
                    <td className="px-5 py-3"><Badge variant={t.tipo === 'receita' ? 'teal' : 'red'}>{t.tipo}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {detalhe && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Detalhe do lançamento">
          <button type="button" aria-label="Fechar" onClick={() => setDetalhe(null)} className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Lançamento</h2>
              <button type="button" onClick={() => setDetalhe(null)} aria-label="Fechar detalhe" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
              {[
                { label: 'Descrição', valor: detalhe.descricao },
                { label: 'Categoria', valor: detalhe.categoria },
                { label: 'Data', valor: detalhe.data },
                { label: 'Tipo', valor: detalhe.tipo },
                { label: 'Valor', valor: BRL(detalhe.valor) },
                { label: 'Documento vinculado', valor: /PED-|OC-|NF/i.test(detalhe.descricao || '') ? 'Identificado na descrição' : 'Avulso' },
              ].map(l => (
                <div key={l.label} className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-slate-500">{l.label}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{l.valor}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
