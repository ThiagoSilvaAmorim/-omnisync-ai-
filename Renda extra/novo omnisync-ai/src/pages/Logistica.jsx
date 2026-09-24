import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, Plus, Search, Truck, Info } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

const STATUS_CONFIG = {
  normal: { label: 'Normal', variant: 'teal' },
  baixo: { label: 'Baixo', variant: 'amber' },
  critico: { label: 'Crítico', variant: 'red' },
  excesso: { label: 'Excesso', variant: 'sky' },
};

// Links oficiais de rastreio por transportadora (abre em nova aba).
function urlRastreio(transportadora, codigo) {
  if (!codigo) return null;
  const t = (transportadora || '').toLowerCase();
  if (t.includes('correios')) return `https://www.linkcorreios.com.br/?id=${encodeURIComponent(codigo)}`;
  if (t.includes('jadlog')) return 'https://www.jadlog.com.br/siteInstitucional/tracking.jad';
  return null;
}

export function Logistica() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState({ status: 'todos', transportadora: 'todas' });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({
    entregasEmProgresso: 0,
    taxaEntregaOnTime: 0,
    custoMedioFrete: 0,
    pendentes: 0
  });
  const [entregas, setEntregas] = useState([]);
  const [transportadoras, setTransportadoras] = useState([]);
  const [modalTransportadora, setModalTransportadora] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [formTransportadora, setFormTransportadora] = useState({ nome: '', cnpj: '', status: 'ativa' });

  const setCampoTransportadora = campo => e => setFormTransportadora(f => ({ ...f, [campo]: e.target.value }));

  // Mesma busca automática de CNPJ do cadastro de fornecedor.
  const buscarCnpjTransportadora = async () => {
    const numeros = formTransportadora.cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
      toast('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeros}`);
      if (!res.ok) throw new Error(`Receita retornou ${res.status}`);
      const d = await res.json();
      setFormTransportadora(f => ({ ...f, nome: d.razao_social || d.nome_fantasia || f.nome }));
      toast(`Dados puxados da Receita: ${d.razao_social || 'empresa encontrada'}`);
    } catch (e) {
      console.error('Erro na consulta CNPJ:', e);
      toast('Não foi possível consultar o CNPJ agora');
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const salvarTransportadora = () => {
    if (!formTransportadora.nome.trim()) {
      toast('Preencha ao menos o nome da transportadora');
      return;
    }
    const nova = {
      id: `nova-${Date.now().toString(36)}`,
      nome: formTransportadora.nome.trim(),
      status: 'ativa',
    };
    setTransportadoras(prev => [nova, ...prev]);
    setFormTransportadora({ nome: '', cnpj: '', status: 'ativa' });
    setModalTransportadora(false);
    toast(`Transportadora "${nova.nome}" cadastrada`);
  };

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, entregasData, transportadorasData] = await Promise.all([
        api.getKpisLogistica(),
        api.getEntregas(),
        api.getTransportadoras(),
      ]);
      setKpisState(kpisData);
      setEntregas(Array.isArray(entregasData) ? entregasData : (entregasData.entregas || []));
      setTransportadoras(Array.isArray(transportadorasData) ? transportadorasData : []);
    } catch (e) {
      console.error('Erro ao carregar dados de logística:', e);
      toast('Erro ao carregar dados de logística');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const k = kpisState;
  const dadosKpis = [
    { label: 'Entregas em progresso', valor: k.entregasEmProgresso, destaque: true },
    { label: 'Taxa de entrega on-time', valor: `${k.taxaEntregaOnTime}%`, destaque: true },
    { label: 'Custo médio frete', valor: `R$ ${k.custoMedioFrete.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, destaque: false },
    { label: 'Pendentes', valor: k.pendentes, destaque: true },
  ];

  const filtrados = entregas.filter(e => {
    if (busca && !`${e.id} ${e.sku} ${e.destino}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.status !== 'todos' && e.status !== filtros.status) return false;
    if (filtros.transportadora !== 'todas' && e.transportadora !== filtros.transportadora) return false;
    return true;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 10));
  const paginaAtual = filtrados.slice((page - 1) * 10, page * 10);

  const kpiCards = dadosKpis.map((item) => (
    <div
      key={item.label}
      className={`rounded-xl border p-5 shadow-sm ${item.destaque
        ? 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}
      `}
    >
      <p className="text-xs font-medium text-slate-500">{item.label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${item.destaque ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}
      >
        {item.valor}
      </p>
    </div>
  ));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Gestão de Logística</h1>
          <p className="text-sm text-slate-500">Controle de entregas, transportadoras e prazos</p>
        </div>
        <div className="flex gap-2">
        <Button variant="secondary" onClick={() => {
          exportarCsv('logistica-omnisync.csv', [
            { titulo: 'ID', chave: 'id' },
            { titulo: 'SKU', chave: 'sku' },
            { titulo: 'Status', chave: 'status' },
            { titulo: 'Transportadora', chave: 'transportadora' },
            { titulo: 'Rastreio', chave: 'rastreio' },
          ], filtrados);
          toast(`${filtrados.length} envio(s) exportados em CSV`);
        }}>
          <Download className="h-4 w-4" /> Exportar relatório
        </Button>
          <Button onClick={() => setModalTransportadora(true)}>
            <Plus className="h-4 w-4" /> Nova transportadora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Select label="Status" value={filtros.status} onChange={v => setFiltros(f => ({ ...f, status: v }))} options={[{ value: 'todos', label: 'Todos' }, { value: 'em-rota', label: 'Em rota' }, { value: 'entregue', label: 'Entregue' }, { value: 'atrasado', label: 'Atrasado' }]} />
          <Select label="Transportadora" value={filtros.transportadora} onChange={v => setFiltros(f => ({ ...f, transportadora: v }))} options={[{ value: 'todas', label: 'Todas' }, ...transportadoras.map(t => ({ value: t.id, label: t.nome }))]} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rastreamento de Envios</CardTitle>
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="Buscar por SKU, ID ou Destinatário..."
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              type="text"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Entregas</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">ID</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 text-right font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Transportadora</th>
                  <th className="px-5 py-3 text-right font-medium">Destino</th>
                  <th className="px-5 py-3 font-medium">Rastreio</th>
                  <th className="px-5 py-3 font-medium">Est. Chegada</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-3">
                      <Skeleton className="h-12 rounded-lg" />
                    </td>
                  </tr>
                ) : paginaAtual.map(e => {
                  const s = STATUS_CONFIG[e.status] || { label: e.status, variant: 'gray' };
                  const link = urlRastreio(e.transportadora, e.rastreio);
                  const atrasado = e.status === 'atrasado';
                  return (
                    <tr key={e.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${atrasado ? 'bg-red-50/60 dark:bg-red-500/5' : ''}`}>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{e.id}</td>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{e.sku}</td>
                      <td className="px-5 py-3"><Badge variant={atrasado ? 'red' : s.variant}>{atrasado ? 'Atrasado' : s.label}</Badge></td>
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{e.transportadora}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-200">{e.cidade}, {e.uf}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {link ? (
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline" title={`Rastrear ${e.rastreio} no site da ${e.transportadora}`}>
                            {e.rastreio}
                          </a>
                        ) : (
                          <span className="text-slate-500">{e.rastreio || '—'}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{e.dataEntregaEstimada}</td>
                      <td className="px-5 py-3">
                        <Button variant="ghost" size="sm">
                          <Info className="h-4 w-4" /> Detalhes
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs text-slate-500">
              Página {page} de {totalPaginas}
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setPage(p => Math.min(totalPaginas, p + 1))} disabled={page === totalPaginas} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Entregas por Faixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { status: 'em-rota', percentual: 42 },
                { status: 'entregue', percentual: 35 },
                { status: 'atrasado', percentual: 23 },
              ].map(({ status, percentual }) => {
                const s = STATUS_CONFIG[status] || { label: status, variant: 'gray' };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{percentual}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Principais Transportadoras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transportadoras.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Truck className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{t.nome}</span>
                    <span className="text-xs text-slate-500">• {t.status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={modalTransportadora} onClose={() => setModalTransportadora(false)} title="Nova transportadora">
        <div className="space-y-3">
          <div>
            <Input label="CNPJ" value={formTransportadora.cnpj} onChange={setCampoTransportadora('cnpj')} placeholder="00.000.000/0000-00" />
            <button
              type="button"
              onClick={buscarCnpjTransportadora}
              disabled={buscandoCnpj}
              className="mt-1 text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
            >
              {buscandoCnpj ? 'Consultando Receita...' : 'Buscar dados automaticamente pelo CNPJ'}
            </button>
          </div>
          <Input label="Razão social / Nome" value={formTransportadora.nome} onChange={setCampoTransportadora('nome')} placeholder="Preenchido pelo CNPJ" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalTransportadora(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarTransportadora}>
            Cadastrar
          </Button>
        </div>
      </Modal>
    </div>
  );
}