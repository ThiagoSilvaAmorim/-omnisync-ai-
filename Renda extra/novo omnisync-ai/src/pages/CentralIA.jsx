import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { askAssistant } from '../lib/gemini';
import { AssistantChat } from '../components/assistant/AssistantChat';

// ==========================================
// SUBCOMPONENTES DAS ABAS (1 e 2 completas, demais placeholders)
// ==========================================

function VisaoGeral() {
  const [status, setStatus] = useState({ active: true, modo: 'manual', ultimaExecucao: null });
  const [loading, setLoading] = useState(true);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    api.fetchSystemStatus().then(s => {
      setStatus(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Heartbeat visível: contagem regressiva até a próxima execução.
  // Sem setInterval no navegador (regra da spec §09): atualiza sob demanda.
  const atualizarStatus = useCallback(() => {
    setAgora(Date.now());
    api.fetchSystemStatus().then(s => setStatus(s)).catch(() => {});
  }, []);

  const msRestantes = status.proximaExecucao ? new Date(status.proximaExecucao).getTime() - agora : null;
  const heartbeat = msRestantes == null
    ? '—'
    : msRestantes <= 0
      ? 'executando agora'
      : `em ${Math.floor(msRestantes / 60000)}min ${Math.floor((msRestantes % 60000) / 1000)}s`;

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-primary-50 rounded-xl">
          <span className="text-3xl">🤖</span>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Visão Geral da Central IA</h3>
          <p className="text-gray-500">Monitoramento e controle global do sistema NEXORA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card titulo="Status do Sistema" valor={loading ? '—' : (status.active ? 'OPERACIONAL' : 'SUSPENSO')} 
              icone={status.active ? '✅' : '🛑'} cor={status.active ? 'green' : 'red'} />
        <Card titulo="Modo Atual" valor={loading ? '—' : (status.modo || 'manual').toUpperCase()} 
              icone="⚙️" cor="blue" />
        <Card titulo="Última Execução" valor={loading ? '—' : (status.ultimaExecucao ? new Date(status.ultimaExecucao).toLocaleString('pt-BR') : 'Nunca')} 
              icone="🕐" cor="gray" />
        <Card titulo="Próxima Execução" valor={loading ? '—' : (status.proximaExecucao ? new Date(status.proximaExecucao).toLocaleString('pt-BR') : 'Agendada')} 
              icone="⏰" cor="purple" />
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-semibold mb-3">Resumo Rápido</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg">
            <p className="text-gray-500">8 Agentes Registrados</p>
            <p className="font-bold text-green-600">Todos Ativos</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-gray-500">Modo de Autonomia</p>
            <p className="font-bold text-blue-600 capitalize">{loading ? '—' : (status.modo || 'manual')}</p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-gray-500">Heartbeat (30 min)</p>
            <p className="font-bold text-purple-600">{loading ? '—' : heartbeat}</p>
            <button type="button" onClick={atualizarStatus} className="mt-1 text-xs font-medium text-blue-600 hover:underline">
              Atualizar agora
            </button>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-gray-500">Kill Switch</p>
            <p className="font-bold text-red-600">{loading ? '—' : 'INATIVO'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Agentes({ onPerguntar, onConfigurar }) {
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAgentesIA().then(data => {
      // Enriquecer com dados do backend
      const enriquecidos = (data || []).map(a => ({
        ...a,
        status: a.status || 'ativo',
        ultimaExecucao: a.ultimaExecucao || new Date().toISOString(),
        tarefas: a.tarefas || 0,
        impacto: a.impacto || 'Calculando...'
      }));
      setAgentes(enriquecidos);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Gestão dos 8 Agentes NEXORA</h3>
        <span className="text-sm text-gray-500">{agentes.length} agentes registrados</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agentes.map(agente => (
            <AgentCard key={agente.nome} agente={agente} onPerguntar={onPerguntar} onConfigurar={onConfigurar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// ABA 3: ATIVIDADE - Timeline completa de eventos
// ==========================================
function Atividade() {
  const [data, setData] = useState({ eventos: [], stats: {} });
  const [filtros, setFiltros] = useState({ tipo: 'todos', agente: 'todos', periodo: '24h' });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const carregarAtividades = async (pagina = 1, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagina,
        limit: 50,
        ...(filtros.tipo !== 'todos' && { type: filtros.tipo }),
        ...(filtros.agente !== 'todos' && { source_agent: filtros.agente }),
        ...(filtros.periodo !== 'todos' && { since: getPeriodoISO(filtros.periodo) }),
      });
      const resultado = await api.fetchAtividadesComFiltros(params);
      if (append) {
        setData(prev => ({ ...prev, eventos: [...prev.eventos, ...resultado.eventos] }));
      } else {
        setData({ eventos: resultado.eventos, stats: resultado.stats });
      }
      setHasMore(resultado.eventos.length === 50);
    } catch (e) {
      console.error('Erro ao carregar atividades:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    carregarAtividades(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      carregarAtividades(page + 1, true);
      setPage(p => p + 1);
    }
  };

  const eventosFiltrados = data.eventos || [];

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Timeline de Atividade</h3>
          <p className="text-gray-500">Histórico de execuções, eventos dos agentes e alertas do sistema</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
            <option value="todos">Todos os tipos</option>
            <option value="heartbeat">Heartbeat</option>
            <option value="agent.completed">Agente Concluído</option>
            <option value="agent.error">Erro de Agente</option>
            <option value="approval.required">Aprovação Necessária</option>
            <option value="killswitch.activated">Kill Switch</option>
            <option value="stock.low_detected">Estoque Baixo</option>
            <option value="price.change_detected">Mudança de Preço</option>
          </select>
          <select value={filtros.agente} onChange={e => setFiltros(f => ({ ...f, agente: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
            <option value="todos">Todos os agentes</option>
            <option value="DirectorIA">Director IA</option>
            <option value="StockGuard">StockGuard</option>
            <option value="CompraGuard">CompraGuard</option>
            <option value="MarketRadar">MarketRadar</option>
            <option value="FiscalGuard">FiscalGuard</option>
            <option value="SalesAnalyst">SalesAnalyst</option>
            <option value="PriceWatch">PriceWatch</option>
            <option value="SocialPilot">SocialPilot</option>
            <option value="OmniAdvisor">OmniAdvisor</option>
          </select>
          <select value={filtros.periodo} onChange={e => setFiltros(f => ({ ...f, periodo: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
            <option value="1h">Última hora</option>
            <option value="6h">Últimas 6h</option>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard titulo="Total Eventos" valor={data.stats?.total || 0} icone="📋" cor="blue" />
        <StatCard titulo="Erros" valor={data.stats?.erros || 0} icone="❌" cor="red" />
        <StatCard titulo="Aprovações" valor={data.stats?.aprovacoes || 0} icone="⏳" cor="yellow" />
        <StatCard titulo="Agentes Ativos" valor={data.stats?.agentesAtivos || 8} icone="🤖" cor="green" />
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {loading && !data.eventos?.length ? (
          [...Array(5)].map((_, i) => (
            <TimelineSkeleton key={i} />
          ))
        ) : eventosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">📭 Nenhum evento encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou aguarde novas execuções</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {eventosFiltrados.map((evento, idx) => (
                <TimelineItem key={evento.event_id || idx} evento={evento} />
              ))}
            </ul>
            {hasMore && (
              <button onClick={handleLoadMore} disabled={loading} className="w-full py-3 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                {loading ? '⏳ Carregando...' : '🔽 Carregar mais eventos'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// ABA 4: APROVAÇÕES - Gestão completa
// ==========================================
function Aprovacoes() {
  const [aprovacoes, setAprovacoes] = useState({ pendentes: [], historico: [], stats: {} });
  const [filtro, setFiltro] = useState('pendentes'); // 'pendentes' | 'historico' | 'todas'
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(new Set());

  const carregarAprovacoes = async () => {
    setLoading(true);
    try {
      const [pendentes, historico, stats] = await Promise.all([
        api.fetchAprovacoesPendentes(),
        api.fetchAprovacoesHistorico(),
        api.fetchAprovacoesStats(),
      ]);
      setAprovacoes({ pendentes: pendentes || [], historico: historico || [], stats: stats || {} });
    } catch (e) {
      console.error('Erro ao carregar aprovações:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarAprovacoes();
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarAprovacoes, 30000);
    return () => clearInterval(interval);
  }, []);

  const lista = filtro === 'pendentes' ? aprovacoes.pendentes : filtro === 'historico' ? aprovacoes.historico : [...aprovacoes.pendentes, ...aprovacoes.historico];

  const handleAprovar = async (id) => {
    setProcessando(prev => new Set([...prev, id]));
    try {
      await api.aprovarAprovacao(id);
      await carregarAprovacoes();
    } catch (e) {
      alert('Erro ao aprovar: ' + e.message);
    } finally {
      setProcessando(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleRejeitar = async (id) => {
    const motivo = prompt('Motivo da rejeição:');
    if (!motivo) return;
    setProcessando(prev => new Set([...prev, id]));
    try {
      await api.rejeitarAprovacao(id, motivo);
      await carregarAprovacoes();
    } catch (e) {
      alert('Erro ao rejeitar: ' + e.message);
    } finally {
      setProcessando(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Central de Aprovações</h3>
          <p className="text-gray-500">Gerencie solicitações que requerem intervenção humana</p>
        </div>
        <div className="flex gap-2">
          {['pendentes', 'historico', 'todas'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {f === 'pendentes' ? '⏳ Pendentes' : f === 'historico' ? '📜 Histórico' : '📋 Todas'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard titulo="Pendentes" valor={aprovacoes.stats?.pendentes || 0} icone="⏳" cor="yellow" />
        <StatCard titulo="Aprovadas Hoje" valor={aprovacoes.stats?.aprovadasHoje || 0} icone="✅" cor="green" />
        <StatCard titulo="Rejeitadas Hoje" valor={aprovacoes.stats?.rejeitadasHoje || 0} icone="❌" cor="red" />
        <StatCard titulo="Expiradas" valor={aprovacoes.stats?.expiradas || 0} icone="⏰" cor="gray" />
      </div>

      {/* Lista */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {loading && !aprovacoes.pendentes?.length ? (
          [...Array(4)].map((_, i) => <AprovacaoSkeleton key={i} />)
        ) : lista.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">{filtro === 'pendentes' ? '✅ Nenhuma aprovação pendente' : '📭 Nenhum registro encontrado'}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {lista.map(aprovacao => (
              <AprovacaoCard key={aprovacao.id} aprovacao={aprovacao} 
                onAprovar={handleAprovar} onRejeitar={handleRejeitar} 
                processando={processando.has(aprovacao.id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
// ==========================================
// ABA 5: IMPACTO FINANCEIRO
// ==========================================
function ImpactoFinanceiro() {
  const [data, setData] = useState({ impactoMensal: 0, impactoAnual: 0, economia: 0, custoApi: 0, porAgente: [] });
  const [, setLoading] = useState(true);

  useEffect(() => {
    api.fetchImpactoFinanceiro().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Impacto Financeiro</h3>
          <p className="text-gray-500">ROI, economia gerada e custo de operação da IA</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard titulo="Impacto Mensal" valor={`R$ ${(data.impactoMensal || 0).toLocaleString('pt-BR')}`} icone="📈" cor="green" />
        <StatCard titulo="Impacto Anual" valor={`R$ ${(data.impactoAnual || 0).toLocaleString('pt-BR')}`} icone="📊" cor="blue" />
        <StatCard titulo="Economia Gerada" valor={`R$ ${(data.economia || 0).toLocaleString('pt-BR')}`} icone="💰" cor="yellow" />
        <StatCard titulo="Custo API" valor={`R$ ${(data.custoApi || 0).toLocaleString('pt-BR')}`} icone="💳" cor="purple" />
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-semibold mb-3">Impacto por Agente</h4>
        <div className="space-y-2">
          {data.porAgente?.length ? data.porAgente.map(a => (
            <div key={a.agente} className="flex justify-between py-2 border-b border-gray-100">
              <span className="font-medium">{a.agente}</span>
              <span className="font-bold text-green-600">R$ {(a.impacto || 0).toLocaleString('pt-BR')}</span>
            </div>
          )) : (
            <p className="text-gray-500 text-sm">Dados de impacto por agente serão calculados após as primeiras execuções</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ABA 6: AUDITORIA
// ==========================================
function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    api.fetchAuditoria().then(d => { setLogs(d.eventos || d.ultimasAcoes || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-4">
      <div className="flex flex-wrap gap-3">
        <h3 className="text-xl font-bold text-gray-900">Auditoria de Execução</h3>
        <div className="flex gap-2">
          {['todos', 'agentes', 'sistema', 'aprovacoes', 'erros'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1 rounded-lg text-sm ${filtro === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto space-y-2">
        {loading ? [...Array(5)].map((_, i) => <TimelineSkeleton key={i} />) : logs.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Nenhum log de auditoria encontrado</p>
        ) : (
          logs.map((log, i) => <TimelineItem key={i} evento={log} />)
        )}
      </div>
    </div>
  );
}

// ==========================================
// ABA 7: AUTOMAÇÕES
// ==========================================
function Automacoes() {
  const [data, setData] = useState({ regras: [], tarefasEnfileiradas: 0, heartbeat: null });
  const [, setLoading] = useState(true);
  const [modo, setModo] = useState('manual');

  useEffect(() => {
    api.fetchAutomacoes().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Automações & Regras</h3>
          <p className="text-gray-500">Configure regras, visualize tarefas e gerencie o heartbeat</p>
        </div>
        <select value={modo} onChange={e => setModo(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="manual">Manual</option>
          <option value="assistido">Assistido</option>
          <option value="autonomo">Autônomo</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard titulo="Tarefas na Fila" valor={data.tarefasEnfileiradas || 0} icone="⏳" cor="blue" />
        <StatCard titulo="Regras Ativas" valor={data.regras?.length || 0} icone="📋" cor="green" />
        <StatCard titulo="Próximo Heartbeat" valor={data.heartbeat ? new Date(data.heartbeat).toLocaleTimeString('pt-BR') : '—'} icone="💓" cor="red" />
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-semibold mb-3">Regras de Automação</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div><span className="font-medium">Reposição de Estoque Crítico</span> <span className="text-sm text-gray-500 ml-2">StockGuard → CompraGuard</span></div>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Ativa</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div><span className="font-medium">Ajuste de Preço Competitivo</span> <span className="text-sm text-gray-500 ml-2">PriceWatch → MarketRadar</span></div>
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Ativa</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div><span className="font-medium">Publicação Automática</span> <span className="text-xs text-gray-500 ml-2">SocialPilot</span></div>
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Pendente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// ABA 8: CONFIGURAÇÕES
// ==========================================
function Configuracoes() {
  const [limites, setLimites] = useState({ valorMaximoAcao: 10000, valorMaximoDiario: 50000, maxAcoesAgenteHora: 10 });
  const [loading, setLoading] = useState(false);
  const [provedores, setProvedores] = useState({ provedores: [], ordem: [] });
  const [testando, setTestando] = useState(null);

  useEffect(() => {
    api.fetchProvedoresIA().then(setProvedores).catch(() => {});
  }, []);

  const recarregarProvedores = () => {
    api.fetchProvedoresIA().then(setProvedores).catch(() => {});
  };

  const alternar = async p => {
    try {
      await api.alternarProvedorIA(p.nome, !p.ativo);
      recarregarProvedores();
    } catch (e) {
      alert('Erro ao alternar: ' + e.message);
    }
  };

  const testar = async p => {
    setTestando(p.nome);
    try {
      const r = await api.testarProvedorIA(p.nome);
      alert(`OK (${r.latenciaMs ?? '?'} ms): ${r.resposta ?? ''}`);
    } catch (e) {
      alert('Falha no teste: ' + e.message);
    } finally {
      setTestando(null);
      recarregarProvedores();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all(Object.entries(limites).map(([chave, valor]) => api.atualizarLimite(chave, valor)));
      alert('Limites salvos com sucesso!');
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Provedores de IA</h3>
        <p className="text-sm text-gray-500">
          Ordem de fallback: {(provedores.ordem || []).join(' → ') || '—'} (via <code>AI_PROVIDER_ORDER</code>)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(provedores.provedores || []).map(p => (
          <div key={p.nome} className="border rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-bold capitalize">{p.nome}</p>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${p.configurado && p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.configurado ? (p.ativo ? 'Ativo' : 'Pausado') : 'Sem chave'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono">{p.modelo}</p>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>Latência: {p.latenciaMs != null ? `${p.latenciaMs} ms` : '—'}</p>
              <p>Falhas: {p.falhas ?? 0}</p>
              <p>Último uso: {p.ultimoUso ? new Date(p.ultimoUso).toLocaleString('pt-BR') : '—'}</p>
              {p.ultimoErro && <p className="text-red-600">Último erro: {p.ultimoErro}</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => alternar(p)}
                disabled={!p.configurado}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              >
                {p.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                type="button"
                onClick={() => testar(p)}
                disabled={!p.configurado || testando === p.nome}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {testando === p.nome ? 'Testando...' : 'Testar conexão'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900">Chaves dos provedores</h3>
        <p className="text-sm text-gray-500">Adicione contas gratuitas extras — a rotação é automática quando o uso diário de uma acabar.</p>
      </div>

      <ChavesProvedores />

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Configurações Globais</h3>
        <span className="text-sm text-gray-500">Limites e políticas do Risk Engine</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputLabel label="Valor Máx. por Ação (R$)" value={limites.valorMaximoAcao} onChange={e => setLimites(l => ({ ...l, valorMaximoAcao: Number(e.target.value) }))} />
        <InputLabel label="Valor Máx. Diário (R$)" value={limites.valorMaximoDiario} onChange={e => setLimites(l => ({ ...l, valorMaximoDiario: Number(e.target.value) }))} />
        <InputLabel label="Máx. Ações/Agente/Hora" value={limites.maxAcoesAgenteHora} onChange={e => setLimites(l => ({ ...l, maxAcoesAgenteHora: Number(e.target.value) }))} />
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">🛑 Kill Switch</h4>
        <p className="text-red-700 mb-3">O Kill Switch suspende TODAS as operações de IA imediatamente. Use apenas em emergência.</p>
        <button onClick={() => { if (confirm('ACIONAR KILL SWITCH?')) api.triggerKillSwitch().then(() => alert('IA suspensa')) }} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Acionar Kill Switch</button>
      </div>

      <button onClick={handleSave} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  );
}

// ==========================================
// CHAVES DE PROVEDORES (gerência de contas grátis)
// ==========================================

function ChavesProvedores() {
  const [chaves, setChaves] = useState([]);
  const [form, setForm] = useState({ provedor: 'groq', rotulo: '', chave: '' });
  const [salvando, setSalvando] = useState(false);

  const recarregar = () => {
    api.fetchChavesIA().then(l => setChaves(Array.isArray(l) ? l : [])).catch(() => {});
  };

  useEffect(() => {
    recarregar();
  }, []);

  const salvar = async () => {
    if (!form.chave.trim()) {
      alert('Cole a chave de API');
      return;
    }
    setSalvando(true);
    try {
      await api.criarChaveIA({ provedor: form.provedor, rotulo: form.rotulo.trim(), chave: form.chave.trim() });
      setForm({ provedor: 'groq', rotulo: '', chave: '' });
      recarregar();
      alert('Chave salva e já valendo na rotação');
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const alternar = async c => {
    try {
      await api.alternarChaveIA(c.id, !c.ativo);
      recarregar();
    } catch (e) {
      alert('Erro ao alternar: ' + e.message);
    }
  };

  const remover = async c => {
    if (!window.confirm(`Remover a chave "${c.rotulo || c.provedor}"?`)) return;
    try {
      await api.removerChaveIA(c.id);
      recarregar();
    } catch (e) {
      alert('Erro ao remover: ' + e.message);
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <select value={form.provedor} onChange={e => setForm(f => ({ ...f, provedor: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm" aria-label="Provedor">
          <option value="groq">Groq</option>
          <option value="openrouter">OpenRouter</option>
          <option value="gemini">Gemini</option>
        </select>
        <input value={form.rotulo} onChange={e => setForm(f => ({ ...f, rotulo: e.target.value }))} placeholder="Rótulo (ex: conta 2)" className="px-3 py-2 border rounded-lg text-sm" />
        <input value={form.chave} onChange={e => setForm(f => ({ ...f, chave: e.target.value }))} placeholder="Cole a chave de API" type="password" className="px-3 py-2 border rounded-lg text-sm font-mono" />
        <button type="button" onClick={salvar} disabled={salvando} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Adicionar chave'}
        </button>
      </div>
      {chaves.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma chave extra — o roteador usa as chaves das variáveis de ambiente.</p>
      ) : (
        <div className="space-y-1.5">
          {chaves.map(c => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium capitalize">{c.provedor}</span>
                <span className="text-gray-500"> • {c.rotulo || 'sem rótulo'}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${c.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.ativo ? 'Ativa' : 'Pausada'}
                </span>
                <button type="button" onClick={() => alternar(c)} className="text-xs text-blue-600 hover:underline">
                  {c.ativo ? 'Pausar' : 'Ativar'}
                </button>
                <button type="button" onClick={() => remover(c)} className="text-xs text-red-600 hover:underline">
                  Remover
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400">Chaves guardadas criptografadas no Neon. Pegue grátis em: Groq (console.groq.com/keys) e OpenRouter (openrouter.ai/keys).</p>
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

const AGENTE_ICONES = {
  'OmniAdvisor': '🧠',
  'CompraGuard': '🛒',
  'MarketRadar': '📊',
  'FiscalGuard': '📋',
  'SalesAnalyst': '📈',
  'PriceWatch': '💲',
  'StockGuard': '📦',
  'SocialPilot': '📱',
};

function InputLabel({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" value={value} onChange={onChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function Card({ titulo, valor, icone, cor }) {
  const cores = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`p-4 rounded-xl border ${cores[cor] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icone}</span>
        <p className="text-sm font-medium text-gray-500">{titulo}</p>
      </div>
      <p className="text-2xl font-bold">{valor}</p>
    </div>
  );
}

function AgentCard({ agente, onPerguntar, onConfigurar }) {
  const [analise, setAnalise] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const statusConfig = {
    ativo: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Ativo', border: 'green' },
    atencao: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Atenção', border: 'yellow' },
    erro: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Erro', border: 'red' },
    inativo: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500', label: 'Inativo', border: 'gray' },
  };
  const cfg = statusConfig[agente.status] || statusConfig.ativo;

  // Análise real via /api/ai com o contexto do agente.
  const analisar = async () => {
    if (analise) {
      setAnalise(null);
      return;
    }
    setAnalisando(true);
    try {
      const resp = await askAssistant([{
        role: 'user',
        text: `Analise o agente ${agente.nome}: status ${agente.status || 'ativo'}, ${agente.tarefas || 0} tarefas, última execução ${agente.ultimaExecucao || 'desconhecida'}, resultado "${agente.resultado || agente.impacto || '—'}". Dê um diagnóstico curto com 1 recomendação prática.`,
      }], []);
      setAnalise(resp);
    } catch (e) {
      setAnalise(`⚠️ ${e.message}`);
    } finally {
      setAnalisando(false);
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${cfg.bg} border-${cfg.border}-200 hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.bg.replace('bg-', 'bg-')} border border-${cfg.border}-300`}>
          <span className="text-xl">{AGENTE_ICONES[agente.nome] || '🤖'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{agente.nome}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`}></span>
            <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex justify-between"><span>Última execução:</span> <span className="font-mono text-gray-900">{agente.ultimaExecucao ? new Date(agente.ultimaExecucao).toLocaleString('pt-BR') : '—'}</span></div>
        <div className="flex justify-between"><span>Tarefas:</span> <span className="font-medium">{agente.tarefas || 0}</span></div>
        <div className="flex justify-between"><span>Impacto:</span> <span className="font-medium text-green-600">{agente.impacto}</span></div>
      </div>
      {analise && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {analise}
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
        <button type="button" onClick={analisar} disabled={analisando} className="flex-1 py-2 px-3 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50">
          {analisando ? 'Analisando...' : analise ? 'Ocultar' : 'Analisar'}
        </button>
        <button type="button" onClick={() => onPerguntar && onPerguntar(agente)} className="flex-1 py-2 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
          Perguntar
        </button>
        <button type="button" onClick={() => onConfigurar && onConfigurar()} className="flex-1 py-2 px-3 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg">
          Config
        </button>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTES AUXILIARES PARA ATIVIDADE E APROVAÇÕES
// ==========================================

function StatCard({ titulo, valor, icone, cor }) {
  const cores = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return (
    <div className={`p-4 rounded-xl border ${cores[cor] || cores.gray}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icone}</span>
        <p className="text-sm font-medium text-gray-500">{titulo}</p>
      </div>
      <p className="text-2xl font-bold">{valor}</p>
    </div>
  );
}

function TimelineItem({ evento }) {
  const tipoConfig = {
    heartbeat: { icone: '💓', cor: 'bg-blue-100 text-blue-700', label: 'Heartbeat' },
    'agent.completed': { icone: '✅', cor: 'bg-green-100 text-green-700', label: 'Agente Concluído' },
    'agent.error': { icone: '❌', cor: 'bg-red-100 text-red-700', label: 'Erro de Agente' },
    'approval.required': { icone: '⏳', cor: 'bg-yellow-100 text-yellow-700', label: 'Aprovação' },
    'killswitch.activated': { icone: '🛑', cor: 'bg-red-100 text-red-700', label: 'Kill Switch' },
    'stock.low_detected': { icone: '📦', cor: 'bg-orange-100 text-orange-700', label: 'Estoque Baixo' },
    'price.change_detected': { icone: '💲', cor: 'bg-purple-100 text-purple-700', label: 'Mudança Preço' },
  };
  const cfg = tipoConfig[evento.type] || { icone: '📋', cor: 'bg-gray-100 text-gray-700', label: 'Evento' };
  const tempo = new Date(evento.timestamp).toLocaleString('pt-BR');

  return (
    <li className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.cor} flex-shrink-0`}>
        <span className="text-lg">{cfg.icone}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900">{cfg.label}</span>
          <span className="px-2 py-0.5 text-xs bg-white rounded text-gray-600">{evento.source_agent || 'Sistema'}</span>
          {evento.severity === 'critical' && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">CRÍTICO</span>}
        </div>
        <p className="text-sm text-gray-600 truncate">{evento.payload?.resumo || evento.payload?.message || JSON.stringify(evento.payload).slice(0, 100)}</p>
        <p className="text-xs text-gray-400 mt-1">{tempo}</p>
        {evento.correlation_id && <p className="text-xs text-gray-300 font-mono">Correlation: {evento.correlation_id.slice(0, 20)}...</p>}
      </div>
    </li>
  );
}

function TimelineSkeleton() {
  return (
    <li className="flex gap-3 p-3 bg-gray-50 rounded-xl animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/4 bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-200 rounded" />
      </div>
    </li>
  );
}

function AprovacaoCard({ aprovacao, onAprovar, onRejeitar, processando }) {
  const riscoCores = {
    alto: 'bg-red-100 text-red-700',
    medio: 'bg-yellow-100 text-yellow-700',
    baixo: 'bg-green-100 text-green-700',
    critico: 'bg-red-200 text-red-800',
  };
  const riscoCor = riscoCores[aprovacao.risco] || 'bg-gray-100 text-gray-700';
  const expirando = new Date() > new Date(aprovacao.expiraEm);

  return (
    <li className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-bold text-gray-900">{aprovacao.agente} - {aprovacao.action}</h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${aprovacao.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' : aprovacao.status === 'aprovada' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {aprovacao.status === 'pendente' ? '⏳ Pendente' : aprovacao.status === 'aprovada' ? '✅ Aprovada' : aprovacao.status === 'rejeitada' ? '❌ Rejeitada' : '⏰ Expirada'}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${riscoCor}`}>
              Risco: {aprovacao.risco?.toUpperCase() || 'MÉDIO'}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
            <span>💰 R$ {(aprovacao.valorEstimado || 0).toLocaleString('pt-BR')}</span>
            <span>📊 Impacto/mês: R$ {(aprovacao.impactoMensal || 0).toLocaleString('pt-BR')}</span>
            <span>🎯 Confiança: {(aprovacao.confianca ? aprovacao.confianca * 100 : 80).toFixed(0)}%</span>
          </div>
          <p className="text-sm text-gray-500 truncate">{aprovacao.motivo || 'Sem motivo informado'}</p>
          <div className="flex gap-4 text-xs text-gray-400 mt-2">
            <span>Criada: {new Date(aprovacao.criadaEm).toLocaleString('pt-BR')}</span>
            <span className={expirando ? 'text-red-500' : ''}>Expira: {new Date(aprovacao.expiraEm).toLocaleString('pt-BR')}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-row-reverse">
          {aprovacao.status === 'pendente' && !processando && (
            <>
              <button onClick={() => onAprovar(aprovacao.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-1">
                ✅ Aprovar
              </button>
              <button onClick={() => onRejeitar(aprovacao.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-1">
                ❌ Rejeitar
              </button>
            </>
          )}
          {processando && <span className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">Processando...</span>}
        </div>
      </div>
    </li>
  );
}

function AprovacaoSkeleton() {
  return (
    <li className="p-4 bg-white border border-gray-200 rounded-xl animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-6 w-1/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>
        <div className="w-32 h-10 bg-gray-200 rounded" />
      </div>
    </li>
  );
}

// Helper para converter período em ISO
function getPeriodoISO(periodo) {
  const agora = new Date();
  switch (periodo) {
    case '1h': return new Date(agora.getTime() - 60 * 60 * 1000).toISOString();
    case '6h': return new Date(agora.getTime() - 6 * 60 * 60 * 1000).toISOString();
    case '24h': return new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d': return new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d': return new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default: return new Date(agora.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

function Copiloto({ perguntaInicial }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Copiloto OmniAdvisor</h3>
        <p className="text-gray-500">Converse com a IA sobre o seu negócio (usa o roteador Gemini → Groq → OpenRouter)</p>
      </div>
      <AssistantChat embedded mensagemInicial={perguntaInicial} />
    </div>
  );
}

const TABS = [
  { id: 'visao_geral', label: 'Visão Geral' },
  { id: 'copiloto', label: 'Copiloto' },
  { id: 'agentes', label: 'Agentes' },
  { id: 'atividade', label: 'Atividade' },
  { id: 'aprovacoes', label: 'Aprovações' },
  { id: 'automacoes', label: 'Automações' },
  { id: 'impacto', label: 'Impacto Financeiro' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'configuracoes', label: 'Configurações' },
];

export function CentralIA() {
  const [activeTab, setActiveTab] = useState('visao_geral');
  const [isSystemActive, setIsSystemActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [perguntaCopiloto, setPerguntaCopiloto] = useState('');

  const TAB_COMPONENTS = {
    visao_geral: VisaoGeral,
    copiloto: () => <Copiloto perguntaInicial={perguntaCopiloto} />,
    agentes: () => (
      <Agentes
        onPerguntar={agente => {
          setPerguntaCopiloto(`Sobre o agente ${agente.nome} (status ${agente.status || 'ativo'}): como ele pode me ajudar agora?`);
          setActiveTab('copiloto');
        }}
        onConfigurar={() => setActiveTab('configuracoes')}
      />
    ),
    atividade: Atividade,
    aprovacoes: Aprovacoes,
    automacoes: Automacoes,
    impacto: ImpactoFinanceiro,
    auditoria: Auditoria,
    configuracoes: Configuracoes,
  };

  useEffect(() => {
    api.fetchSystemStatus().then(s => setIsSystemActive(s.active)).catch(() => {});
  }, []);

  const handleKillSwitch = () => {
    if (window.confirm('ACIONAR KILL SWITCH? Todas as operações de IA serão suspensas.')) {
      setLoading(true);
      api.triggerKillSwitch().then(() => {
        setIsSystemActive(false);
        alert('Sistema de IA suspenso com sucesso.');
      }).finally(() => setLoading(false));
    }
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab] || VisaoGeral;

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
      {/* HEADER & KILL SWITCH */}
      <header className="flex justify-between items-center p-6 bg-white border-b shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central de IA</h1>
          <p className="text-sm text-gray-500">Monitoramento e controle global do sistema NEXORA</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${isSystemActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isSystemActive ? 'OPERACIONAL' : 'SUSPENSO'}
          </span>
          <button
            onClick={handleKillSwitch}
            disabled={!isSystemActive || loading}
            className="px-6 py-2 font-bold text-white rounded transition-colors bg-red-600 hover:bg-red-700 shadow-lg disabled:opacity-50"
          >
            {loading ? 'PROCESSANDO...' : 'KILL SWITCH'}
          </button>
        </div>
      </header>

      {/* NAVEGAÇÃO DAS ABAS */}
      <div className="px-6 pt-4 bg-white border-b">
        <nav className="flex space-x-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ÁREA DE CONTEÚDO */}
      <main className="flex-1 p-6 overflow-y-auto">
        <ActiveComponent />
      </main>

      {/* Rodapé */}
      <footer className="p-4 bg-white border-t text-center text-sm text-gray-400">
        Central de IA - NEXORA/OmniSync AI v2.0
      </footer>
    </div>
  );
}

export default CentralIA;