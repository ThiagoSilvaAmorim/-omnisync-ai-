import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

// ============================================
// useSuppliers — busca paginada do catálogo
// (aba Produtos ou Fornecedores) com debounce
// de 300ms na busca e proteção contra corrida
// de respostas (a resposta antiga é descartada).
// ============================================

export const LIMITE_PAGINA = 24;

export function useSuppliers({ tab, q, uf, niche, page }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [error, setError] = useState(null);
  const [qDebounced, setQDebounced] = useState(q);
  const [nonce, setNonce] = useState(0);

  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const meu = ++seq.current;
    const primeiraPagina = page === 1;
    if (primeiraPagina) setLoading(true);
    else setCarregandoMais(true);
    setError(null);

    const busca = tab === 'produtos' ? api.getCatalogProducts : api.getCatalogSuppliers;
    busca({ q: qDebounced, uf, niche, page, limit: LIMITE_PAGINA })
      .then(r => {
        if (meu !== seq.current) return;
        setItems(prev => (primeiraPagina ? r.items : [...prev, ...r.items]));
        setTotal(r.total || 0);
      })
      .catch(e => {
        if (meu !== seq.current) return;
        setError(e);
        if (primeiraPagina) setItems([]);
      })
      .finally(() => {
        if (meu !== seq.current) return;
        setLoading(false);
        setCarregandoMais(false);
      });
  }, [tab, qDebounced, uf, niche, page, nonce]);

  return {
    items,
    total,
    loading,
    carregandoMais,
    error,
    temMais: items.length < total,
    recarregar: () => setNonce(n => n + 1),
  };
}

// ============================================
// useSuppliersNiches — nichos distintos do
// catálogo (fonte: GET /api/suppliers/niches).
// ============================================
export function useSuppliersNiches() {
  const [niches, setNiches] = useState([]);

  useEffect(() => {
    let ativo = true;
    api.getSupplierNiches()
      .then(r => {
        if (ativo) setNiches(r.niches || []);
      })
      .catch(() => {
        // Sem nichos: o select fica só com "Todos".
      });
    return () => {
      ativo = false;
    };
  }, []);

  return niches;
}
