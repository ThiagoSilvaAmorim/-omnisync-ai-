// backend/src/routes/shopeeAuth.js
// Rotas Shopee — SOMENTE preparação.
// Sem app oficial (SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY / SHOPEE_REDIRECT_URI)
// configurado e sem autorização da loja, nenhuma rota retorna dados nem
// afirma conexão: tudo responde 501, exceto /status (preparação pendente).

import { Router } from 'express';

const router = Router();

const PREPARATION = {
  error: 'Integração Shopee preparada. Configure o aplicativo oficial e autorize a loja para sincronizar dados reais.',
  status: 'configuration_pending',
  provider: 'shopee',
};

router.get('/start', (_req, res) => res.status(501).json(PREPARATION));
router.get('/callback', (_req, res) => res.status(501).json(PREPARATION));
router.get('/status', (_req, res) => res.json({ status: 'configuration_pending', provider: 'shopee', conta: null }));
router.post('/disconnect', (_req, res) => res.status(501).json(PREPARATION));
router.get('/orders', (_req, res) => res.status(501).json(PREPARATION));
router.get('/products', (_req, res) => res.status(501).json(PREPARATION));
router.get('/inventory', (_req, res) => res.status(501).json(PREPARATION));

export default router;
