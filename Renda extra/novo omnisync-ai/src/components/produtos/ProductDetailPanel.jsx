import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AiActionButton } from '../ui/AiActionButton';

// ============================================
// ProductDetailPanel — painel lateral do produto
// com dados reais e ações de IA (rascunho, preço
// e estoque no ML, sempre com aprovação prévia).
// Margem nunca é exibida: o produto não tem custo.
// ============================================

export function ProductDetailPanel({ produto, onClose }) {
  const toast = useToast();
  const [rascunho, setRascunho] = useState(null);
  const [mlItemId, setMlItemId] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');
  const [apPreco, setApPreco] = useState(null);
  const [apEstoque, setApEstoque] = useState(null);
  const [apLoading, setApLoading] = useState(false);

  if (!produto) return null;

  const gerarRascunho = async () => api.gerarRascunhoAnuncio(produto.id);

  const solicitar = async (tipo) => {
    const action = tipo === 'preco' ? 'ml.price' : 'ml.stock';
    setApLoading(true);
    try {
      const r = await api.solicitarAprovacao({
        agente: 'PriceWatch',
        action,
        entityType: 'anuncio',
        entityId: mlItemId.trim(),
        payload: tipo === 'preco'
          ? { itemId: mlItemId.trim(), price: Number(novoPreco) }
          : { itemId: mlItemId.trim(), quantity: Number(novoEstoque) },
        motivo: `Alterar ${tipo === 'preco' ? 'preço' : 'estoque'} de "${produto.nome}" no Mercado Livre`,
      });
      if (tipo === 'preco') setApPreco({ id: r.id, status: r.status });
      else setApEstoque({ id: r.id, status: r.status });
      toast(`Aprovação ${r.id} criada — aprove na Central de IA`);
    } catch (e) {
      toast(`Erro ao solicitar aprovação: ${e.message}`);
    } finally {
      setApLoading(false);
    }
  };

  const verificar = async (tipo) => {
    const ap = tipo === 'preco' ? apPreco : apEstoque;
    if (!ap?.id || apLoading) return;
    setApLoading(true);
    try {
      const r = await api.getAprovacao(ap.id);
      if (tipo === 'preco') setApPreco({ id: r.id, status: r.status });
      else setApEstoque({ id: r.id, status: r.status });
    } catch (e) {
      toast(`Erro ao verificar aprovação: ${e.message}`);
    } finally {
      setApLoading(false);
    }
  };

  const aplicar = async (tipo) => {
    const ap = tipo === 'preco' ? apPreco : apEstoque;
    if (!ap || apLoading) return;
    setApLoading(true);
    try {
      if (tipo === 'preco') {
        await api.atualizarPrecoML(ap.id, mlItemId.trim(), Number(novoPreco));
      } else {
        await api.atualizarEstoqueML(ap.id, mlItemId.trim(), Number(novoEstoque));
      }
      toast(tipo === 'preco' ? 'Preço atualizado no Mercado Livre' : 'Estoque atualizado no Mercado Livre');
    } catch (e) {
      toast(`Falha ao aplicar: ${e.message}`);
    } finally {
      setApLoading(false);
    }
  };

  const blocoAlteracao = (tipo, label, valor, setValor, ap) => (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <Input
        label={tipo === 'preco' ? 'Novo preço (R$)' : 'Nova quantidade'}
        type="number"
        min="0"
        value={valor}
        onChange={e => (tipo === 'preco' ? setNovoPreco(e.target.value) : setNovoEstoque(e.target.value))}
        placeholder={tipo === 'preco' ? 'Ex: 99.90' : 'Ex: 10'}
      />
      {!ap ? (
        <Button size="sm" onClick={() => solicitar(tipo)} disabled={apLoading || !mlItemId.trim() || valor === ''}>
          Solicitar aprovação
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">
            Aprovação {ap.id}: <span className="font-medium">{ap.status}</span>
            {ap.status !== 'aprovada' && ' — aprove na Central de IA'}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => verificar(tipo)} disabled={apLoading}>
              Verificar status
            </Button>
            <Button
              size="sm"
              onClick={() => aplicar(tipo)}
              disabled={apLoading || ap.status !== 'aprovada'}
              title={ap.status !== 'aprovada' ? 'Aguarde aprovação na Central de IA' : 'Aplicar alteração real'}
            >
              Aplicar no ML
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Detalhe de ${produto.nome}`}>
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-slate-900/50" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{produto.nome}</h2>
            <p className="font-mono text-xs text-slate-500">SKU: {produto.sku || '—'}</p>
          </div>
          <button
            type="button"
            aria-label="Fechar detalhe"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Preço</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{formatCurrency(produto.preco ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Estoque</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{produto.estoque ?? 0} (mín. {produto.minimo ?? 0})</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Categoria</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{produto.categoria || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Status</p>
            <p><Badge variant="slate">{produto.status || '—'}</Badge></p>
          </div>
        </div>

        <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800">
          Margem indisponível: o produto não possui custo cadastrado.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ações de IA</p>
          <AiActionButton
            label="Gerar rascunho de anúncio"
            onRun={() => gerarRascunho()}
            onResult={(r) => { if (r?.ok) setRascunho(r); }}
          />
          {rascunho?.ok && (
            <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{rascunho.draft?.analysis}</p>
              <p className="mt-2 rounded bg-amber-50 p-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                Rascunho — nada foi publicado.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Alterar no Mercado Livre</p>
          <Input
            label="ID do anúncio ML"
            value={mlItemId}
            onChange={e => setMlItemId(e.target.value)}
            placeholder="Ex: MLB1234567890"
          />
          {blocoAlteracao('preco', 'Preço', novoPreco, setNovoPreco, apPreco)}
          {blocoAlteracao('estoque', 'Estoque', novoEstoque, setNovoEstoque, apEstoque)}
        </div>
      </aside>
    </div>
  );
}
