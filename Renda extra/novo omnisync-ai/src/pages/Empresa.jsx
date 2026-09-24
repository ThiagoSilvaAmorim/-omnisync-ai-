import { useState } from 'react';
import { Building2, Save, Search } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// ============================================
// Empresa — configurações da empresa (persistidas
// em localStorage, usadas em notas e relatórios).
// CNPJ via BrasilAPI e CEP via ViaCEP (ambas
// públicas e sem chave). Alterações sensíveis
// (CNPJ/Pix) geram trilha de auditoria local.
// ============================================

const CHAVE = 'omnisync-empresa';
const CHAVE_AUDIT = 'omnisync-empresa-audit';

const PADRAO = {
  nome: 'OmniSync AI Ltda',
  email: 'contato@omnisync.ai',
  telefone: '(11) 99999-9999',
  cnpj: '00.000.000/0000-00',
  pix: 'pix@omnisync.ai',
  endereco: 'São Paulo, SP',
  cep: '',
  logo: '',
  certificado: '',
};

function lerAudit() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_AUDIT) || '[]');
  } catch {
    return [];
  }
}

export function Empresa() {
  const toast = useToast();

  const [form, setForm] = useState(() => {
    try {
      const salvo = localStorage.getItem(CHAVE);
      return salvo ? { ...PADRAO, ...JSON.parse(salvo) } : PADRAO;
    } catch {
      return PADRAO;
    }
  });
  const [buscando, setBuscando] = useState(false);
  const [audit, setAudit] = useState(lerAudit);

  const set = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }));

  const registrarAuditoria = (campo, antes, depois) => {
    const item = {
      quando: new Date().toLocaleString('pt-BR'),
      texto: `${campo} alterado de "${antes}" para "${depois}"`,
    };
    setAudit(prev => {
      const next = [item, ...prev].slice(0, 20);
      try {
        localStorage.setItem(CHAVE_AUDIT, JSON.stringify(next));
      } catch { /* sem persistência */ }
      return next;
    });
  };

  const salvar = () => {
    let anterior = PADRAO;
    try {
      anterior = { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') };
    } catch { /* usa padrão */ }
    if (form.cnpj !== anterior.cnpj) registrarAuditoria('CNPJ', anterior.cnpj, form.cnpj);
    if (form.pix !== anterior.pix) registrarAuditoria('Chave Pix', anterior.pix, form.pix);
    localStorage.setItem(CHAVE, JSON.stringify(form));
    toast('Dados da empresa salvos');
  };

  // Consulta pública de CNPJ (BrasilAPI, sem chave).
  const buscarCnpj = async () => {
    const numeros = form.cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
      toast('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeros}`);
      if (!res.ok) throw new Error(`Receita retornou ${res.status}`);
      const d = await res.json();
      setForm(f => ({
        ...f,
        nome: d.razao_social || f.nome,
        email: d.email || f.email,
        telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` : f.telefone,
        endereco: [d.logradouro, d.numero, d.municipio, d.uf].filter(Boolean).join(', ') || f.endereco,
      }));
      toast('Dados puxados da Receita Federal');
    } catch (e) {
      console.error('Erro na consulta CNPJ:', e);
      toast('Não foi possível consultar o CNPJ agora');
    } finally {
      setBuscando(false);
    }
  };

  // CEP via ViaCEP (público, sem chave).
  const buscarCep = async () => {
    const numeros = (form.cep || '').replace(/\D/g, '');
    if (numeros.length !== 8) {
      toast('Digite um CEP válido com 8 dígitos');
      return;
    }
    setBuscando(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${numeros}/json/`);
      const d = await res.json();
      if (d.erro) throw new Error('CEP não encontrado');
      setForm(f => ({ ...f, endereco: `${d.logradouro}, ${d.localidade} - ${d.uf}` }));
      toast('Endereço preenchido pelo CEP');
    } catch (e) {
      console.error('Erro na consulta CEP:', e);
      toast('Não foi possível consultar o CEP agora');
    } finally {
      setBuscando(false);
    }
  };

  const subirLogo = e => {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !arquivo.type.startsWith('image/')) {
      toast('Selecione um arquivo de imagem');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      setForm(f => ({ ...f, logo: String(leitor.result) }));
      toast('Logotipo carregado (prévia local)');
    };
    leitor.readAsDataURL(arquivo);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Configurações da Empresa</h1>
        <p className="text-sm text-slate-500">Dados usados nas notas fiscais, relatórios e página de venda</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {form.logo ? (
              <img src={form.logo} alt="Logotipo da empresa" className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <Building2 className="h-5 w-5 text-primary-500" />
            )}
            <CardTitle>Dados da empresa</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nome da empresa" value={form.nome} onChange={set('nome')} />
            <Input label="E-mail de contato" value={form.email} onChange={set('email')} />
            <Input label="Telefone / WhatsApp" value={form.telefone} onChange={set('telefone')} />
            <div>
              <Input label="CNPJ" value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" />
              <button
                type="button"
                onClick={buscarCnpj}
                disabled={buscando}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" /> {buscando ? 'Consultando...' : 'Puxar dados da Receita pelo CNPJ'}
              </button>
            </div>
            <Input label="Chave Pix" value={form.pix} onChange={set('pix')} />
            <Input label="CEP" value={form.cep} onChange={set('cep')} placeholder="00000-000" />
            <Input label="Endereço" value={form.endereco} onChange={set('endereco')} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={buscarCep} disabled={buscando}>
              Preencher endereço pelo CEP
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200">
              Enviar logotipo
              <input type="file" accept="image/*" className="hidden" onChange={subirLogo} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200" title="Anexo local; emissão via e-CAC exige integração com certificado (BLOCKED)">
              Anexar certificado A1
              <input
                type="file"
                accept=".pfx,.p12"
                className="hidden"
                onChange={e => {
                  const arq = e.target.files?.[0];
                  if (!arq) return;
                  setForm(f => ({ ...f, certificado: `${arq.name} (${Math.round(arq.size / 1024)} KB)` }));
                  toast('Certificado anexado localmente (emissão automática bloqueada sem integração e-CAC)');
                }}
              />
            </label>
          </div>
          {form.certificado && (
            <p className="mt-2 text-xs text-slate-500">Certificado: {form.certificado}</p>
          )}
          <div className="mt-5">
            <Button onClick={salvar}>
              <Save className="h-4 w-4" /> Salvar alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trilha de auditoria — dados sensíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {audit.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma alteração de CNPJ ou Pix registrada.</p>
          ) : (
            <div className="space-y-2">
              {audit.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                  <span className="text-slate-700 dark:text-slate-200">{a.texto}</span>
                  <span className="shrink-0 text-xs text-slate-400">{a.quando}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
