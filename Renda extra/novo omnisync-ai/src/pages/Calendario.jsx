import { useMemo, useState } from 'react';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { CalendarPlus } from 'lucide-react';

// ============================================
// Calendário — agenda de conteúdo com visões
// lista/grade, filtros e alerta de conflito.
// ============================================

const TIPO_VARIANT = { post: 'teal', video: 'indigo', stories: 'purple', mensagem: 'sky', live: 'red' };
const CANAIS = ['Todos', 'Instagram', 'TikTok', 'Facebook', 'WhatsApp'];
const FORMATOS = ['Todos', 'post', 'video', 'stories', 'mensagem', 'live'];

// Formatos que o agente consegue disparar sozinho via API oficial.
const AUTOMATIZAVEIS = ['live', 'video'];

function parseData(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
  return m ? { dia: Number(m[1]), mes: Number(m[2]), ano: Number(m[3]) } : null;
}

export function Calendario() {
  const toast = useToast();
  // Agenda local do navegador (sem backend de calendário): o usuário
  // cria os próprios eventos; nada vem pré-preenchido.
  const [novos, setNovos] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('nexora-calendario') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });
  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState({ titulo: '', canal: 'Instagram', data: '', tipo: 'post' });

  const todos = [...novos];

  const persistir = lista => {
    setNovos(lista);
    try {
      localStorage.setItem('nexora-calendario', JSON.stringify(lista));
    } catch { /* sem persistência */ }
  };

  const salvarEvento = () => {
    if (!form.titulo.trim() || !form.data) {
      toast('Preencha título e data do evento');
      return;
    }
    const [ano, mes, dia] = form.data.split('-');
    persistir([{ id: `novo-${Date.now().toString(36)}`, titulo: form.titulo.trim(), canal: form.canal, data: `${dia}/${mes}/${ano}`, tipo: form.tipo }, ...novos]);
    setForm({ titulo: '', canal: 'Instagram', data: '', tipo: 'post' });
    setModalNovo(false);
    toast('Evento adicionado ao calendário');
  };
  const [visao, setVisao] = useState('lista');
  const [canal, setCanal] = useState('Todos');
  const [formato, setFormato] = useState('Todos');

  const filtrados = todos.filter(e => {
    if (canal !== 'Todos' && e.canal !== canal) return false;
    if (formato !== 'Todos' && e.tipo !== formato) return false;
    return true;
  });

  // Conflitos: mesmo canal + mesma data com mais de um evento.
  const conflitos = useMemo(() => {
    const mapa = new Map();
    filtrados.forEach(e => {
      const chave = `${e.canal}|${e.data}`;
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    });
    return new Set([...mapa.entries()].filter(([, q]) => q > 1).map(([c]) => c));
  }, [filtrados]);

  // Grade mensal do mês com mais eventos filtrados.
  const grade = useMemo(() => {
    if (filtrados.length === 0) return null;
    const contagem = {};
    filtrados.forEach(e => {
      const p = parseData(e.data);
      if (p) {
        const chave = `${p.mes}/${p.ano}`;
        contagem[chave] = (contagem[chave] || 0) + 1;
      }
    });
    const [mesAno] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0] || [];
    if (!mesAno) return null;
    const [mes, ano] = mesAno.split('/').map(Number);
    const primeiroDia = new Date(ano, mes - 1, 1).getDay();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const porDia = {};
    filtrados.forEach(e => {
      const p = parseData(e.data);
      if (p && p.mes === mes && p.ano === ano) {
        (porDia[p.dia] = porDia[p.dia] || []).push(e);
      }
    });
    return { mes, ano, primeiroDia, diasNoMes, porDia };
  }, [filtrados]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Calendário</h1>
          <p className="text-sm text-slate-500">Agenda de publicações e campanhas</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 p-1 dark:border-slate-700" role="tablist" aria-label="Modo de visualização">
            {['lista', 'grade'].map(v => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={visao === v}
                onClick={() => setVisao(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${visao === v ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {v === 'lista' ? 'Lista' : 'Grade mensal'}
              </button>
            ))}
          </div>
        <Button onClick={() => setModalNovo(true)}>
          <CalendarPlus className="h-4 w-4" /> Novo evento
        </Button>
      </div>

      <Modal open={modalNovo} onClose={() => setModalNovo(false)} title="Novo evento">
        <div className="space-y-3">
          <Input label="Título *" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Live de lançamento" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Canal" value={form.canal} onChange={v => setForm(f => ({ ...f, canal: v }))} options={['Instagram', 'TikTok', 'Facebook', 'WhatsApp'].map(c => ({ value: c, label: c }))} />
            <Select label="Formato" value={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v }))} options={['post', 'video', 'stories', 'mensagem', 'live'].map(t => ({ value: t, label: t }))} />
          </div>
          <Input label="Data *" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalNovo(false)}>
            Cancelar
          </Button>
          <Button onClick={salvarEvento}>
            Adicionar
          </Button>
        </div>
      </Modal>
      </div>

      <div className="flex flex-wrap gap-2">
        {CANAIS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCanal(c)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${canal === c ? 'bg-primary-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {c}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        {FORMATOS.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFormato(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${formato === f ? 'bg-teal-600 text-white' : 'border border-slate-200 text-slate-600 hover:border-teal-500 hover:text-teal-600 dark:border-slate-700 dark:text-slate-300'}`}
          >
            {f === 'Todos' ? 'Todos os formatos' : f}
          </button>
        ))}
      </div>

      {conflitos.size > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Conflito de horário: {conflitos.size} combinação(ões) de canal + data com mais de uma postagem — risco de canibalização de alcance.
        </div>
      )}

      {visao === 'lista' ? (
        <Card>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtrados.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">Nenhum evento neste filtro.</p>
            ) : (
              filtrados.map(e => {
                const emConflito = conflitos.has(`${e.canal}|${e.data}`);
                return (
                  <div key={e.id} className={`flex flex-wrap items-center gap-3 p-4 ${emConflito ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}>
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <span className="text-base font-bold leading-none">{e.data.split('/')[0]}</span>
                      <span className="text-[10px] uppercase">{e.data.split('/')[1]}/{e.data.split('/')[2].slice(2)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{e.titulo}</p>
                      <p className="text-xs text-slate-500">{e.canal}</p>
                    </div>
                    {AUTOMATIZAVEIS.includes(e.tipo) && (
                      <Badge variant="teal" title="Formato disparável de forma autônoma via API oficial">Agente</Badge>
                    )}
                    {emConflito && <Badge variant="amber">Conflito</Badge>}
                    <Badge variant={TIPO_VARIANT[e.tipo]}>{e.tipo}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      ) : (
        <Card>
          {!grade ? (
            <p className="p-8 text-center text-sm text-slate-500">Nenhum evento neste filtro.</p>
          ) : (
            <div className="p-5">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {String(grade.mes).padStart(2, '0')}/{grade.ano}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-slate-400">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: grade.primeiroDia }).map((_, i) => <span key={`v-${i}`} />)}
                {Array.from({ length: grade.diasNoMes }).map((_, i) => {
                  const dia = i + 1;
                  const eventos = grade.porDia[dia] || [];
                  return (
                    <div
                      key={dia}
                      title={eventos.map(e => `${e.titulo} (${e.canal})`).join('\n') || 'Dia livre'}
                      className={`min-h-14 rounded-lg border p-1 text-left ${eventos.length > 1 ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <span className="text-[11px] font-semibold text-slate-500">{dia}</span>
                      {eventos.slice(0, 2).map(e => (
                        <p key={e.id} className="truncate text-[10px] text-slate-600 dark:text-slate-300">• {e.titulo}</p>
                      ))}
                      {eventos.length > 2 && <p className="text-[10px] text-slate-400">+{eventos.length - 2}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
