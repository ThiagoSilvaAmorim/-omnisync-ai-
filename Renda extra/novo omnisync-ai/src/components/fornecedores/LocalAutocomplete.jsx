import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

// ============================================
// LocalAutocomplete — sugestões de local via
// Google Places (roda pelo backend; a chave não
// aparece aqui). Debounce 300ms, mínimo 3
// caracteres, teclado (setas/Enter/Esc) e
// fecha ao clicar fora (overlay z-40, padrão
// do Header).
// ============================================

export function LocalAutocomplete({ onSelecionar, placeholder = 'Cidade ou endereço (Google)' }) {
  const [texto, setTexto] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [destaque, setDestaque] = useState(-1);
  const seq = useRef(0);
  const ignorado = useRef('');

  useEffect(() => {
    const valor = texto.trim();
    if (valor.length < 3) {
      setSugestoes([]);
      setCarregando(false);
      setErro(null);
      return undefined;
    }
    if (valor === ignorado.current) {
      setSugestoes([]);
      setCarregando(false);
      return undefined;
    }

    setCarregando(true);
    setErro(null);
    const timer = setTimeout(async () => {
      const minhaSeq = ++seq.current;
      try {
        const r = await api.autocompleteLocal(valor);
        if (minhaSeq !== seq.current) return;
        setSugestoes(Array.isArray(r.sugestoes) ? r.sugestoes : []);
        setDestaque(-1);
        setAberto(true);
      } catch (e) {
        if (minhaSeq !== seq.current) return;
        setSugestoes([]);
        setErro(e.message || 'Sugestões indisponíveis.');
        setAberto(true);
      } finally {
        if (minhaSeq === seq.current) setCarregando(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [texto]);

  function escolher(s) {
    ignorado.current = (s.cidade || s.principal || '').trim();
    setTexto(ignorado.current);
    setSugestoes([]);
    setAberto(false);
    setErro(null);
    onSelecionar?.(s);
  }

  function teclado(e) {
    if (!aberto || sugestoes.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDestaque(d => (d + 1) % sugestoes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDestaque(d => (d <= 0 ? sugestoes.length - 1 : d - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (destaque >= 0) escolher(sugestoes[destaque]);
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  }

  const visivel = aberto && (sugestoes.length > 0 || Boolean(erro));

  return (
    <div className="relative w-full">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        role="combobox"
        aria-expanded={visivel}
        aria-controls="lista-locais"
        aria-autocomplete="list"
        aria-activedescendant={destaque >= 0 ? `sugestao-local-${destaque}` : undefined}
        aria-label="Buscar local"
        data-testid="campo-local"
        placeholder={placeholder}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={teclado}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
      />
      {carregando && (
        <Loader2
          data-testid="carregando-local"
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
        />
      )}

      {visivel && (
        <>
          <div className="fixed inset-0 z-40" data-testid="overlay-local" onClick={() => setAberto(false)} />
          <ul
            id="lista-locais"
            role="listbox"
            data-testid="sugestoes-locais"
            className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            {erro ? (
              <li className="px-3 py-2 text-xs text-amber-600 dark:text-amber-400" data-testid="erro-local">
                {erro}
              </li>
            ) : (
              sugestoes.map((s, i) => (
                <li key={s.placeId} id={`sugestao-local-${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={destaque === i}
                    data-testid="sugestao-local"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => escolher(s)}
                    className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      destaque === i
                        ? 'bg-primary-50 text-primary-700 dark:bg-slate-700 dark:text-slate-100'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.principal}</span>
                      {s.secundario && (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {s.secundario}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}
