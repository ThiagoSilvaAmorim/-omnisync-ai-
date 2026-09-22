import { useEffect, useRef, useState } from 'react';
import { Bot, ImagePlus, Loader2, Send, X } from 'lucide-react';
import { askAssistant } from '../../lib/gemini';

// ============================================
// AssistantChat — widget flutuante do OmniAdvisor
// (Gemini). Permite conversar e enviar imagens
// (prints/fotos) para receber conselhos.
// ============================================

const SUGESTOES = [
  'Como posso melhorar minha margem de lucro?',
  'Analise este print do meu dashboard.',
  'Que produtos devo repor com urgência?',
];

export function AssistantChat({ embedded = false, mensagemInicial = '' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState([]); // imagens pendentes para envio
  const [loading, setLoading] = useState(false);
  // Estado real da IA, confirmado por resposta do backend: nunca simulado.
  const [iaEstado, setIaEstado] = useState('desconhecido');

  const bodyRef = useRef(null);

  // Rola a conversa para o fim a cada nova mensagem.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  const handleFiles = files => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    imgs.forEach(f => {
      const reader = new FileReader();
      reader.onload = () =>
        setImages(prev => [
          ...prev,
          { url: reader.result, base64: String(reader.result).split(',')[1], mimeType: f.type },
        ]);
      reader.readAsDataURL(f);
    });
  };

  const send = async (textoForcado) => {
    const text = (textoForcado ?? input).trim();
    if ((!text && images.length === 0) || loading) return;

    const finalText = text || 'Analise esta imagem e me dê conselhos.';
    const userMsg = { role: 'user', text: finalText, images };
    const history = [...messages, userMsg].map(m => ({ role: m.role, text: m.text }));
    const imgs = images;

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImages([]);
    setLoading(true);

    try {
      const resp = await askAssistant(history, imgs);
      setIaEstado('conectado');
      setMessages(prev => [...prev, { role: 'assistant', text: resp }]);
    } catch (err) {
      if (String(err?.message || '').includes('IA não configurada')) {
        setIaEstado('nao-configurado');
      }
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${err.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  // Pergunta inicial vinda de fora (ex: botão "Perguntar" de um agente).
  const ultimaInicial = useRef('');
  useEffect(() => {
    if (embedded && mensagemInicial && mensagemInicial !== ultimaInicial.current) {
      ultimaInicial.current = mensagemInicial;
      send(mensagemInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, mensagemInicial]);

  // Corpo do chat reutilizado no modo flutuante e no embarcado (aba Copiloto).
  function CorpoChat() {
    return (
      <>
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-primary-100 p-4 dark:border-slate-700 dark:from-primary-500/10 dark:to-primary-500/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">OmniAdvisor</p>
            <p className="text-xs text-slate-500">
              {iaEstado === 'conectado'
                ? 'Modo Gemini conectado'
                : iaEstado === 'nao-configurado'
                  ? 'IA não configurada'
                  : 'Assistente OmniAdvisor'}
            </p>
          </div>
        </div>

        {/* Mensagens */}
        <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Olá! Sou o OmniAdvisor. Posso te ajudar com conselhos de vendas, estoque, preço e
                muito mais. Você também pode me enviar prints ou fotos para análise.
              </p>
              {iaEstado === 'nao-configurado' && (
                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  IA não configurada no servidor. Fale com o administrador.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {SUGESTOES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : m.error
                      ? 'border border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {m.images?.length > 0 && (
                  <div className="mb-2 flex gap-1.5">
                    {m.images.map((img, j) => (
                      <img key={j} src={img.url} alt="anexo" className="h-16 w-16 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <span className="whitespace-pre-wrap">{m.text}</span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" /> Pensando...
            </div>
          )}
        </div>

        {/* Imagens pendentes */}
        {images.length > 0 && (
          <div className="flex gap-2 border-t border-slate-100 px-4 pt-2 dark:border-slate-800">
            {images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.url} alt="anexo" className="h-12 w-12 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-white"
                  aria-label="Remover imagem"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-700">
          <label className="cursor-pointer text-slate-400 transition-colors hover:text-primary-500">
            <ImagePlus className="h-5 w-5" />
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Pergunte algo ou envie um print..."
            className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white transition-all hover:bg-primary-500 active:scale-95 disabled:opacity-50"
            aria-label="Enviar"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </>
    );
  }

  if (embedded) {
    return (
      <div className="flex h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <CorpoChat />
      </div>
    );
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all hover:bg-primary-500 active:scale-95 print:hidden"
        aria-label="Abrir assistente de IA"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Painel do chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[560px] max-h-[calc(100vh-8rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 print:hidden">
          <CorpoChat />
        </div>
      )}
    </>
  );
}
