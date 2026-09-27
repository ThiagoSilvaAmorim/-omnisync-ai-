import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Shield, Lock, TrendingUp, Download, Search, Palette, Sun, Monitor, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';
import { useApp } from '../context/AppContext';
import { useTheme } from '../hooks/useTheme';
import { PALETAS, PALETA_PADRAO } from '../lib/palettes';

export function Configuracoes() {
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const { modo, _setModo, palette, setPalette, modoAtivo, paletaAtiva, _customCor, customAtiva, setCustomColor, primaryColor } = useApp();
  const [aba, setAba] = useState('geral');
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState(() => {
    try {
      return { modulo: 'geral', idioma: 'pt-BR', ...JSON.parse(localStorage.getItem('omnisync-prefs') || '{}') };
    } catch {
      return { modulo: 'geral', idioma: 'pt-BR' };
    }
  });
  const [loading, setLoading] = useState(true);
  const [kpisState, setKpisState] = useState({
    usuariosAtivos: 0,
    ultimosAcessos: 0,
    storageTotal: null
  });
  const [configuracoes, setConfiguracoes] = useState([]);
  const [auditLog, setAuditLog] = useState([]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisData, configuracoesData, auditData] = await Promise.all([
        api.getKpisConfiguracoes(),
        api.getConfiguracoesSistema(),
        api.getLogAudit(),
      ]);
      setKpisState(kpisData);
      const listaConfig = Array.isArray(configuracoesData) ? configuracoesData : (configuracoesData.config || []);
      const listaAudit = Array.isArray(auditData) ? auditData : (auditData.log || []);
      setConfiguracoes(listaConfig.map((c, i) => ({
        chave: c.nome ?? c.email ?? `Item ${i + 1}`,
        tipo: c.perfil ?? c.status ?? '',
        modulo: 'geral',
        valor: c.email ?? '',
      })));
      setAuditLog(listaAudit.map((a, i) => ({
        acao: a.acao ?? `Evento ${i + 1}`,
        tempo: a.timestamp ?? a.tempo ?? '',
      })));
    } catch (e) {
      console.error('Erro ao carregar dados de configurações:', e);
      toast('Erro ao carregar dados de configurações');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const k = kpisState;
  const dadosKpis = [
    { label: 'Usuários Ativos', valor: k.usuariosAtivos, destaque: true },
    { label: 'Últimos Acessos', valor: k.ultimosAcessos, destaque: true },
    { label: 'Storage Total', valor: k.storageTotal == null ? '—' : `R$ ${k.storageTotal.toLocaleString('pt-BR')}`, destaque: false },
  ];

  const filtrados = configuracoes.filter(c => {
    if (busca && !`${c.chave} ${c.valor}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtros.modulo !== 'geral' && c.modulo !== filtros.modulo) return false;
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

  const abas = [
  { id: 'aparencia', label: 'Aparência', icone: Palette },
  { id: 'geral', label: 'Geral', icone: Monitor },
  { id: 'auditoria', label: 'Auditoria', icone: Shield },
];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Configurações</h1>
          <p className="text-sm text-slate-500">Ajustes do sistema, aparência e preferências</p>
        </div>
        <Button variant="secondary" onClick={() => {
          try {
            localStorage.setItem('omnisync-prefs', JSON.stringify(filtros));
          } catch { /* sem persistência */ }
          toast('Preferências salvas neste navegador');
        }}>
          <Download className="h-4 w-4" /> Salvar
        </Button>
      </div>

      {/* Abas */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Abas de configurações">
          {abas.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                aba === a.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <a.icone className="h-4 w-4" />
              {a.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Aba: Aparência */}
      {aba === 'aparencia' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tema Claro / Escuro</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">{theme === 'dark' ? 'Escuro' : 'Claro'}</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="relative w-12 h-7 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              >
                <span className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-200" style={{ transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paleta de Cores (5 Temas)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">A paleta define a cor primária em botões, gráficos e destaques. Aplicação imediata.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {PALETAS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    className={`relative rounded-xl p-4 border-2 transition-all ${
                      palette === p.id
                        ? 'border-primary-600 ring-2 ring-primary-600/20'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                    }`}
                  >
                    {palette === p.id && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">✓</span>
                    )}
                    <div className="h-8 w-full rounded-lg mb-2" style={{ background: `rgb(${p.cores['500']})` }} />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.nome}</p>
                    <p className="text-xs text-slate-500">{p.descricao}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">Atual: <span className="font-medium">{paletaAtiva.nome}</span></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Cor Personalizada (por Modo Visual)</CardTitle>
              <button
                type="button"
                onClick={() => setCustomColor(modo, null)}
                disabled={!customAtiva}
                className="text-sm text-primary-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3.5 w-3.5 inline mr-1" /> Restaurar padrão
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-500">Sobrescreve a paleta no modo <strong>{modoAtivo.nome}</strong>. A cor é salva por modo.</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="color"
                    value={customAtiva?.replace('#', '') || '000000'}
                    onChange={e => setCustomColor(modo, '#' + e.target.value)}
                    className="h-10 w-10 rounded-lg border border-slate-300 appearance-none cursor-pointer"
                    aria-label="Escolher cor personalizada"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {customAtiva ? customAtiva.toUpperCase() : 'Nenhuma (usa paleta)'}
                  </span>
                </label>
                <div className="h-10 w-16 rounded-lg border border-slate-300" style={{ background: customAtiva || primaryColor }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/10">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">Restaurar Configurações de Aparência</p>
                  <p className="text-sm text-slate-500">Volta ao tema claro, paleta Âmbar e remove cores personalizadas.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setPalette(PALETA_PADRAO);
                  setCustomColor(modo, null);
                  toast('Aparência restaurada ao padrão');
                }}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors"
              >
                Restaurar Padrão
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aba: Geral */}
      {aba === 'geral' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {kpiCards}
          </div>

          <Card>
            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
              <Select label="Módulo" value={filtros.modulo} onChange={v => setFiltros(f => ({ ...f, modulo: v }))} options={[{ value: 'geral', label: 'Geral' }, { value: 'seguranca', label: 'Segurança' }, { value: 'integracoes', label: 'Integrações' }, { value: 'notificacoes', label: 'Notificações' }]} />
              <Select label="Idioma" value={filtros.idioma} onChange={v => setFiltros(f => ({ ...f, idioma: v }))} options={[{ value: 'pt-BR', label: 'Português (BR)' }, { value: 'en', label: 'English' }, { value: 'es', label: 'Español' }]} />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferências do Usuário</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1">
                  <input
                    placeholder="Buscar configuração ou chave..."
                    value={busca}
                    onChange={e => { setBusca(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    type="text"
                  />
                  <Search className="absolute left-3 top-2.5 text-gray-400" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Usuários do Sistema</CardTitle>
              </CardHeader>
              <div className="h-80 overflow-y-auto">
                {loading ? (
                  <Skeleton className="h-64 rounded-lg" />
                ) : paginaAtual.map(c => (
                  <div key={c.chave} className="p-4 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-between justify-between mb-2">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{c.chave}</span>
                      <span className="text-xs text-slate-500">{c.tipo}</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '64%' }} aria-valuemin={0} aria-valuemax={100} />
                    </div>
                  </div>
                ))}
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
                  <CardTitle>Log de Auditoria Recente</CardTitle>
                </CardHeader>
                <CardContent className="h-80 space-y-3">
                  {auditLog.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span>{a.acao}</span>
                      <span className="text-xs text-slate-500">{a.tempo}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Segurança do Sistema</CardTitle>
                </CardHeader>
                <CardContent className="h-48">
                  <div className="h-full space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-100/50 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">Autenticação Ativa</span>
                        <span className="text-xs text-slate-500">SSO + MFA</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-red-100/50 flex items-center justify-center">
                        <Lock className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">Tentativas Falhas Hoje</span>
                        <span className="text-xs text-slate-500">0</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-yellow-100/50 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-800">Última Atualização</span>
                        <span className="text-xs text-slate-500">Há 2 horas</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Aba: Auditoria */}
      {aba === 'auditoria' && (
        <Card>
          <CardHeader>
            <CardTitle>Log de Auditoria Completo</CardTitle>
          </CardHeader>
          <CardContent className="h-96 overflow-y-auto space-y-3">
            {auditLog.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <span>{a.acao}</span>
                <span className="text-xs text-slate-500">{a.tempo}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}