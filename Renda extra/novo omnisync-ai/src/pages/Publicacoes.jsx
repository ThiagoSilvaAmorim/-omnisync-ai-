import { useEffect, useState } from 'react';
import { ImagePlus, Send, Smartphone, Sparkles, Upload } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// ============================================
// Tela 07 — Central de Publicações.
// Mídia (upload) + editor + prévia estilo Instagram.
// ============================================

const LIMITE_DESCRICAO = 2200;

// Contas de demonstração por canal (multi-instância). A seleção persiste
// em localStorage por workspace. Tokens reais por conta seguem BLOCKED
// até OAuth + tabela de contas no Neon (ver PROGRESS.md).
const CONTAS_PADRAO = [
  { id: 'ig-loja-a', canal: 'Instagram', rotulo: '@loja.a', workspace: 'Loja Principal' },
  { id: 'ig-loja-b', canal: 'Instagram', rotulo: '@loja.b', workspace: 'Loja Principal' },
  { id: 'tt-principal', canal: 'TikTok', rotulo: '@canalprincipal', workspace: 'Loja Principal' },
  { id: 'tt-bastidores', canal: 'TikTok', rotulo: '@bastidores', workspace: 'Loja Principal' },
  { id: 'fb-loja', canal: 'Facebook', rotulo: 'Loja A', workspace: 'Loja Principal' },
  { id: 'wa-loja', canal: 'WhatsApp', rotulo: '+55 11 90000-0000', workspace: 'Loja Principal' },
  { id: 'ig-cliente', canal: 'Instagram', rotulo: '@cliente.x', workspace: 'Cliente Avulso' },
];
const WORKSPACES = ['Loja Principal', 'Cliente Avulso'];

function lerJSON(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v ? JSON.parse(v) : padrao;
  } catch {
    return padrao;
  }
}

const SUGESTOES_MOCK = [
  '✨ Transforme seu ambiente com nosso lançamento exclusivo!',
  '🔥 Oferta por tempo limitado — aproveite antes que acabe.',
  '💜 Feito para você que valoriza qualidade e estilo.',
];

export function Publicacoes() {
  const toast = useToast();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [workspace, setWorkspace] = useState(() => lerJSON('nexora-workspace', 'Loja Principal'));
  const [selecionadas, setSelecionadas] = useState(() => lerJSON('nexora-contas', ['ig-loja-a']));
  const [midias, setMidias] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // Rascunhos: do Conteúdo IA ("Enviar para o agendador") ou salvo nesta tela.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nexora-rascunho') || localStorage.getItem('nexora-rascunho-publicacoes');
      if (!raw) return;
      const r = JSON.parse(raw);
      if (r.titulo) setTitulo(r.titulo);
      if (r.descricao) setDescricao(r.descricao);
      if (r.hashtags !== undefined) setHashtags(r.hashtags);
      localStorage.removeItem('nexora-rascunho');
    } catch { /* sem rascunho */ }
  }, []);

  const persistirWorkspace = v => {
    setWorkspace(v);
    try { localStorage.setItem('nexora-workspace', JSON.stringify(v)); } catch { /* sem persistência */ }
  };

  const toggleConta = id => {
    setSelecionadas(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      try { localStorage.setItem('nexora-contas', JSON.stringify(next)); } catch { /* sem persistência */ }
      return next;
    });
  };

  const contasDoWorkspace = CONTAS_PADRAO.filter(c => c.workspace === workspace);
  const contasSelecionadas = CONTAS_PADRAO.filter(c => selecionadas.includes(c.id));
  const canaisPorGrupo = contasDoWorkspace.reduce((acc, c) => {
    (acc[c.canal] = acc[c.canal] || []).push(c);
    return acc;
  }, {});

  const adicionarArquivos = files => {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    const novas = imgs.map(f => ({ id: Date.now() + Math.random(), url: URL.createObjectURL(f) }));
    setMidias(m => [...m, ...novas]);
  };

  const onDrop = e => {
    e.preventDefault();
    setDragOver(false);
    adicionarArquivos(Array.from(e.dataTransfer.files));
  };

  const gerarConteudo = () => {
    setSugestoes(SUGESTOES_MOCK);
    toast('Sugestões de conteúdo geradas');
  };

  const agendar = () => {
    if (contasSelecionadas.length === 0) {
      toast('Selecione ao menos uma conta para agendar');
      return;
    }
    const nomes = contasSelecionadas.map(c => c.rotulo).join(', ');
    toast(`Publicação agendada para ${contasSelecionadas.length} conta(s): ${nomes}`);
    api.emitirEvento('publication.scheduled', { contas: nomes, titulo }, 'SocialPilot').catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Central de Publicações</h1>
          <p className="text-sm text-slate-500">Crie e agende conteúdo para suas redes sociais</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Workspace (marca/cliente)</span>
          <select
            value={workspace}
            onChange={e => persistirWorkspace(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {WORKSPACES.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Coluna 1 — Mídia */}
        <Card>
          <CardHeader>
            <CardTitle>Mídia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Adicione imagens ou vídeos</p>
              <p className="text-xs text-slate-400">Arraste aqui ou clique para selecionar</p>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={e => adicionarArquivos(Array.from(e.target.files))}
              />
            </label>

            {midias.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {midias.map(m => (
                  <img key={m.id} src={m.url} alt="mídia" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2 — Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Título" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título da publicação" />

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Descrição</span>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={4}
                maxLength={LIMITE_DESCRICAO}
                placeholder="Escreva a legenda..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <span className="mt-1 block text-right text-xs text-slate-400">
                {descricao.length}/{LIMITE_DESCRICAO}
              </span>
            </label>

            <Input label="Hashtags" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#hashtag #omnisync" />

            <Button variant="secondary" onClick={gerarConteudo}>
              <Sparkles className="h-4 w-4" /> Gerar conteúdo IA
            </Button>

            <div>
              <p className="mb-2 text-xs font-medium text-slate-500">Contas de destino (multi-seleção por rede)</p>
              <div className="space-y-3">
                {Object.entries(canaisPorGrupo).map(([canal, contas]) => (
                  <div key={canal}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{canal}</p>
                    <div className="flex flex-wrap gap-2">
                      {contas.map(c => {
                        const ativa = selecionadas.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleConta(c.id)}
                            aria-pressed={ativa}
                            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${ativa ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-500/10 dark:text-primary-300' : 'border-slate-200 text-slate-600 hover:border-primary-500 dark:border-slate-700 dark:text-slate-300'}`}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[9px] font-bold text-white">
                              {c.rotulo.replace('@', '').charAt(0).toUpperCase()}
                            </span>
                            {c.rotulo}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Tokens reais por conta seguem BLOCKED até OAuth + tabela de contas no Neon.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => {
                try {
                  localStorage.setItem('nexora-rascunho-publicacoes', JSON.stringify({ titulo, descricao, hashtags }));
                } catch { /* sem persistência */ }
                toast('Rascunho salvo neste navegador');
              }}>Salvar rascunho</Button>
              <Button onClick={agendar}>
                <Send className="h-4 w-4" /> Agendar publicação
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Coluna 3 — Prévia */}
        <Card>
          <CardHeader>
            <CardTitle>Prévia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mockup celular */}
            <div className="mx-auto w-full max-w-[240px] rounded-[2.5rem] border-8 border-slate-800 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-xs font-bold text-white">
                  OA
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">omnisync.ai</p>
                  <p className="text-[10px] text-slate-400">
                    {contasSelecionadas.length === 0 ? 'Nenhuma conta selecionada' : `Vai para: ${contasSelecionadas.map(c => c.rotulo).join(', ')}`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                {midias.length > 0 ? (
                  <img src={midias[0].url} alt="prévia" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <p className="mt-3 text-xs text-slate-700 dark:text-slate-200">
                {descricao || 'Sua legenda aparecerá aqui...'}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100">1.284 curtidas</p>
            </div>

            {/* Sugestões de legenda */}
            {sugestoes.length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Smartphone className="h-3.5 w-3.5" /> Sugestões de legenda
                </p>
                <div className="space-y-2">
                  {sugestoes.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDescricao(s)}
                      className="block w-full rounded-lg border border-slate-100 p-2 text-left text-xs text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
