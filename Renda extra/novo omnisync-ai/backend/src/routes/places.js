// backend/src/routes/places.js
// Autocomplete de local (Google Places) — API
// paga: exige login e valida o tamanho da busca
// antes de gastar cota. A chave nunca sai daqui.

import { Router } from 'express';
import { usuarioDoRequest } from '../auth.js';
import { autocompleteLocal } from '../services/googlePlaces.js';

const router = Router();

function requireAuth(req, res, next) {
  const user = usuarioDoRequest(req);
  if (!user) return res.status(401).json({ error: 'Autenticação necessária' });
  next();
}

const STATUS_ERRO = {
  INPUT_CURTO: 400,
  INPUT_GRANDE: 400,
  PLACES_INVALIDO: 400,
  PLACES_RATE_LIMIT: 429,
  PLACES_NEGADO: 502,
  PLACES_TIMEOUT: 504,
  SEM_CHAVE: 503,
  PLACES_ERRO: 502,
};

// GET /api/places/autocomplete?q=... — sugestões de local
router.get('/autocomplete', requireAuth, async (req, res) => {
  try {
    const sugestoes = await autocompleteLocal(req.query.q);
    return res.json({ sugestoes });
  } catch (e) {
    const status = STATUS_ERRO[e.code] || 500;
    if (status >= 500 && e.code !== 'SEM_CHAVE') {
      console.error('[Places] Erro no autocomplete:', e.code, e.message);
    }
    return res.status(status).json({ code: e.code || 'PLACES_ERRO', message: e.message });
  }
});

export default router;
