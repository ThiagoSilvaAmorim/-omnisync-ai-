import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Globe, MapPin, Phone, ShieldCheck, Star } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// FornecedorDetalhe — ficha com dados reais:
// fornecedor salvo, produtos vinculados pelo nome
// e ordens de compra reais. Sem dados inventados.
// ============================================

const STATUS_OC = {
  aguardando_aprovacao: 'amber',
  compra_aprovada: 'teal',
  enviado_ao_fornecedor: 'sky',
  cancelado: 'red',
  erro: 'red',
};

const BRL = v => Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FornecedorDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Marca a OC como enviada ao fornecedor (ação manual explícita).
  // Não compra, não paga e não acessa sites externos.
  const marcarEnviada = async (ordemId) => {
    try {
      const r = await api.marcarOcEnviada(ordemId);
      setOrdens(prev => prev.map(o => (o.id === ordemId ? { ...o, status: r?.ordem?.status || 'enviado_ao_fornecedor' } : o)));
      toast('Ordem marcada como enviada ao fornecedor');
    } catch (e) {
      toast(`Erro ao marcar envio: ${e.message}`);
    }
  };
  const [fornecedor, setFornecedor] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(null);
      setNaoEncontrado(false);
      try {
        const f = await api.getFornecedor(id);
        if (!ativo) return;
        if (!f) {
          setNaoEncontrado(true);
          return;
        }
        setFornecedor(f);
        const [prodData, ocData] = await Promise.all([
          api.getProdutos({ limit: 1000 }).catch(() => ({ produtos: [] })),
          api.listarOrdensCompra().catch(() => []),
        ]);
        if (!ativo) return;
        const listaProd = prodData?.produtos || prodData || [];
        setProdutos(Array.isArray(listaProd) ? listaProd.filter(p => p.fornecedor === f.nome) : []);
        const listaOc = Array.isArray(ocData) ? ocData : [];
        setOrdens(listaOc.filter(o => o.fornecedor === f.nome));
      } catch (e) {
        console.error('Erro ao carregar fornecedor:', e);
        if (!ativo) return;
        if (String(e?.message || '').includes('404') || String(e?.message || '').includes('não encontrado')) {
          setNaoEncontrado(true);
        } else {
          setErro('Erro ao carregar fornecedor. Tente novamente.');
        }
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/fornecedores')}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <p className="p-8 text-center text-sm text-red-600">{erro}</p>
        </Card>
      </div>
    );
  }

  if (naoEncontrado || !fornecedor) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/fornecedores')}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <EmptyState title="Fornecedor não encontrado" description="Volte para a lista de fornecedores." />
        </Card>
      </div>
    );
  }

  const totalOc = ordens.reduce((a, o) => a + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/fornecedores')}
          className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para fornecedores
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-semibold text-white">
            {(fornecedor.nome || '?').charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{fornecedor.nome}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="slate">{fornecedor.categoria || 'Geral'}</Badge>
              <Badge variant={fornecedor.verificado ? 'teal' : 'amber'}>
                {fornecedor.verificado ? (
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verificado</span>
                ) : 'Não verificado'}
              </Badge>
              <Badge variant="slate">Fonte: {fornecedor.fonte || '—'}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Contato + métricas reais */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fornecedor.endereco && (
              <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {fornecedor.endereco}
              </p>
            )}
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {fornecedor.telefone || '—'}
            </p>
            {fornecedor.site && (
              <a href={fornecedor.site.startsWith('http') ? fornecedor.site : `https://${fornecedor.site}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:underline">
                <Globe className="h-3.5 w-3.5" /> {fornecedor.site.replace(/^https?:\/\//, '')} ↗
              </a>
            )}
            {fornecedor.mapsUrl && (
              <a href={fornecedor.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                <ExternalLink className="h-3 w-3" /> Ver no Maps
              </a>
            )}
            {fornecedor.avaliacao != null && (
              <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <Star className="h-4 w-4 shrink-0 text-amber-400" /> {Number(fornecedor.avaliacao).toFixed(1)}
                {fornecedor.quantidadeAvaliacoes ? ` (${fornecedor.quantidadeAvaliacoes} avaliações)` : ''}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Métricas reais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total em ordens</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{BRL(totalOc)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ordens de compra</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{ordens.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Produtos vinculados</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{produtos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos vinculados (reais, pelo nome) */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos vinculados</CardTitle>
        </CardHeader>
        {produtos.length === 0 ? (
          <EmptyState title="Sem produtos" description="Nenhum produto do catálogo informa este fornecedor." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Produto</th>
                  <th className="px-5 py-3 font-medium">SKU</th>
                  <th className="px-5 py-3 text-right font-medium">Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {produtos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{p.nome}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                    <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{p.estoque ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ordens de compra reais */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens de compra</CardTitle>
        </CardHeader>
        {ordens.length === 0 ? (
          <EmptyState title="Sem ordens" description="Nenhuma ordem de compra para este fornecedor ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                    <th className="px-5 py-3 font-medium">Ordem</th>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Rastreio</th>
                    <th className="px-5 py-3 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ordens.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{o.id}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{o.data || '—'}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">{BRL(o.total)}</td>
                    <td className="px-5 py-3"><Badge variant="slate">{o.status}</Badge></td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{o.rastreio || '—'}</td>
                    <td className="px-5 py-3">
                      {o.status === 'compra_aprovada' && (
                        <button
                          type="button"
                          onClick={() => marcarEnviada(o.id)}
                          className="text-xs font-medium text-primary-600 hover:underline"
                        >
                          Marcar como enviado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
