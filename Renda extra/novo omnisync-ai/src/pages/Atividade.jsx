import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, Package, ShoppingCart, StickyNote } from 'lucide-react';
import { api } from '../services/api';
import { exportarCsv } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// ============================================
// Atividade — feed de eventos reais do backend
// (barramento em /api/events). Sem token ou sem
// eventos, a lista vem vazia: nada é inventado.
// ============================================

const ICONES = {
  pedido: { Icone: ShoppingCart, cor: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  compra: { Icone: Package, cor: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' },
  bo: { Icone: AlertTriangle, cor: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  nota: { Icone: StickyNote, cor: 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' },
};

const CHIP_FIXO = 'Todos';

function bucketDoEvento(ev) {
  const t = String(ev?.type || '').toLowerCase();
  const sev = String(ev?.severity || '').toLowerCase();
  if (sev === 'high' || sev === 'critical' || sev === 'alta') return 'bo';
  if (t.includes('purchase') || t.includes('compra') || t.includes('stock') || t.includes('estoque')) return 'compra';
  if (t.includes('order') || t.includes('pedido') || t.includes('sale') || t.includes('venda')) return 'pedido';
  if (t.includes('fiscal') || t.includes('reject') || t.includes('diverg') || t.includes('error') || t.includes('anomal')) return 'bo';
  return 'nota';
}

function textoDoEvento(ev) {
  const ref = ev?.entity_id ? ` — ${ev.entity_id}` : '';
  return `${ev?.type || 'evento'}${ref}`;
}

function valorDoEvento(ev) {
  const p = ev?.payload || {};
  const v = p.total ?? p.valor ?? p.value ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dataDoEvento(ev) {
  const d = ev?.timestamp ? new Date(ev.timestamp) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Interpreta comandos simples: "acima de R$ X" e "ontem"/"hoje".
function interpretarBusca(texto) {
  const t = (texto || '').toLowerCase();
  const valorMatch = /acima de\s*r?\$?\s*([\d.,]+)/.exec(t);
  const valorMin = valorMatch ? Number(valorMatch[1].replace(/\./g, '').replace(',', '.')) : null;
  const soOntem = t.includes('ontem');
  const termos = t
    .replace(/acima de\s*r?\$?\s*[\d.,]+/g, '')
    .replace(/ontem|hoje|filtrar|mostrar|apenas|só|falhas?/g, '')
    .trim();
  return { valorMin: Number.isFinite(valorMin) ? valorMin : null, soOntem, termos };
}

function parseData(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

export function Atividade() {
  const toast = useToast();
  const [chip, setChip] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const r = await api.fetchAtividadesComFiltros(new URLSearchParams({ limit: '100' }));
        const lista = Array.isArray(r) ? r : (Array.isArray(r?.eventos) ? r.eventos : []);
        if (!ativo) return;
        const mapeados = lista.map(ev => ({
          tipo: bucketDoEvento(ev),
          texto: textoDoEvento(ev),
          valor: valorDoEvento(ev),
          data: dataDoEvento(ev),
          prioridade: ['high', 'critical', 'alta'].includes(String(ev?.severity || '').toLowerCase()) ? 'alta' : null,
        }));
        const validos = mapeados.filter(e => e.data);
        validos.sort((a, b) => b.data.localeCompare(a.data));
        setEventos(validos);
      } catch {
        if (ativo) setEventos([]);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, []);

  const chips = useMemo(
    () => [CHIP_FIXO, ...[...new Set(eventos.map(e => e.tipo))]],
    [eventos],
  );

  const medianaValores = useMemo(() => {
    const valores = eventos.map(e => Number(e.valor)).filter(Number.isFinite).sort((a, b) => a - b);
    return valores.length ? valores[Math.floor(valores.length / 2)] : 0;
  }, [eventos]);

  const filtrados = eventos.filter(e => {
    if (chip !== 'Todos' && e.tipo !== chip) return false;
    const { valorMin, soOntem, termos } = interpretarBusca(busca);
    if (valorMin != null && !(Number(e.valor) > valorMin)) return false;
    if (soOntem) {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const d = parseData(e.data);
      if (!d || d.toDateString() !== ontem.toDateString()) return false;
    }
    if (termos && !`${e.texto}`.toLowerCase().includes(termos)) return false;
    return true;
  });

  // Destaque de anomalia: valor muito acima da mediana ou B.O. de alta prioridade.
  const ehAnomalia = e =>
    (e.tipo === 'pedido' && medianaValores > 0 && Number(e.valor) > medianaValores * 2) ||
    (e.tipo === 'bo' && e.prioridade === 'alta');

  // Agrupamento por data (blocos temporais).
  const grupos = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach(e => {
      if (!mapa.has(e.data)) mapa.set(e.data, []);
      mapa.get(e.data).push(e);
    });
    return [...mapa.entries()];
  }, [filtrados]);

  const exportar = () => {
    exportarCsv('atividade-omnisync.csv', [
      { titulo: 'Tipo', chave: 'tipo' },
      { titulo: 'Evento', chave: 'texto' },
      { titulo: 'Valor', chave: 'valor' },
      { titulo: 'Data', chave: 'data' },
    ], filtrados);
    toast('Histórico exportado em CSV');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Atividade</h1>
          <p className="text-sm text-slate-500">Tudo o que aconteceu no sistema em um só lugar</p>
        </div>
        <Button variant="secondary" onClick={exportar}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setChip(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${chip === c ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {c === 'Todos' ? 'Todos' : c === 'bo' ? 'B.O.' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <Input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder='Busque ou comande: "pedidos acima de R$ 1000", "B.O. de ontem"...'
      />

      <Card>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {carregando ? (
            <p className="p-8 text-center text-sm text-slate-500">Carregando eventos reais…</p>
          ) : grupos.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Nenhum evento neste filtro.</p>
          ) : (
            grupos.map(([data, itens]) => (
              <div key={data}>
                <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  {data} • {itens.length} evento(s)
                </p>
                {itens.map((e, i) => {
                  const { Icone, cor } = ICONES[e.tipo];
                  const anomalia = ehAnomalia(e);
                  return (
                    <div key={`${data}-${i}`} className={`flex items-center gap-3 p-4 ${anomalia ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cor}`}>
                        <Icone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                          {e.texto}
                          {anomalia && (
                            <Badge variant="amber" className="ml-2">Atenção</Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{e.data}</p>
                      </div>
                      {e.valor != null && (
                        <p className="font-medium text-slate-800 dark:text-slate-100">
                          R$ {Number(e.valor).toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
