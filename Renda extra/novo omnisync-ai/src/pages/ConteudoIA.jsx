import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImagePlus, Send, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

// ============================================
// Conteúdo IA — gerador com objetivo, variações
// por formato e envio ao agendador.
// ============================================

const OBJETIVOS = [
  { value: 'conversao', label: 'Conversão / Vendas' },
  { value: 'lancamento', label: 'Lançamento' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'autoridade', label: 'Autoridade / Prova social' },
];

const SUGESTAO_VISUAL = {
  conversao: 'Carrossel com preço em destaque na primeira imagem + CTA "Compre agora" na última.',
  lancamento: 'Vídeo curto de unboxing + contagem regressiva nos Stories.',
  engajamento: 'Enquete nos Stories + foto lifestyle gerada por IA.',
  autoridade: 'Depoimento em vídeo + prints de avaliações em carrossel.',
};

export function ConteudoIA() {
  const toast = useToast();

  const [tema, setTema] = useState('');
  const [tom, setTom] = useState('profissional');
  const [canal, setCanal] = useState('instagram');
  const [objetivo, setObjetivo] = useState('conversao');
  const [produtoId, setProdutoId] = useState('');
  const [catalogo, setCatalogo] = useState([]);
  const [variacoes, setVariacoes] = useState(null);

  // Catálogo real para puxar nome e preço sem digitação.
  useEffect(() => {
    let ativo = true;
    api.getProdutos({ limit: 100 })
      .then(d => { if (ativo) setCatalogo(d.produtos || []); })
      .catch(() => {});
    return () => { ativo = false; };
  }, []);

  const usarProduto = id => {
    setProdutoId(id);
    const p = catalogo.find(x => String(x.id) === String(id));
    if (!p) return;
    setTema(`${p.nome} — R$ ${Number(p.preco ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    toast(`Características de "${p.nome}" aplicadas ao tema`);
  };

  const gerar = () => {
    if (!tema.trim()) {
      toast('Digite um tema para gerar o conteúdo');
      return;
    }
    const base = tema.trim();
    setVariacoes({
      stories: `⚡ ${base} — arraste para cima e garanta já!`,
      feed: `✨ ${base}\n\n💡 Qualidade premium com condição especial por tempo limitado.\n🚀 Estoque restrito — não fique de fora!`,
      whatsapp: `🔥 OFERTA: ${base}. Responda EU QUERO e garanta a sua agora!`,
    });
    toast('Variações geradas com sucesso');
  };

  const enviarAgendador = formato => {
    if (!variacoes) return;
    try {
      localStorage.setItem('nexora-rascunho', JSON.stringify({
        titulo: tema.slice(0, 80),
        descricao: variacoes[formato],
        formato: formato === 'stories' ? 'stories' : formato === 'whatsapp' ? 'mensagem' : 'post',
        origem: 'conteudo-ia',
      }));
    } catch { /* sem persistência */ }
    toast('Texto enviado à Central de Publicações');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Conteúdo IA</h1>
        <p className="text-sm text-slate-500">Gere legendas e textos para suas redes com IA</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Produto do catálogo (preenche tema e preço)"
              value={produtoId}
              onChange={usarProduto}
              options={[{ value: '', label: 'Tema manual' }, ...catalogo.map(p => ({ value: String(p.id), label: `${p.sku} — ${p.nome}` }))]}
            />
            <Input label="Tema / produto" value={tema} onChange={e => setTema(e.target.value)} placeholder="Ex: Fone Bluetooth TWS" />
            <Select
              label="Objetivo da campanha"
              value={objetivo}
              onChange={setObjetivo}
              options={OBJETIVOS}
            />
            <Select
              label="Tom de voz"
              value={tom}
              onChange={setTom}
              options={[
                { value: 'profissional', label: 'Profissional' },
                { value: 'descontraido', label: 'Descontraído' },
                { value: 'urgente', label: 'Urgente / oferta' },
              ]}
            />
            <Select
              label="Canal"
              value={canal}
              onChange={setCanal}
              options={[
                { value: 'instagram', label: 'Instagram' },
                { value: 'tiktok', label: 'TikTok' },
                { value: 'facebook', label: 'Facebook' },
                { value: 'whatsapp', label: 'WhatsApp' },
              ]}
            />
            <Button onClick={gerar}>
              <Sparkles className="h-4 w-4" /> Gerar conteúdo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variações por formato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!variacoes ? (
              <p className="text-sm text-slate-400">As 3 variações (Stories, Feed, WhatsApp) aparecerão aqui.</p>
            ) : (
              <>
                {[
                  { id: 'stories', rotulo: 'Stories (curta)' },
                  { id: 'feed', rotulo: 'Feed (média com gatilhos)' },
                  { id: 'whatsapp', rotulo: 'WhatsApp (direta)' },
                ].map(v => (
                  <div key={v.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{v.rotulo}</p>
                    <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{variacoes[v.id]}</p>
                    <Link
                      to="/publicacoes"
                      onClick={() => enviarAgendador(v.id)}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                    >
                      <Send className="h-3.5 w-3.5" /> Enviar para o agendador
                    </Link>
                  </div>
                ))}
                <div className="flex gap-2 rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-slate-600 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-slate-300">
                  <ImagePlus className="h-4 w-4 shrink-0 text-primary-600" />
                  <p><span className="font-medium">Sugestão visual:</span> {SUGESTAO_VISUAL[objetivo]}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
