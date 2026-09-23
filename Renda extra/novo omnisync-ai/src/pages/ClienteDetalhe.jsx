import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Phone, Plus, StickyNote, Tag } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

// ============================================
// ClienteDetalhe — ficha do cliente/loja com
// negócios associados (sub-tela do CRM).
// ============================================

const TIPO_VARIANT = { loja: 'indigo', pessoa: 'sky' };
const STATUS_VARIANT = { ativo: 'teal', vip: 'purple', inativo: 'slate', novo: 'sky' };
const ESTAGIO_VARIANT = { lead: 'slate', qualificado: 'sky', proposta: 'amber', fechado: 'teal', perdido: 'red' };

const BRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Data de hoje calculada uma única vez (fora do render).
const HOJE = new Date().toLocaleDateString('pt-BR');

const ICONE_TIPO = {
  nota: { Icone: StickyNote, cor: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' },
  ligacao: { Icone: Phone, cor: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400' },
  email: { Icone: Mail, cor: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
};

export function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [cliente, setCliente] = useState(null);
  const [listaNegocios, setListaNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [modalNegocio, setModalNegocio] = useState(false);
  const [formNegocio, setFormNegocio] = useState({ titulo: '', valor: '' });

  useEffect(() => {
    let ativo = true;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [clientes, negs] = await Promise.all([
          api.getClientes().catch(() => []),
          api.getNegocios().catch(() => []),
        ]);
        if (!ativo) return;
        const achado = (Array.isArray(clientes) ? clientes : []).find(c => c.id === Number(id)) || null;
        setCliente(achado);
        if (achado) {
          setListaNegocios(
            (Array.isArray(negs) ? negs : []).filter(n => n.cliente === achado.nome)
          );
        } else {
          setListaNegocios([]);
        }
      } catch (e) {
        console.error('Erro ao carregar cliente:', e);
        if (!ativo) return;
        setErro('Erro ao carregar cliente. Tente novamente.');
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => { ativo = false; };
  }, [id]);

  const negociosDoCliente = listaNegocios;

  const salvarNegocio = async () => {
    if (!formNegocio.titulo.trim() || !(Number(formNegocio.valor) > 0)) {
      toast('Preencha título e um valor válido');
      return;
    }
    try {
      const r = await api.criarNegocio({
        titulo: formNegocio.titulo.trim(),
        cliente: cliente.nome,
        valor: Number(formNegocio.valor),
      });
      setListaNegocios(prev => [r?.negocio || r, ...prev]);
      setFormNegocio({ titulo: '', valor: '' });
      setModalNegocio(false);
      toast('Negócio criado no estágio Lead');
    } catch (e) {
      toast(`Erro ao criar negócio: ${e.message}`);
    }
  };

  // Linha do tempo — notas adicionadas localmente.
  const [novaNota, setNovaNota] = useState('');
  const [novasNotas, setNovasNotas] = useState([]);

  const adicionarNota = () => {
    if (!novaNota.trim()) return;
    setNovasNotas(prev => [
      { id: `nota-${prev.length + 1}`, cliente: cliente.nome, tipo: 'nota', texto: novaNota.trim(), data: HOJE },
      ...prev,
    ]);
    setNovaNota('');
    toast('Nota adicionada à linha do tempo');
  };

  // Etiquetas (tags) do cliente — persistidas em localStorage.
  const [etiquetas, setEtiquetas] = useState(() => {
    const salvo = localStorage.getItem(`omnisync-etiquetas-${id}`);
    return salvo ? JSON.parse(salvo) : ['vip', 'recorrente'];
  });
  const [novaEtiqueta, setNovaEtiqueta] = useState('');

  const adicionarEtiqueta = () => {
    const t = novaEtiqueta.trim();
    if (!t || etiquetas.includes(t)) return;
    const novas = [...etiquetas, t];
    setEtiquetas(novas);
    localStorage.setItem(`omnisync-etiquetas-${id}`, JSON.stringify(novas));
    setNovaEtiqueta('');
  };

  const removerEtiqueta = t => {
    const novas = etiquetas.filter(x => x !== t);
    setEtiquetas(novas);
    localStorage.setItem(`omnisync-etiquetas-${id}`, JSON.stringify(novas));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <p className="p-8 text-center text-sm text-red-600">{erro}</p>
        </Card>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="space-y-6">
        <Button variant="secondary" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card>
          <EmptyState title="Cliente não encontrado" description="Volte para a carteira de clientes." />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/clientes')}
          className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para CRM
        </button>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-lg font-semibold text-white">
            {cliente.nome.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{cliente.nome}</h1>
            <div className="mt-1 flex gap-2">
              <Badge variant={TIPO_VARIANT[cliente.tipo]}>{cliente.tipo === 'loja' ? 'Loja' : 'Pessoa'}</Badge>
              <Badge variant={STATUS_VARIANT[cliente.status]}>{cliente.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Etiquetas */}
      <Card>
        <CardHeader>
          <CardTitle>Etiquetas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {etiquetas.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removerEtiqueta(t)}
                  className="rounded-full text-primary-500 transition-colors hover:text-red-500"
                  aria-label={`Remover ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
            {etiquetas.length === 0 && <span className="text-xs text-slate-400">Sem etiquetas</span>}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={novaEtiqueta}
              onChange={e => setNovaEtiqueta(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarEtiqueta()}
              placeholder="Adicionar etiqueta..."
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button size="sm" onClick={adicionarEtiqueta}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Informações + métricas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Mail className="h-4 w-4 text-slate-400" /> {cliente.email}
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Phone className="h-4 w-4 text-slate-400" /> {cliente.telefone}
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="h-4 w-4 text-slate-400" /> {cliente.cidade}
            </p>
            <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Tag className="h-4 w-4 text-slate-400" /> Segmento: {cliente.segmento}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Métricas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Pedidos</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{cliente.totalPedidos ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total gasto</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{BRL(cliente.totalGasto ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Último contato</p>
                <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">{cliente.ultimoContato || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha do tempo */}
      <Card>
        <CardHeader>
          <CardTitle>Linha do tempo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {novasNotas.map(i => {
            const { Icone, cor } = ICONE_TIPO[i.tipo] ?? ICONE_TIPO.nota;
            return (
              <div key={i.id} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cor}`}>
                  <Icone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-300">{i.texto}</p>
                  <p className="text-xs text-slate-400">{i.data}</p>
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <input
              type="text"
              value={novaNota}
              onChange={e => setNovaNota(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarNota()}
              placeholder="Adicionar uma nota sobre este cliente..."
              className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <Button size="sm" onClick={adicionarNota}>
              <Plus className="h-4 w-4" /> Nota
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Negócios */}
      <Card>
        <CardHeader>
          <CardTitle>Negócios associados</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => setModalNegocio(true)}>
            + Novo negócio
          </Button>
        </CardHeader>
        {negociosDoCliente.length === 0 ? (
          <EmptyState title="Sem negócios" description="Este cliente ainda não possui negócios no pipeline." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                  <th className="px-5 py-3 font-medium">Negócio</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Estágio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {negociosDoCliente.map(n => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{n.titulo}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{n.data}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">{BRL(n.valor)}</td>
                    <td className="px-5 py-3"><Badge variant={ESTAGIO_VARIANT[n.estagio]}>{n.estagio}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalNegocio} onClose={() => setModalNegocio(false)} title="Novo negócio">
        <div className="space-y-3">
          <Input label="Título *" value={formNegocio.titulo} onChange={e => setFormNegocio(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Reposição trimestral" />
          <Input label="Valor (R$) *" type="number" min="0" value={formNegocio.valor} onChange={e => setFormNegocio(f => ({ ...f, valor: e.target.value }))} />
          <p className="text-xs text-slate-500">O negócio entra no estágio Lead do pipeline.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNegocio(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarNegocio}>
            Criar negócio
          </Button>
        </div>
      </Modal>
    </div>
  );
}
