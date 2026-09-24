import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Download, Globe, History, MapPin, Phone, Plus, Radar, Search, ShieldCheck, Star, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { exportarCsv, formatDate, formatCurrency, openStreetMapUrl } from '../lib/utils';
import { UFS } from '../data/ufs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { AiActionButton } from '../components/ui/AiActionButton';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SidePanel } from '../components/ui/SidePanel';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// Fornecedores — base local OpenStreetMap (GET /api/suppliers),
// importação Nominatim+Overpass, lista salva e verificação
// comercial manual. Abas SNV. Nada inventado: sem busca, estado vazio.
// ============================================

const ESTADO_BUSCA = {
  IDLE: 'idle',
  LOADING: 'loading',
  RESULTADOS: 'resultados',
  SEM_RESULTADOS: 'sem-resultados',
  ERRO: 'erro',
};

const DEBOUNCE_BUSCA_MS = 450;

export function Fornecedores() {
  const toast = useToast();
  const [aba, setAba] = useState('carteira');

  // ---- Lista salva (backend real) ----
  const [salvos, setSalvos] = useState([]);
  const [loadingSalvos, setLoadingSalvos] = useState(true);
  const [erroSalvos, setErroSalvos] = useState(null);

  // ---- Busca local OSM (banco suppliers) ----
  const [qBusca, setQBusca] = useState('');
  const [ufBusca, setUfBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState([]);
  const [estadoBusca, setEstadoBusca] = useState(ESTADO_BUSCA.IDLE);
  const [resultados, setResultados] = useState([]);
  const [importando, setImportando] = useState(false);
  const [ultimaImport, setUltimaImport] = useState(null);
  const debounceRef = useRef(null);

  // ---- Radar IA (catálogo real) ----
  const [candidatos, setCandidatos] = useState([]);
  const [varrendo, setVarrendo] = useState(false);

  // ---- Modais / painel ----
  const [modalNovo, setModalNovo] = useState(false);
  const [excluindo, setExcluindo] = useState(null);
  const [analiseFornId, setAnaliseFornId] = useState(null);
  const [analiseForn, setAnaliseForn] = useState(null);
  const [verificando, setVerificando] = useState(null);
  const [painel, setPainel] = useState(null);
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

  const buscarLocais = useCallback(async ({ mostrarVazio = true } = {}) => {
    const temFiltro = !!(ufBusca || cidadeBusca.trim() || qBusca.trim());
    if (!temFiltro) {
      setEstadoBusca(ESTADO_BUSCA.IDLE);
      setResultados([]);
      return;
    }
    setEstadoBusca(ESTADO_BUSCA.LOADING);
    try {
      const r = await api.getSuppliers({
        q: qBusca.trim() || undefined,
        uf: ufBusca || undefined,
        cidade: cidadeBusca.trim() || undefined,
      });
      const lista = r?.fornecedores || [];
      setResultados(lista);
      setEstadoBusca(
        lista.length > 0
          ? ESTADO_BUSCA.RESULTADOS
          : mostrarVazio
            ? ESTADO_BUSCA.SEM_RESULTADOS
            : ESTADO_BUSCA.IDLE
      );
    } catch (e) {
      console.error('Erro na busca local:', e);
      setEstadoBusca(ESTADO_BUSCA.ERRO);
      setResultados([]);
    }
  }, [qBusca, ufBusca, cidadeBusca]);

  // Debounce: digitação na busca local não martela a API.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buscarLocais({ mostrarVazio: true });
    }, DEBOUNCE_BUSCA_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [buscarLocais]);

  // Cidades da UF: IBGE (oficial) + as já importadas na base local.
  useEffect(() => {
    let vivo = true;
    if (!ufBusca) {
      setCidadesDisponiveis([]);
      return () => {
        vivo = false;
      };
    }
    Promise.allSettled([
      api.getMunicipiosIbge(ufBusca),
      api.getSuppliersCidades(ufBusca),
    ]).then(([ibge, local]) => {
      if (!vivo) return;
      const listaIbge = ibge?.status === 'fulfilled' ? (ibge.value?.cidades || []) : [];
      const listaLocal = local?.status === 'fulfilled' ? (local.value?.cidades || []) : [];
      const merged = [...new Set([...listaIbge, ...listaLocal])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      setCidadesDisponiveis(merged);
    });
    return () => {
      vivo = false;
    };
  }, [ufBusca]);

  const importarDoMapa = async () => {
    if (!ufBusca || !cidadeBusca.trim()) {
      toast('Selecione a UF e a cidade para buscar no OpenStreetMap');
      return;
    }
    setImportando(true);
    setUltimaImport(null);
    try {
      const r = await api.importSuppliersOsm({
        uf: ufBusca,
        cidade: cidadeBusca.trim(),
        categoria: qBusca.trim() || undefined,
      });
      const lista = r?.fornecedores || [];
      setResultados(lista);
      setEstadoBusca(lista.length > 0 ? ESTADO_BUSCA.RESULTADOS : ESTADO_BUSCA.SEM_RESULTADOS);
      setUltimaImport({
        novos: r?.novos ?? 0,
        cacheado: !!r?.cacheado,
        mensagem: r?.mensagem || '',
      });
      toast(r?.mensagem || 'Importação do OpenStreetMap concluída');
      if (ufBusca) {
        api.getSuppliersCidades(ufBusca)
          .then(c => setCidadesDisponiveis(c?.cidades || []))
          .catch(() => {});
      }
    } catch (e) {
      console.error('Erro ao importar OSM:', e);
      toast(e?.message || 'Não foi possível buscar no OpenStreetMap agora');
      setEstadoBusca(ESTADO_BUSCA.ERRO);
    } finally {
      setImportando(false);
    }
  };

  const salvarDaBusca = async (r) => {
    try {
      await api.salvarFornecedor({
        externalId: r.osmId || null,
        nome: r.nome,
        endereco: r.endereco,
        telefone: r.telefone,
        site: r.site,
        categoria: r.categoria,
        fonte: 'OpenStreetMap',
      });
      toast('Fornecedor salvo — ainda não verificado');
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao salvar fornecedor:', e);
      toast('Erro ao salvar fornecedor');
    }
  };

  const analisarFornecedor = async (f) => {
    setAnaliseFornId(f.id);
    setAnaliseForn(null);
    return api.analisarDominio('supplier', { fornecedorId: f.id });
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

  const visiveis = salvos.filter(f => {
    if (aba === 'favoritos') return f.favorito && !f.arquivado;
    if (aba === 'arquivados') return !!f.arquivado;
    return !f.arquivado;
  });

  const textoVazioAba =
    aba === 'favoritos'
      ? 'Nenhum favorito ainda. Marque ★ nos fornecedores.'
      : aba === 'arquivados'
        ? 'Nenhum fornecedor arquivado.'
        : 'Nenhum fornecedor salvo ainda. Busque empresas públicas acima ou cadastre manualmente.';

  const abrirPainel = (f) => setPainel(f);

  const alternarFavorito = async (f) => {
    try {
      await api.favoritarFornecedor(f.id, !f.favorito);
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao favoritar:', e);
      toast('Erro ao favoritar fornecedor');
    }
  };

  const alternarArquivado = async (f) => {
    try {
      await api.arquivarFornecedor(f.id, !f.arquivado);
      toast(f.arquivado ? 'Fornecedor restaurado' : 'Fornecedor arquivado');
      carregarSalvos();
    } catch (e) {
      console.error('Erro ao arquivar:', e);
      toast('Erro ao arquivar fornecedor');
    }
  };

  const abas = [
    { id: 'resultados', label: 'Resultados públicos' },
    { id: 'carteira', label: 'Meus fornecedores' },
    { id: 'favoritos', label: 'Favoritos' },
    { id: 'arquivados', label: 'Arquivados' },
    { id: 'radar', label: 'Radar de IA' },
  ];

  const renderStatusBusca = (vazio) => {
    if (estadoBusca === ESTADO_BUSCA.IDLE) {
      return (
        <div className={`rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 ${vazio ? 'p-8' : ''}`}>
          <p>
            {vazio
              ? 'Busque acima para listar fornecedores da base local. Nenhuma busca executada ainda.'
              : 'Pesquise uma cidade (UF + cidade) para encontrar fornecedores públicos no OpenStreetMap.'}
          </p>
          {!vazio && (
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={importando || !ufBusca || !cidadeBusca.trim()}
              onClick={importarDoMapa}
            >
              <Search className="h-4 w-4" />
              {importando ? 'Buscando no mapa...' : 'Buscar novos no mapa'}
            </Button>
          )}
        </div>
      );
    }
    if (estadoBusca === ESTADO_BUSCA.LOADING) {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      );
    }
    if (estadoBusca === ESTADO_BUSCA.ERRO) {
      return (
        <p className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Não foi possível buscar fornecedores agora. Tente novamente.
        </p>
      );
    }
    if (estadoBusca === ESTADO_BUSCA.SEM_RESULTADOS) {
      return (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          <p>Nenhum fornecedor na base local para esse filtro.</p>
          <p className="mt-1 text-xs">
            Use <strong>Buscar novos no mapa</strong> para importar do OpenStreetMap
            {ufBusca && cidadeBusca ? ` (${cidadeBusca}/${ufBusca})` : ''}.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            disabled={importando || !ufBusca || !cidadeBusca.trim()}
            onClick={importarDoMapa}
          >
            <Search className="h-4 w-4" />
            {importando ? 'Buscando no mapa...' : 'Buscar novos no mapa'}
          </Button>
        </div>
      );
    }
    if (estadoBusca === ESTADO_BUSCA.RESULTADOS) {
      return (
        <div className="space-y-3">
          {ultimaImport && (
            <p className="rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              {ultimaImport.mensagem || `${ultimaImport.novos} novo(s) fornecedor(es) encontrado(s).`}
              {ultimaImport.cacheado ? ' (cache de 24h)' : ''}
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resultados.map(r => {
              const chave = r.osmId || r.nome;
              const jaSalvo = nomesNaBase.has(r.nome);
              const osm = openStreetMapUrl({ lat: r.lat, lng: r.lng, query: [r.nome, r.cidade, r.uf].filter(Boolean).join(' ') });
              return (
                <div key={chave} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{r.nome || '—'}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="slate">{r.categoria || 'Empresa'}</Badge>
                    <Badge variant="amber">OpenStreetMap — não verificado</Badge>
                  </p>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {[r.cidade, r.uf].filter(Boolean).join('/')}
                    {r.endereco ? ` · ${r.endereco}` : ''}
                  </p>
                  {r.telefone && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      {r.telefone}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    Fonte: {r.fonte || 'osm'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.site && (
                      <a
                        href={r.site.startsWith('http') ? r.site : `https://${r.site}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Abrir site
                      </a>
                    )}
                    {osm && (
                      <a
                        href={osm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Ver no OpenStreetMap
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={jaSalvo}
                      onClick={() => salvarDaBusca(r)}
                      className="ml-auto text-xs font-medium text-primary-600 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {jaSalvo ? 'Na minha lista' : 'Adicionar à minha lista'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

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

      {/* Busca local OSM + importação — sempre no topo (padrão SNV) */}
      <Card>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <Input
            label="Nome ou categoria"
            value={qBusca}
            onChange={e => setQBusca(e.target.value)}
            placeholder="Ex: distribuidor, atacado"
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">UF</span>
            <select
              value={ufBusca}
              onChange={e => {
                setUfBusca(e.target.value);
                setCidadeBusca('');
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="">Todas</option>
              {UFS.map(u => (
                <option key={u.sigla} value={u.sigla}>
                  {u.sigla} — {u.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Cidade</span>
            <input
              list="fornecedores-cidades"
              value={cidadeBusca}
              onChange={e => setCidadeBusca(e.target.value)}
              placeholder={ufBusca ? 'Ex: Campinas' : 'Selecione a UF'}
              disabled={!ufBusca}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <datalist id="fornecedores-cidades">
              {cidadesDisponiveis.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={importarDoMapa}
              disabled={importando || !ufBusca || !cidadeBusca.trim()}
            >
              <Search className="h-4 w-4" />
              {importando ? 'Buscando...' : 'Buscar novos no mapa'}
            </Button>
          </div>
        </div>
        <div className="px-5 pb-5">
          <p className="mb-3 text-xs text-slate-500">
            Busca local na base OpenStreetMap (sem chave externa). O botão acima importa fornecedores
            da cidade selecionada via Nominatim + Overpass e cacheia por 24h.
          </p>
          {renderStatusBusca(false)}
        </div>
      </Card>

      <div
        className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800"
        role="tablist"
        aria-label="Abas de fornecedores"
      >
        {abas.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={aba === t.id}
            onClick={() => setAba(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              aba === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Resultados OSM ficam no card de busca acima (sem duplicar na aba). */}
      {aba === 'resultados' && (
        <div>
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            {resultados.length > 0
              ? `Exibindo ${resultados.length} fornecedor(es) da busca acima.`
              : 'Use a busca acima (UF + cidade) e, se a base estiver vazia, "Buscar novos no mapa".'}
          </p>
        </div>
      )}

      {(aba === 'carteira' || aba === 'favoritos' || aba === 'arquivados') && (
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
          ) : visiveis.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              {textoVazioAba}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visiveis.map(f => (
                <Card key={f.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 font-semibold text-white">
                        {(f.nome || '?').charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle>
                          <button
                            type="button"
                            onClick={() => abrirPainel(f)}
                            className="text-left hover:text-primary-600 hover:underline"
                          >
                            {f.nome}
                          </button>
                        </CardTitle>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="slate">{f.categoria || 'Geral'}</Badge>
                          <Badge variant={f.verificado ? 'teal' : 'amber'}>
                            {f.verificado ? (
                              <span className="inline-flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> Verificado
                              </span>
                            ) : (
                              'Não verificado'
                            )}
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
                      <a
                        href={f.site.startsWith('http') ? f.site : `https://${f.site}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-medium text-primary-600 hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" /> {f.site.replace(/^https?:\/\//, '')} ↗
                      </a>
                    )}
                    {f.avaliacao != null && (
                      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Star className="h-4 w-4 text-amber-400" /> {Number(f.avaliacao).toFixed(1)}
                        {f.quantidadeAvaliacoes ? ` (${f.quantidadeAvaliacoes})` : ''}
                      </p>
                    )}
                    {f.verificado && (
                      <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {f.prazoInformado && <p>Prazo: {f.prazoInformado}</p>}
                        {f.custoNegociado != null && <p>Custo: {formatCurrency(f.custoNegociado)}</p>}
                        <p>
                          {[f.vendeAtacado && 'Atacado', f.aceitaRevenda && 'Revenda', f.possuiNotaFiscal && 'NF-e', f.possuiApi && 'API']
                            .filter(Boolean)
                            .join(' • ') || '—'}
                        </p>
                      </div>
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      Fonte: {f.fonte || '—'} · Última atualização: {formatDate(f.updatedAt || f.createdAt)}
                    </p>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-3">
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
                          onClick={() => abrirPainel(f)}
                          className="text-xs font-medium text-slate-500 hover:text-primary-600 hover:underline"
                        >
                          Detalhes
                        </button>
                        <AiActionButton
                          label="Analisar com Gemini"
                          onRun={() => analisarFornecedor(f)}
                          onResult={setAnaliseForn}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => alternarFavorito(f)}
                          title={f.favorito ? 'Remover dos favoritos' : 'Favoritar'}
                          aria-label={`Favoritar ${f.nome}`}
                          className={`rounded-lg p-1.5 transition-colors ${
                            f.favorito
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span aria-hidden="true" className="text-base leading-none">★</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarArquivado(f)}
                          title={f.arquivado ? 'Restaurar' : 'Arquivar'}
                          className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        >
                          {f.arquivado ? 'Restaurar' : 'Arquivar'}
                        </button>
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
                    </div>
                    {analiseFornId === f.id && analiseForn && (
                      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {analiseForn.ok ? (
                          <div className="space-y-1.5">
                            <p className="whitespace-pre-wrap">{analiseForn.analysis}</p>
                            {analiseForn.recommendations?.length > 0 && (
                              <p>
                                <span className="font-semibold">Recomendações:</span>{' '}
                                {analiseForn.recommendations.join(' • ')}
                              </p>
                            )}
                            {analiseForn.risks?.length > 0 && (
                              <p>
                                <span className="font-semibold">Riscos:</span> {analiseForn.risks.join(' • ')}
                              </p>
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
      )}

      {aba === 'radar' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Radar className={`h-4 w-4 ${varrendo ? 'animate-spin text-primary-600' : ''}`} />
                {varrendo
                  ? 'IA escaneando o catálogo por fornecedores...'
                  : 'A varredura mapeia fornecedores reais do seu catálogo.'}
              </div>
              <Button variant="secondary" onClick={varrerMercado} disabled={varrendo}>
                {varrendo ? 'Varrendo...' : 'Varrer mercado'}
              </Button>
            </div>
          </Card>
          {candidatos.length === 0 ? (
            <Card>
              <p className="p-8 text-center text-sm text-slate-500">
                {varrendo ? (
                  <Skeleton className="mx-auto h-12 max-w-md rounded-lg" />
                ) : (
                  'Clique em "Varrer mercado" para mapear fornecedores.'
                )}
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
                      <p className="text-xs text-slate-500">
                        {c.produtos} produto(s) • {c.categorias.join(', ') || '—'}
                      </p>
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
            <Input
              label="CNPJ"
              value={formFornecedor.cnpj}
              onChange={setCampoFornecedor('cnpj')}
              placeholder="00.000.000/0000-00"
            />
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
          <Button onClick={salvarFornecedor}>Cadastrar</Button>
        </div>
      </Modal>

      <Modal open={!!verificando} onClose={() => setVerificando(null)} title={`Verificar ${verificando?.nome ?? ''}`}>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Ficha pública do OSM não basta: confirme os dados comerciais abaixo.</p>
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
          <Input
            label="Prazo informado (obrigatório)"
            value={formVerificar.prazoInformado}
            onChange={e => setFormVerificar(f => ({ ...f, prazoInformado: e.target.value }))}
            placeholder="Ex: 3 a 5 dias"
          />
          <Input
            label="Custo negociado (R$)"
            type="number"
            min="0"
            value={formVerificar.custoNegociado}
            onChange={e => setFormVerificar(f => ({ ...f, custoNegociado: e.target.value }))}
            placeholder="Opcional"
          />
          <Input
            label="Observação"
            value={formVerificar.observacao}
            onChange={e => setFormVerificar(f => ({ ...f, observacao: e.target.value }))}
            placeholder="Contato confirmado pelo usuário"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setVerificando(null)}>
            Cancelar
          </Button>
          <Button onClick={confirmarVerificar}>Marcar como verificado</Button>
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

      {/* Painel lateral de detalhes (padrão SNV) */}
      <SidePanel
        open={!!painel}
        onClose={() => setPainel(null)}
        title={painel?.nome || 'Detalhes'}
        label={`Detalhes de ${painel?.nome || 'fornecedor'}`}
      >
        {painel && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="slate">{painel.categoria || 'Geral'}</Badge>
              <Badge variant={painel.verificado ? 'teal' : 'amber'}>
                {painel.verificado ? 'Verificado' : 'Não verificado'}
              </Badge>
              <Badge variant="slate">Fonte: {painel.fonte || '—'}</Badge>
            </div>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Contato</h3>
              <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                {painel.endereco && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    {painel.endereco}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {painel.telefone || '—'}
                </p>
                {painel.site && (
                  <a
                    href={painel.site.startsWith('http') ? painel.site : `https://${painel.site}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-medium text-primary-600 hover:underline"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    {painel.site.replace(/^https?:\/\//, '')} ↗
                  </a>
                )}
                {(() => {
                  const osm = openStreetMapUrl({
                    lat: painel.lat,
                    lng: painel.lng,
                    query: [painel.nome, painel.endereco].filter(Boolean).join(' '),
                  });
                  return osm ? (
                    <a
                      href={osm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-medium text-primary-600 hover:underline"
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      Ver no OpenStreetMap
                    </a>
                  ) : null;
                })()}
              </div>
            </section>

            {painel.avaliacao != null && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Avaliação pública</h3>
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Star className="h-4 w-4 text-amber-400" />
                  {Number(painel.avaliacao).toFixed(1)}
                  {painel.quantidadeAvaliacoes ? ` (${painel.quantidadeAvaliacoes} avaliações)` : ''}
                </p>
              </section>
            )}

            {painel.verificado && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Dados comerciais verificados</h3>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {painel.prazoInformado && <p>Prazo informado: {painel.prazoInformado}</p>}
                  {painel.custoNegociado != null && <p>Custo negociado: {formatCurrency(painel.custoNegociado)}</p>}
                  <p>
                    {[painel.vendeAtacado && 'Atacado', painel.aceitaRevenda && 'Revenda', painel.possuiNotaFiscal && 'NF-e', painel.possuiApi && 'API']
                      .filter(Boolean)
                      .join(' • ') || '—'}
                  </p>
                  {painel.observacao && <p className="mt-1 italic">{painel.observacao}</p>}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <History className="h-3.5 w-3.5" /> Histórico de verificação
              </h3>
              {painel.historicoVerificacoes?.length ? (
                <ol className="space-y-2">
                  {painel.historicoVerificacoes.map((h, i) => {
                    const chips = [h.vendeAtacado && 'Atacado', h.aceitaRevenda && 'Revenda', h.possuiNotaFiscal && 'NF-e', h.possuiApi && 'API']
                      .filter(Boolean)
                      .join(' • ');
                    return (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-100 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"
                      >
                        <p className="font-medium text-slate-700 dark:text-slate-200">{formatDate(h.quando)}</p>
                        <p>
                          Prazo: {h.prazoInformado || '—'}
                          {h.custoNegociado != null ? ` · Custo: ${formatCurrency(h.custoNegociado)}` : ''}
                        </p>
                        {chips && <p>{chips}</p>}
                        {h.observacao && <p className="italic">{h.observacao}</p>}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 dark:border-slate-700">
                  Nenhuma verificação registrada ainda.
                </p>
              )}
            </section>

            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              Última atualização: {formatDate(painel.updatedAt || painel.createdAt)}
            </p>

            <div className="flex flex-wrap gap-2">
              {!painel.verificado && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    abrirVerificar(painel);
                    setPainel(null);
                  }}
                >
                  Verificar agora
                </Button>
              )}
              <Link
                to={`/fornecedores/${painel.id}`}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Abrir página completa
              </Link>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
