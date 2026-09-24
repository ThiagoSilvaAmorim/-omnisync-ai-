import { useEffect, useState } from 'react';

// ============================================
// useMediaQuery — retorna true se a media query
// informada casar com a largura atual da janela.
// Usado pela AppShell para decidir layout mobile/desktop.
// ============================================
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = e => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
