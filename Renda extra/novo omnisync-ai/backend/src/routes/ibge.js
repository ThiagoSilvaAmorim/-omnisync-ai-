// backend/src/routes/ibge.js
// Proxy do IBGE (servicodados.ibge.gov.br) — lista oficial de municípios por UF.
// Grátis, sem chave. Cache em memória 24h (a lista muda raramente).

import { Router } from 'express';

const router = Router();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const IBGE_TIMEOUT_MS = 10000;
const USER_AGENT = 'OmniSync/1.0 (contato: suporte@omnisync.local)';
const cache = new Map();

const UFS_IBGE = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);

// Mapa sigla → código IBGE (2 dígitos com zero à esquerda).
const CODIGOS = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};

router.get('/municipios', async (req, res) => {
  const uf = String(req.query.uf || '').trim().toUpperCase();
  if (!UFS_IBGE.has(uf)) {
    return res.status(400).json({ code: 'INVALID_UF', message: 'Informe uma UF válida (2 letras).' });
  }

  const cacheado = cache.get(uf);
  if (cacheado && Date.now() - cacheado.quando < CACHE_TTL_MS) {
    return res.json({ ok: true, fonte: 'IBGE', cacheado: true, cidades: cacheado.cidades });
  }

  const codigo = CODIGOS[uf];
  const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${codigo}/municipios`;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), IBGE_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
    } finally {
      clearTimeout(t);
    }
    if (!resp.ok) {
      return res.status(502).json({ code: 'IBGE_UNAVAILABLE', message: 'Não foi possível consultar o IBGE agora.' });
    }
    const arr = await resp.json().catch(() => []);
    const cidades = (Array.isArray(arr) ? arr : [])
      .map(m => m?.nome)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    if (cidades.length === 0) {
      return res.status(502).json({ code: 'IBGE_UNAVAILABLE', message: 'IBGE não retornou municípios.' });
    }
    cache.set(uf, { cidades, quando: Date.now() });
    return res.json({ ok: true, fonte: 'IBGE', cacheado: false, cidades });
  } catch (e) {
    const timeout = e?.name === 'AbortError';
    return res.status(timeout ? 504 : 502).json({
      code: timeout ? 'IBGE_TIMEOUT' : 'IBGE_UNAVAILABLE',
      message: timeout ? 'Tempo esgotado ao consultar o IBGE.' : 'Não foi possível consultar o IBGE agora.',
    });
  }
});

export default router;
