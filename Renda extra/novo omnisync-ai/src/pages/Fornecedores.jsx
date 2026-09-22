import { useEffect, useState } from 'react';
import { Download, ExternalLink, Globe, MapPin, Phone, Plus, Radar, Star, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv, formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// Fornecedores — empresas públicas (Google Places),
// lista salva e verificação comercial manual.
// Nada aqui é inventado: sem busca ou cadastro,
// a lista mostra estado vazio explícito.
// ============================================

const ESTADO_BUSCA = {
  IDLE: 'idle',
  LOADING: 'loading',
  RESULTADOS: 'resultados',
  SEM_RESULTADOS: 'sem-resultados',
  NAO_CONFIGURADO: 'nao-configurado',
  ERRO: 'erro',
};

export function Fornecedores() {
  const toast = useToast();
  const [aba, setAba] = useState('carteira');

  // ---- Lista salva (backend real) ----
  const [salvos, setSalvos] = useState([]);
  const [loadingSalvos, setLoadingSalvos] = useState(true);
  const [erroSalvos, setErroSalvos] = useState(null);

  // ---- Busca pública ----
  const [tipoBusca, setTipoBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [estadoBusca, setEstadoBusca] = useState(ESTADO_BUSCA.IDLE);
  const [resultados, setResultados] = useState([]);
  const [salvandoId, setSalvandoId] = useState(null);

  // ---- Radar IA (catálogo real) ----
  const [candidatos, setCandidatos] = useState([]);
  const [varrendo, setVarrendo] = useState(false);

  // ---- Modais ----
  const [modalNovo, setModalNovo] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [analiseFornId, setAnaliseFornId] = useState(null);
  const [analiseForn, setAnaliseForn] = useState(null);
  const [analisandoForn, setAnalisandoForn] = useState(false);
  const [verificando, setVerificando] = useState(null);
  const [formVerificar, setFormVerificar] = useState({
    vendeAtacado: false,
    aceitaRevenda: false,
    possuiNotaFiscal: false,
    possuiApi: false,
    prazoInformado: '',
    custoNegociado: '',
    observacao: '',
  });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [formFornecedor, setFormFornecedor] = useState({ nome: '', cnpj: '', categoria: '', contato: '', telefone: '', prazoEntrega: '', site: '' });

  const carregarSalvos = async () => {
    setLoadingSalvos(true);
    setErroSalvos(null);
    try {
      const lista = await api.getFornecedoresSalvos();
      setSalvos(Array.isArray(lista) ? lista : []);
    } catch (e) {
      console.error('Erro ao carregar fornecedores:', e);
      setErroSalvos('Erro ao carregar fornecedores. Tente novamente.');
      setSalvos([]);
    } finally {
      setLoadingSalvos(false);
    }
  };

  useEffect(() => {
    carregarSalvos();
  }, []);

  const buscarEmpresas = async () => {
    if (!tipoBusca.trim() || !cidadeBusca.trim()) {
      toast('Informe o tipo de fornecedor e a cidade');
      return;
    }
    setEstadoBusca(ESTADO_BUSCA.LOADING);
    setResultados([]);
    try {
      const r = await api.buscarFornecedoresPublicos(tipoBusca.trim(), cidadeBusca.trim());
      const lista = r?.fornecedores || [];
      setResultados(lista);
      setEstadoBusca(lista.length > 0 ? ESTADO_BUSCA.RESULTADOS : ESTADO_BUSCA.SEM_RESULTADOS);
    } catch (e) {
      console.error('Erro na busca pública:', e);
      const codigo = e?.code || '';
      if (codigo === 'GOOGLE_PLACES_NOT_CONFIGURED' || String(e?.message || '').includes('configurada')) {
        setEstadoBusca(ESTADO_BUSCA.NAO_CONFIGURADO);
      } else {
        setEstadoBusca(ESTADO_BUSCA.ERRO);
      }
    }
  };

  const salvarDaBusca = async (r) => {
    const chave = r.externalId || r.nome;
    setSalvandoId(chave);
    try {
      await api.salvarFornecedor({
        externalId: r.externalId,
        nome: r.nome,
        endereco: r.endereco,
        telefone: r.telefone,
        site: r.site,
        mapsUrl: r.mapsUrl,
        avaliacao: r.avaliacao,
        quantidadeAvaliacoes: r.quantidadeAvaliacoes,
        categoria: r.categoria,
        fonte: 'Google Places',
      });
      toast('Fornecedor salvo — ainda não verificado');
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao salvar fornecedor:', e);
      toast('Erro ao salvar fornecedor');
    } finally {
      setSalvandoId(null);
    }
  };

  // Análise Gemini do fornecedor salvo (resumo, pontos, riscos, perguntas de cotação).
  const analisarFornecedor = async (f) => {
    if (analiseFornId === f.id) {
      setAnaliseFornId(null);
      setAnaliseForn(null);
      return;
    }
    setAnalisandoForn(true);
    setAnaliseFornId(f.id);
    setAnaliseForn(null);
    try {
      const r = await api.analisarDominio('supplier', { fornecedorId: f.id });
      setAnaliseForn(r);
    } catch (e) {
      console.error('Erro na análise do fornecedor:', e);
      setAnaliseForn({ ok: false, message: e.message || 'Falha na análise.' });
    } finally {
      setAnalisandoForn(false);
    }
  };

  const abrirVerificar = (f) => {
    setVerificando(f);
    setFormVerificar({
      vendeAtacado: false,
      aceitaRevenda: false,
      possuiNotaFiscal: false,
      possuiApi: false,
      prazoInformado: '',
      custoNegociado: '',
      observacao: '',
    });
  };

  const confirmarVerificar = async () => {
    if (!verificando) return;
    if (formVerificar.prazoInformado.trim().length < 2) {
      toast('Informe o prazo comercial combinado');
      return;
    }
    try {
      await api.verificarFornecedor(verificando.id, {
        vendeAtacado: formVerificar.vendeAtacado,
        aceitaRevenda: formVerificar.aceitaRevenda,
        possuiNotaFiscal: formVerificar.possuiNotaFiscal,
        possuiApi: formVerificar.possuiApi,
        prazoInformado: formVerificar.prazoInformado.trim(),
        custoNegociado: formVerificar.custoNegociado === '' ? null : Number(formVerificar.custoNegociado),
        observacao: formVerificar.observacao.trim() || null,
      });
      toast(`"${verificando.nome}" marcado como verificado`);
      setVerificando(null);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao verificar fornecedor:', e);
      toast('Erro ao verificar fornecedor');
    }
  };

  const excluirFornecedor = async () => {
    if (!excluindo) return;
    try {
      await api.excluirFornecedor(excluindo.id);
      toast(`Fornecedor "${excluindo.nome}" excluído`);
      setExcluindo(null);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao excluir fornecedor:', e);
      toast('Erro ao excluir fornecedor');
    }
  };

  const setCampoFornecedor = campo => e => setFormFornecedor(f => ({ ...f, [campo]: e.target.value }));

  // Busca automática por CNPJ (BrasilAPI, pública e sem chave).
  const buscarCnpjFornecedor = async () => {
    const numeros = formFornecedor.cnpj.replace(/\D/g, '');
    if (numeros.length !== 14) {
      toast('Digite um CNPJ válido com 14 dígitos');
      return;
    }
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${numeros}`);
      if (!res.ok) throw new Error(`Receita retornou ${res.status}`);
      const d = await res.json();
      setFormFornecedor(f => ({
        ...f,
        nome: d.razao_social || d.nome_fantasia || f.nome,
        contato: d.email || f.contato,
        telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}` : f.telefone,
      }));
      toast(`Dados puxados da Receita: ${d.razao_social || 'empresa encontrada'}`);
    } catch (e) {
      console.error('Erro na consulta CNPJ:', e);
      toast('Não foi possível consultar o CNPJ agora');
    } finally {
      setBuscandoCnpj(false);
    }
  };

  const salvarFornecedor = async () => {
    if (!formFornecedor.nome.trim()) {
      toast('Preencha ao menos o nome do fornecedor');
      return;
    }
    try {
      await api.salvarFornecedor({
        nome: formFornecedor.nome.trim(),
        categoria: formFornecedor.categoria.trim() || 'Geral',
        telefone: formFornecedor.telefone.trim() || null,
        site: (formFornecedor.site || '').trim() || null,
        fonte: 'Manual',
        observacao: [
          formFornecedor.contato.trim() && `contato: ${formFornecedor.contato.trim()}`,
          formFornecedor.cnpj.replace(/\D/g, '') && `cnpj: ${formFornecedor.cnpj.replace(/\D/g, '')}`,
          Number(formFornecedor.prazoEntrega) > 0 && `prazo: ${formFornecedor.prazoEntrega} dias`,
        ].filter(Boolean).join(' · ') || null,
      });
      setFormFornecedor({ nome: '', cnpj: '', categoria: '', contato: '', telefone: '', prazoEntrega: '', site: '' });
      setModalNovo(false);
      toast('Fornecedor cadastrado — ainda não verificado');
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao cadastrar fornecedor:', e);
      toast('Erro ao cadastrar fornecedor');
    }
  };

  // Radar IA: deriva fornecedores candidatos do catálogo real (sem inventar dados).
  const varrerMercado = async () => {
    setVarrendo(true);
    try {
      const data = await api.getProdutos({ limit: 100 });
      const mapa = new Map();
      (data.produtos || []).forEach(p => {
        if (!p.fornecedor) return;
        if (!mapa.has(p.fornecedor)) mapa.set(p.fornecedor, { nome: p.fornecedor, produtos: 0, categorias: new Set() });
        const item = mapa.get(p.fornecedor);
        item.produtos += 1;
        if (p.categoria) item.categorias.add(p.categoria);
      });
      const listaBase = [...mapa.values()].map(c => ({ ...c, categorias: [...c.categorias] }));
      setCandidatos(listaBase);
      toast(listaBase.length ? `${listaBase.length} fornecedor(es) mapeado(s) da base real` : 'Nenhum fornecedor na base');
    } catch (e) {
      console.error('Erro na varredura:', e);
      toast('Erro na varredura de fornecedores');
    } finally {
      setVarrendo(false);
    }
  };

  const importarCandidato = async (c) => {
    try {
      await api.salvarFornecedor({ nome: c.nome, categoria: (c.categorias || []).join(', ') || 'Geral', fonte: 'Radar IA' });
      toast(`"${c.nome}" adicionado à base — ainda não verificado`);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao importar candidato:', e);
      toast('Erro ao adicionar à base');
    }
  };

  const exportarFornecedores = () => {
    exportarCsv('fornecedores-omnisync.csv', [
      { titulo: 'Nome', chave: 'nome' },
      { titulo: 'Categoria', chave: 'categoria' },
      { titulo: 'Telefone', chave: 'telefone' },
      { titulo: 'Site', chave: 'site' },
      { titulo: 'Fonte', chave: 'fonte' },
      { titulo: 'Verificado', chave: 'verificado' },
    ], salvos);
    toast('Fornecedores exportados em CSV');
  };

  const nomesNaBase = new Set(salvos.map(f => f.nome));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Fornecedores</h1>
          <p className="text-sm text-slate-500">Busque empresas públicas, salve e verifique manualmente</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Sem integração automática ativa — compras exigem aprovação manual</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportarFornecedores}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => setModalNovo(true)}>
            <Plus className="h-4 w-4" /> Novo fornecedor
          </Button>
        </div>
      </div>

      {/* Busca pública de empresas */}
      <Card>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:items-end">
          <Input label="Tipo de fornecedor/produto" value={tipoBusca} onChange={e => setTipoBusca(e.target.value)} placeholder="Ex: distribuidor de eletrônicos" />
          <Input label="Cidade/UF" value={cidadeBusca} onChange={e => setCidadeBusca(e.target.value)} placeholder="Ex: São Paulo SP" />
          <Button onClick={buscarEmpresas}>Buscar fornecedores reais</Button>
        </div>
        <div className="px-5 pb-5">
          {estadoBusca === 'idle' && (
            <p className="text-sm text-slate-500">Pesquise uma categoria e uma cidade para encontrar empresas públicas.</p>
          )}
          {estadoBusca === 'loading' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          )}
          {estadoBusca === 'nao-configurado' && (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              Busca pública ainda não configurada no servidor.
            </p>
          )}
          {estadoBusca === 'erro' && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              Não foi possível buscar empresas agora. Tente novamente.
            </p>
          )}
          {estadoBusca === 'sem-resultados' && (
            <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              Nenhuma empresa pública encontrada para essa busca.
            </p>
          )}
          {estadoBusca === 'resultados' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resultados.map(r => {
                const chave = r.externalId || r.nome;
                const jaSalvo = [...nomesNaBase].includes(r.nome);
                return (
                  <div key={chave} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{r.nome || '—'}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="slate">{r.categoria || 'Empresa'}</Badge>
                      <Badge variant="amber">Encontrado publicamente — não verificado</Badge>
                    </p>
                    {r.endereco && <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.endereco}</p>}
                    {r.telefone && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Phone className="h-3.5 w-3.5 shrink-0" />{r.telefone}</p>}
                    {r.avaliacao != null && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Star className="h-3.5 w-3.5 text-amber-400" />{Number(r.avaliacao).toFixed(1)}{r.quantidadeAvaliacoes ? ` (${r.quantidadeAvaliacoes} avaliações)` : ''}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.site && (
                        <a href={r.site.startsWith('http') ? r.site : `https://${r.site}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary-600 hover:underline">
                          Abrir site
                        </a>
                      )}
                      {r.mapsUrl && (
                        <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Maps
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={jaSalvo || salvandoId === chave}
                        onClick={() => salvarDaBusca(r)}
                        className="ml-auto text-xs font-medium text-primary-600 hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {jaSalvo ? 'Na minha lista' : salvandoId === chave ? 'Salvando...' : 'Adicionar à minha lista'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Abas de fornecedores">
        {['carteira', 'radar'].map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={aba === t}
            onClick={() => setAba(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${aba === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t === 'carteira' ? 'Meus Fornecedores' : 'Radar de IA & Oportunidades'}
          </button>
        ))}
      </div>

      {aba === 'carteira' ? (
        <div>
          {loadingSalvos ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : erroSalvos ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {erroSalvos}
            </p>
          ) : salvos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Nenhum fornecedor salvo ainda. Busque empresas públicas acima ou cadastre manualmente.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {salvos.map(f => (
                <Card key={f.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 font-semibold text-white">
                        {(f.nome || '?').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle>{f.nome}</CardTitle>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="slate">{f.categoria || 'Geral'}</Badge>
                          <Badge variant={f.verificado ? 'teal' : 'amber'}>
                            {f.verificado ? (
                              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verificado</span>
                            ) : 'Não verificado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {f.endereco && (
                      <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {f.endereco}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Phone className="h-4 w-4 shrink-0 text-slate-400" /> {f.telefone || '—'}
                    </p>
                    {f.site && (
                      <a href={f.site.startsWith('http') ? f.site : `https://${f.site}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:underline">
                        <Globe className="h-3.5 w-3.5" /> {f.site.replace(/^https?:\/\//, '')} ↗
                      </a>
                    )}
                    {f.mapsUrl && (
                      <a href={f.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline">
                        <ExternalLink className="h-3 w-3" /> Ver no Maps
                      </a>
                    )}
                    {f.avaliacao != null && (
                      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Star className="h-4 w-4 shrink-0 text-amber-400" /> {Number(f.avaliacao).toFixed(1)}{f.quantidadeAvaliacoes ? ` (${f.quantidadeAvaliacoes})` : ''}
                      </p>
                    )}
                    {f.verificado && (
                      <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {f.prazoInformado && <p>Prazo: {f.prazoInformado}</p>}
                        {f.custoNegociado != null && <p>Custo: {formatCurrency(f.custoNegociado)}</p>}
                        <p>
                          {[f.vendeAtacado && 'Atacado', f.aceitaRevenda && 'Revenda', f.possuiNotaFiscal && 'NF-e', f.possuiApi && 'API'].filter(Boolean).join(' • ') || '—'}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">Fonte: {f.fonte || '—'}</p>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        {!f.verificado && (
                          <button
                            type="button"
                            onClick={() => abrirVerificar(f)}
                            className="text-xs font-medium text-primary-600 hover:underline"
                          >
                            Marcar como verificado
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => analisarFornecedor(f)}
                          disabled={analisandoForn && analiseFornId === f.id}
                          className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                        >
                          {analisandoForn && analiseFornId === f.id ? 'Analisando...' : 'Analisar com Gemini'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExcluindo(f)}
                        title="Excluir"
                        aria-label={`Excluir ${f.nome}`}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {analiseFornId === f.id && analiseForn && (
                      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {analiseForn.ok ? (
                          <div className="space-y-1.5">
                            <p className="whitespace-pre-wrap">{analiseForn.analysis}</p>
                            {analiseForn.recommendations?.length > 0 && (
                              <p><span className="font-semibold">Recomendações:</span> {analiseForn.recommendations.join(' • ')}</p>
                            )}
                            {analiseForn.risks?.length > 0 && (
                              <p><span className="font-semibold">Riscos:</span> {analiseForn.risks.join(' • ')}</p>
                            )}
                            <p className="text-slate-400">
                              Confiança {Math.round((analiseForn.confidence ?? 0) * 100)}% • Qualidade {analiseForn.dataQuality}
                            </p>
                          </div>
                        ) : (
                          <p>{analiseForn.message || 'Sem análise no momento.'}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Radar className={`h-4 w-4 ${varrendo ? 'animate-spin text-primary-600' : ''}`} />
                {varrendo ? 'IA escaneando o catálogo por fornecedores...' : 'A varredura mapeia fornecedores reais do seu catálogo.'}
              </div>
              <Button variant="secondary" onClick={varrerMercado} disabled={varrendo}>
                {varrendo ? 'Varrendo...' : 'Varrer mercado'}
              </Button>
            </div>
          </Card>
          {candidatos.length === 0 ? (
            <Card>
              <p className="p-8 text-center text-sm text-slate-500">
                {varrendo ? <Skeleton className="mx-auto h-12 max-w-md rounded-lg" /> : 'Clique em "Varrer mercado" para mapear fornecedores.'}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidatos.map(c => {
                const naBase = salvos.some(f => f.nome === c.nome);
                return (
                  <Card key={c.nome}>
                    <div className="space-y-2 p-5">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{c.nome}</p>
                      <p className="text-xs text-slate-500">{c.produtos} produto(s) • {c.categorias.join(', ') || '—'}</p>
                      <Button
                        variant="secondary"
                        disabled={naBase}
                        onClick={() => importarCandidato(c)}
                        className="w-full"
                      >
                        {naBase ? 'Na base' : 'Adicionar à minha base'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo fornecedor">
        <div className="space-y-3">
          <div>
            <Input label="CNPJ" value={formFornecedor.cnpj} onChange={setCampoFornecedor('cnpj')} placeholder="00.000.000/0000-00" />
            <button
              type="button"
              onClick={buscarCnpjFornecedor}
              disabled={buscandoCnpj}
              className="mt-1 text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
            >
              {buscandoCnpj ? 'Consultando Receita...' : 'Buscar dados automaticamente pelo CNPJ'}
            </button>
          </div>
          <Input label="Razão social / Nome" value={formFornecedor.nome} onChange={setCampoFornecedor('nome')} placeholder="Preenchido pelo CNPJ" />
          <Input label="Link do site" value={formFornecedor.site} onChange={setCampoFornecedor('site')} placeholder="https://..." />
          <Input label="Categoria" value={formFornecedor.categoria} onChange={setCampoFornecedor('categoria')} placeholder="Ex: Marcenaria" />
          <Input label="E-mail de contato" value={formFornecedor.contato} onChange={setCampoFornecedor('contato')} />
          <Input label="Telefone" value={formFornecedor.telefone} onChange={setCampoFornecedor('telefone')} />
          <Input label="Prazo de entrega (dias)" type="number" min="0" value={formFornecedor.prazoEntrega} onChange={setCampoFornecedor('prazoEntrega')} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNovo(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarFornecedor}>
            Cadastrar
          </Button>
        </div>
      </Modal>

      <Modal open={!!verificando} onClose={() => setVerificando(null)} title={`Verificar ${verificando?.nome ?? ''}`}>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">A avaliação do Google não basta: confirme os dados comerciais abaixo.</p>
          {[
            ['vendeAtacado', 'Vende no atacado'],
            ['aceitaRevenda', 'Aceita revenda'],
            ['possuiNotaFiscal', 'Emite nota fiscal'],
            ['possuiApi', 'Possui API/integração'],
          ].map(([campo, rotulo]) => (
            <label key={campo} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={!!formVerificar[campo]}
                onChange={e => setFormVerificar(f => ({ ...f, [campo]: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              {rotulo}
            </label>
          ))}
          <Input label="Prazo informado (obrigatório)" value={formVerificar.prazoInformado} onChange={e => setFormVerificar(f => ({ ...f, prazoInformado: e.target.value }))} placeholder="Ex: 3 a 5 dias" />
          <Input label="Custo negociado (R$)" type="number" min="0" value={formVerificar.custoNegociado} onChange={e => setFormVerificar(f => ({ ...f, custoNegociado: e.target.value }))} placeholder="Opcional" />
          <Input label="Observação" value={formVerificar.observacao} onChange={e => setFormVerificar(f => ({ ...f, observacao: e.target.value }))} placeholder="Contato confirmado pelo usuário" />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setVerificando(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmarVerificar}>
            Marcar como verificado
          </Button>
        </div>
      </Modal>

      <Modal open={!!excluindo} onClose={() => setExcluindo(null)} title="Excluir fornecedor">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir <span className="font-semibold">{excluindo?.nome}</span>?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <button
            type="button"
            onClick={excluirFornecedor}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}
