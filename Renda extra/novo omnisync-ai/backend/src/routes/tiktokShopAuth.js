// backend/src/routes/tiktokShopAuth.js
// Rotas TikTok Shop — SOMENTE preparação.
// Sem app oficial (TIKTOK_SHOP_APP_KEY / TIKTOK_SHOP_APP_SECRET /
// TIKTOK_SHOP_REDIRECT_URI) configurado e sem autorização da loja,
// nenhuma rota retorna dados nem afirma conexão: tudo responde 501,
// exceto /status (preparação pendente). Usa somente a API oficial
// TikTok Shop Open Platform (nenhum endpoint não oficial).

import { Router } from 'express';

const router = Router();

const PREPARATION = {
  error: 'Integração TikTok Shop preparada. Configure o aplicativo oficial e autorize a loja para sincronizar dados reais.',
  status: 'configuration_pending',
  provider: 'tiktok-shop',
};

router.get('/start', (_req, res) => res.status(501).json(PREPARATION));
router.get('/callback', (_req, res) => res.status(501).json(PREPARATION));
router.get('/status', (_req, res) => res.json({ status: 'configuration_pending', provider: 'tiktok-shop', conta: null }));
router.post('/disconnect', (_req, res) => res.status(501).json(PREPARATION));
router.get('/orders', (_req, res) => res.status(501).json(PREPARATION));
router.get('/products', (_req, res) => res.status(501).json(PREPARATION));
router.get('/inventory', (_req, res) => res.status(501).json(PREPARATION));

export default router;
