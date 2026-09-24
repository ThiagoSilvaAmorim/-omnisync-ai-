import { useEffect, useState } from 'react';
import { AlertTriangle, Download, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { calcularSimulador, useSimulador } from '../hooks/useSimulador';
import { useToast } from '../hooks/useToast';
import { exportarCsv } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

// ============================================
// Tela 05 — Simulador de Negócio.
// Formulário de custos à esquerda e resultados
// calculados em tempo real à direita.
// Comparação multi-marketplace: a taxa de cada
// canal é editável pelo usuário (nunca inventada).
// Sem custo de compra, exibe "cálculo incompleto"
// em vez de margem inventada.
// ============================================

const BRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MARKETPLACES_PADRAO = [
  { id: 'ml', nome: 'Mercado Livre', taxa: 16 },
  { id: 'shopee', nome: 'Shopee', taxa: 14 },
  { id: 'tiktok', nome: 'TikTok Shop', taxa: 8 },
];

export function Simulador() {
  const toast = useToast();

  const [custo, setCusto] = useState(50);
  const [frete, setFrete] = useState(10);
  const [embalagem, setEmbalagem] = useState(3);
  const [impostos, setImpostos] = useState(18);
  const [taxa, setTaxa] = useState(15);
  const [preco, setPreco] = useState(120);
  const [precoB, setPrecoB] = useState(139);
  const [quantidade, setQuantidade] = useState(100);
  const [catalogo, setCatalogo] = useState([]);
  const [produtoId, setProdutoId] = useState('');
  const [taxasMarketplace, setTaxasMarketplace] = useState(
    () => Object.fromEntries(MARKETPLACES_PADRAO.map(m => [m.id, m.taxa]))
  );
  const [historico, setHistorico] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexora-simulacoes') || '[]');
    } catch {
      return [];
    }
  });

  // Catálogo real para preencher preço/custo sem redigitação.
  useEffect(() => {
    let ativo = true;
    api.getProdutos({ limit: 100 })
      .then(d => { if (ativo) setCatalogo(d.produtos || []); })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  const usarProduto = id => {
    setProdutoId(id);
    const p = catalogo.find(x => String(x.id) === String(id));
    if (!p) return;
    setPreco(Number(p.preco) || 0);
    setCusto(Number((Number(p.preco) || 0) * 0.6).toFixed(2));
    toast(`Parâmetros preenchidos a partir de "${p.nome}" (custo estimado em 60% do preço)`);
  };

  // Embalagem e operação entram no custo base da simulação.
  const custoTotal = Number(custo) + Number(embalagem);
  const semCustoReal = custoTotal <= 0;
  const r = useSimulador({ custo: custoTotal, frete, impostos, taxa, preco, quantidade });
  const rB = useSimulador({ custo: custoTotal, frete, impostos, taxa, preco: precoB, quantidade });

  // Comparação por marketplace: mesma base de custo, taxa editável por canal.
  // Usa cálculo puro (não o hook) para não quebrar rules-of-hooks no .map.
  const comparacaoMarketplaces = MARKETPLACES_PADRAO.map(m => {
    const taxaCanal = Number(taxasMarketplace[m.id]) || 0;
    const res = calcularSimulador({ custo: custoTotal, frete, impostos, taxa: taxaCanal, preco, quantidade });
    return { ...m, taxa: taxaCanal, res };
  });

  const salvarSimulacao = () => {
    const item = {
      quando: new Date().toLocaleString('pt-BR'),
      preco: Number(preco),
      margem: Number(r.margem.toFixed(1)),
      lucro: Number(r.lucroTotal.toFixed(2)),
    };
    setHistorico(prev => {
      const next = [item, ...prev].slice(0, 10);
      try {
        localStorage.setItem('nexora-simulacoes', JSON.stringify(next));
      } catch { /* sem persistência */ }
      return next;
    });
    toast('Simulação salva no histórico');
  };

  // Validação IA por faixa de margem — só quando há custo real.
  const iaMensagem = semCustoReal
    ? 'Cálculo incompleto: informe o custo de compra e a embalagem para avaliar a margem com segurança.'
    : r.margem > 20
      ? 'Sim, margem saudável. O produto tem boa folga para lucro.'
      : r.margem >= 10
        ? 'Atenção, margem apertada. Considere negociar custo ou reajustar preço.'
        : 'Não recomendado. A margem está abaixo do mínimo viável.';

  const resultadoLinha = (label, valor, destaque = false) => (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`font-semibold ${destaque ? 'text-primary-600 dark:text-primary-400' : 'text-slate-800 dark:text-slate-100'}`}>
        {valor}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Simulador de Negócio</h1>
        <p className="text-sm text-slate-500">Calcule lucro, ROI e ponto de equilíbrio em tempo real</p>
      </div>

      {semCustoReal && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Cálculo incompleto — sem custo de compra ou embalagem informados, margem e lucro não são confiáveis.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
          <CardTitle>Parâmetros da simulação</CardTitle>
        </CardHeader>
          <div className="px-5 pt-1">
            <Select
              label="Produto do catálogo (preenche preço automaticamente)"
              value={produtoId}
              onChange={usarProduto}
              options={[{ value: '', label: 'Simulação manual' }, ...catalogo.map(p => ({ value: String(p.id), label: `${p.sku} — ${p.nome}` }))]}
            />
          </div>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Custo de compra (R$)" type="number" min="0" value={custo} onChange={e => setCusto(Number(e.target.value))} />
            <Input label="Embalagem e operação por unidade (R$)" type="number" min="0" value={embalagem} onChange={e => setEmbalagem(Number(e.target.value))} />
            <Input label="Frete (R$)" type="number" min="0" value={frete} onChange={e => setFrete(Number(e.target.value))} />
            <Input label="Impostos (%)" type="number" min="0" value={impostos} onChange={e => setImpostos(Number(e.target.value))} />
            <Input label="Taxa do marketplace (%)" type="number" min="0" value={taxa} onChange={e => setTaxa(Number(e.target.value))} />
            <Input label="Preço de venda (R$)" type="number" min="0" value={preco} onChange={e => setPreco(Number(e.target.value))} />
            <Input label="Quantidade" type="number" min="0" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} />
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              {resultadoLinha('Lucro unitário', semCustoReal ? '—' : BRL(r.lucroUnitario), true)}
              {resultadoLinha('Lucro total', semCustoReal ? '—' : BRL(r.lucroTotal), true)}
              {resultadoLinha('ROI', semCustoReal ? '—' : `${r.roi.toFixed(1)}%`)}
              {resultadoLinha('Margem', semCustoReal ? '—' : `${r.margem.toFixed(1)}%`)}
              {resultadoLinha('Ponto de equilíbrio', r.pontoEquilibrio === null ? '—' : `${r.pontoEquilibrio} unidades`)}
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cenário B (comparar preço)</p>
              <Input label="Preço alternativo (R$)" type="number" min="0" value={precoB} onChange={e => setPrecoB(Number(e.target.value))} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="text-[11px] text-slate-500">Margem B</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{semCustoReal ? '—' : `${rB.margem.toFixed(1)}%`}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="text-[11px] text-slate-500">Lucro B</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{semCustoReal ? '—' : BRL(rB.lucroTotal)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="text-[11px] text-slate-500">Δ margem</p>
                  <p className={`font-semibold ${rB.margem - r.margem >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                    {semCustoReal ? '—' : `${(rB.margem - r.margem >= 0 ? '+' : '') + (rB.margem - r.margem).toFixed(1)} p.p.`}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparação multi-marketplace — taxa editável, nunca inventada */}
            <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Comparação por marketplace</p>
              <p className="mb-3 text-xs text-slate-400">
                Ajuste a taxa real de cada canal. Sem custo de compra, o cálculo fica incompleto.
              </p>
              <div className="space-y-3">
                {comparacaoMarketplaces.map(m => (
                  <div key={m.id} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-5">
                      <label className="block text-xs text-slate-500">{m.nome}</label>
                      <input
                        type="number"
                        min="0"
                        value={taxasMarketplace[m.id]}
                        onChange={e => setTaxasMarketplace(t => ({ ...t, [m.id]: Number(e.target.value) }))}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        aria-label={`Taxa ${m.nome} (%)`}
                      />
                    </div>
                    <div className="col-span-3 text-center">
                      <p className="text-[11px] text-slate-500">Lucro un.</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {semCustoReal ? '—' : BRL(m.res.lucroUnitario)}
                      </p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-[11px] text-slate-500">Margem</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {semCustoReal ? '—' : `${m.res.margem.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-[11px] text-slate-500">Lucro tot.</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {semCustoReal ? '—' : BRL(m.res.lucroTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {historico.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Histórico salvo</p>
                <div className="space-y-1.5">
                  {historico.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                      <span className="text-slate-500">{h.quando}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">R$ {h.preco} • {h.margem}% • {BRL(h.lucro)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={salvarSimulacao}>
                Salvar simulação
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCusto(50); setFrete(10); setImpostos(18); setTaxa(15); setPreco(120); setQuantidade(100);
                  toast('Simulação reiniciada');
                }}
              >
                <RefreshCw className="h-4 w-4" /> Simular novamente
              </Button>
              <Button onClick={() => {
                exportarCsv('simulacao-omnisync.csv', [
                  { titulo: 'Métrica', chave: 'metrica' },
                  { titulo: 'Cenário A', chave: 'a' },
                  { titulo: 'Cenário B', chave: 'b' },
                ], [
                  { metrica: 'Preço', a: preco, b: precoB },
                  { metrica: 'Lucro unitário', a: r.lucroUnitario.toFixed(2), b: rB.lucroUnitario.toFixed(2) },
                  { metrica: 'Lucro total', a: r.lucroTotal.toFixed(2), b: rB.lucroTotal.toFixed(2) },
                  { metrica: 'Margem %', a: r.margem.toFixed(1), b: rB.margem.toFixed(1) },
                  { metrica: 'ROI %', a: r.roi.toFixed(1), b: rB.roi.toFixed(1) },
                ]);
                toast('Análise exportada em CSV');
              }}>
                <Download className="h-4 w-4" /> Exportar análise
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validação IA */}
      <div className="rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 p-6 dark:from-primary-500/10 dark:to-primary-500/10 dark:ring-1 dark:ring-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Validação IA — OmniAdvisor</h2>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{iaMensagem}</p>
      </div>
    </div>
  );
}
