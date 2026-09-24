import { useEffect, useRef, useState } from 'react';

// ============================================
// useApi — busca dados assíncronos (camada api.js)
// com estados de loading e erro. Busca uma vez
// na montagem; o fetcher fica em ref (sempre atual).
// ============================================
export function useApi(fetcher) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let active = true;

    fetcherRef
      .current()
      .then(d => {
        if (active) setData(d);
      })
      .catch(e => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
