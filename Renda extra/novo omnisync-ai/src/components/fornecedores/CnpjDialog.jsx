import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Building2, Loader2, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../services/api';

// ============================================
// CnpjDialog — cadastro de fornecedor por
// CNPJ real (Receita via BrasilAPI):
// busca → preview (razão, situação, CNAE,
// endereço) → cria e navega ao detalhe.
// Não inventa dado: tudo vem do backend.
// ============================================

function mascaraCnpj(valor) {
  const d = String(valor || '').replace(/\D/g, '').slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

function anosDeAtividade(abertoEm) {
  if (!abertoEm) return null;
  const ano = new Date(abertoEm).getUTCFullYear();
  if (!ano || Number.isNaN(ano)) return null;
  return new Date().getUTCFullYear() - ano;
}

function situacaoEstilo(situacao) {
  if (situacao === 'ATIVA') return 'bg-teal-100 text-teal-700';
  return 'bg-red-100 text-red-700';
}

export function CnpjDialog({ open, onClose }) {
  const navigate = useNavigate();
  const [cnpj, setCnpj] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [erro, setErro] = useState('');

  const digitos = cnpj.replace(/\D/g, '');
  const completo = digitos.length === 14;

  const fechar = () => {
    if (criando) return;
    setCnpj('');
    setPreview(null);
    setErro('');
    onClose();
  };

  const buscar = async () => {
    if (!completo || carregando) return;
    setCarregando(true);
    setErro('');
    setPreview(null);
    try {
      const r = await api.buscarCnpjFornecedor(cnpj);
      setPreview(r);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  const criar = async () => {
    if (!preview || criando) return;
    setCriando(true);
    setErro('');
    try {
      const r = await api.criarFornecedorPorCnpj({ cnpj: digitos });
      const slug = r?.fornecedor?.slug;
      fechar();
      if (slug) navigate(`/fornecedores/${slug}`);
    } catch (e) {
      setErro(e.message);
      setCriando(false);
    }
  };

  const dados = preview?.dados;

  return (
    <Modal open={open} onClose={fechar} title="Adicionar fornecedor por CNPJ">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Os dados vêm da Receita Federal via BrasilAPI: razão social, situação cadastral, CNAE e endereço.
        </p>

        <div className="flex gap-2">
          <Input
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={e => setCnpj(mascaraCnpj(e.target.value))}
            onKeyDown={e => { if (e.key === 'Enter') buscar(); }}
            inputMode="numeric"
            data-testid="input-cnpj"
          />
          <div className="flex items-end pb-0.5">
            <Button onClick={buscar} disabled={!completo || carregando}>
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {carregando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>

        {erro && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {erro}
          </p>
        )}

        {dados && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50" data-testid="preview-cnpj">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={dados.razaoSocial || undefined}>
                  {dados.razaoSocial || dados.nomeFantasia || 'Sem razão social'}
                </p>
                {dados.nomeFantasia && dados.razaoSocial && (
                  <p className="truncate text-xs text-slate-500">Fantasia: {dados.nomeFantasia}</p>
                )}
              </div>
              {dados.situacaoCadastral && (
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${situacaoEstilo(dados.situacaoCadastral)}`}>
                  {dados.situacaoCadastral}
                </span>
              )}
            </div>

            <dl className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">CNPJ</dt>
                <dd className="font-medium">{dados.cnpj}</dd>
              </div>
              {dados.cnaeDescricao && (
                <div className="flex justify-between gap-2">
                  <dt className="shrink-0 text-slate-500">CNAE</dt>
                  <dd className="text-right font-medium">{dados.cnae}{dados.cnae ? ' — ' : ''}{dados.cnaeDescricao}</dd>
                </div>
              )}
              {dados.abertoEm && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Abertura</dt>
                  <dd className="font-medium">
                    {new Date(dados.abertoEm).toLocaleDateString('pt-BR')}
                    {(() => { const a = anosDeAtividade(dados.abertoEm); return a != null ? ` (${a} ano${a === 1 ? '' : 's'})` : ''; })()}
                  </dd>
                </div>
              )}
              {dados.capitalSocial != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Capital social</dt>
                  <dd className="font-medium">
                    {Number(dados.capitalSocial).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Endereço</dt>
                <dd className="text-right font-medium">
                  {[dados.endereco?.logradouro, dados.endereco?.numero && `nº ${dados.endereco.numero}`, dados.endereco?.bairro]
                    .filter(Boolean).join(', ') || '—'}
                  {dados.endereco?.city ? ` — ${dados.endereco.city}/${dados.endereco.uf}` : ''}
                </dd>
              </div>
            </dl>

            {preview.descricao && (
              <p className="text-xs italic text-slate-500">{preview.descricao}</p>
            )}

            {preview.jaCadastrado && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <BadgeCheck className="h-4 w-4 shrink-0" />
                Já cadastrado como “{preview.jaCadastrado.name}”.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={fechar} disabled={criando}>
            {preview?.jaCadastrado ? 'Fechar' : 'Cancelar'}
          </Button>
          {preview?.jaCadastrado ? (
            <Button
              onClick={() => { const s = preview.jaCadastrado.slug; fechar(); navigate(`/fornecedores/${s}`); }}
              disabled={criando}
            >
              <Building2 className="h-4 w-4" /> Ver fornecedor
            </Button>
          ) : (
            <Button onClick={criar} disabled={!preview || criando}>
              {criando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              {criando ? 'Cadastrando...' : 'Cadastrar fornecedor'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
