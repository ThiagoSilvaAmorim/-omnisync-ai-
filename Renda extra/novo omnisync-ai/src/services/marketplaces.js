// ============================================
// marketplaces.js — abstração de marketplaces.
// Cada provedor expõe o mesmo contrato (adapter),
// sem condicionais espalhados pelas telas e sem
// simular conexão: sem app oficial + callback HTTPS
// + autorização da loja, o status nunca é "connected".
// ============================================

import { api } from './api';

export const MARKETPLACE_STATUS = {
  CONFIGURATION_PENDING: 'configuration_pending',
  NOT_CONNECTED: 'not_connected',
  CONNECTED: 'connected',
  TOKEN_EXPIRED: 'token_expired',
  ERROR: 'error',
};

export const MARKETPLACE_STATUS_LABEL = {
  configuration_pending: 'Preparação pendente',
  not_connected: 'Não conectado',
  connected: 'Conectado',
  token_expired: 'Token expirado',
  error: 'Erro',
};

// Mapeia os status do backend do Mercado Livre para o contrato comum.
export function mapMlStatus(backendStatus) {
  switch (backendStatus) {
    case 'conectado':
      return MARKETPLACE_STATUS.CONNECTED;
    case 'token_expirado':
      return MARKETPLACE_STATUS.TOKEN_EXPIRED;
    case 'nao_configurado':
    case 'desconectado':
      return MARKETPLACE_STATUS.NOT_CONNECTED;
    default:
      return MARKETPLACE_STATUS.ERROR;
  }
}

// Interpreta o retorno do callback OAuth na URL (função pura, sem efeitos).
// Backend usa ?connected=mercadolivre / ?error=... ; legado usa ml_connected/ml_error.
export function parseOAuthCallback(search) {
  const params = new URLSearchParams(search || '');
  if (params.get('connected') === 'mercadolivre' || params.get('ml_connected') === 'true') {
    return { ok: true, provider: 'mercadolivre' };
  }
  const erro = params.get('ml_error') || params.get('error');
  if (erro) return { ok: false, provider: 'mercadolivre', error: erro };
  return { ok: null };
}

function notPrepared(provider) {
  return new Error(
    `Integração ${provider} preparada. Configure o aplicativo oficial e autorize a loja para sincronizar dados reais.`
  );
}

// ---------- Adapter: Mercado Livre (backend OAuth real) ----------
export const mlAdapter = {
  provider: 'mercadolivre',
  capabilities: ['orders', 'products', 'inventory', 'sales-summary', 'oauth'],
  async getStatus() {
    const res = await api.mlGetStatus();
    return {
      status: mapMlStatus(res?.status),
      provider: 'mercadolivre',
      accountName: res?.conta?.mlUser?.nickname || res?.conta?.mlUser || null,
      accountId: res?.conta?.mlUserId ?? null,
      lastSyncAt: res?.conta?.updatedAt ?? null,
      lastError: null,
      rawStatus: res?.status ?? null,
    };
  },
  async getAuthorizationUrl() {
    const res = await api.mlStartOAuth();
    if (!res?.authUrl || res.authUrl === '#') {
      throw new Error('Autorização do Mercado Livre indisponível no momento.');
    }
    return res.authUrl;
  },
  handleCallback: parseOAuthCallback,
  async disconnect() {
    return api.mlDisconnect();
  },
  async listOrders(params) {
    return api.getPedidos(params);
  },
  async listProducts(params) {
    return api.getProdutos(params || {});
  },
  async listInventory(params) {
    return api.getProdutosEstoque(params || {});
  },
  async getSalesSummary() {
    return api.getDashboardAnalytics();
  },
};

function preparationAdapter(provider, capabilities) {
  return {
    provider,
    capabilities,
    async getStatus() {
      return {
        status: MARKETPLACE_STATUS.CONFIGURATION_PENDING,
        provider,
        accountName: null,
        accountId: null,
        lastSyncAt: null,
        lastError: null,
        rawStatus: null,
      };
    },
    async getAuthorizationUrl() {
      throw notPrepared(provider);
    },
    handleCallback: () => ({ ok: null }),
    async disconnect() {
      throw notPrepared(provider);
    },
    async listOrders() {
      throw notPrepared(provider);
    },
    async listProducts() {
      throw notPrepared(provider);
    },
    async listInventory() {
      throw notPrepared(provider);
    },
    async getSalesSummary() {
      throw notPrepared(provider);
    },
  };
}

// ---------- Shopee / TikTok Shop: somente preparação ----------
export const shopeeAdapter = preparationAdapter('shopee', ['orders', 'products', 'inventory', 'sales-summary', 'oauth']);
export const tiktokShopAdapter = preparationAdapter('tiktok-shop', ['orders', 'products', 'inventory', 'sales-summary', 'oauth']);

export const marketplaceAdapters = {
  mercadolivre: mlAdapter,
  shopee: shopeeAdapter,
  'tiktok-shop': tiktokShopAdapter,
};

// ---------- Normalizadores (contrato comum, sem segredos) ----------
function baseNormalizado(provider, raw, source) {
  return {
    provider,
    externalId: raw?.id ?? raw?.externalId ?? null,
    currency: raw?.moeda ?? raw?.currency ?? null,
    originalAmount: Number(raw?.preco ?? raw?.total ?? raw?.valor ?? raw?.amount) || 0,
    convertedAmount: null,
    source: source || raw?.origem || 'api',
    lastSyncedAt: new Date().toISOString(),
  };
}

export function normalizeMarketplaceOrder(provider, rawOrder) {
  return {
    ...baseNormalizado(provider, rawOrder, 'orders'),
    status: rawOrder?.status ?? null,
    customer: rawOrder?.cliente ?? rawOrder?.customer ?? null,
  };
}

export function normalizeMarketplaceProduct(provider, rawProduct) {
  return {
    ...baseNormalizado(provider, rawProduct, 'products'),
    name: rawProduct?.nome ?? rawProduct?.name ?? null,
    stock: Number(rawProduct?.estoque ?? rawProduct?.stock ?? 0) || 0,
  };
}

export function normalizeMarketplaceInventory(provider, rawItem) {
  return {
    ...baseNormalizado(provider, rawItem, 'inventory'),
    stock: Number(rawItem?.estoque ?? rawItem?.stock ?? 0) || 0,
    minimum: Number(rawItem?.minimo ?? rawItem?.minimum ?? 0) || 0,
  };
}

export function normalizeMarketplaceSale(provider, rawSale) {
  return {
    ...baseNormalizado(provider, rawSale, 'sales-summary'),
    channel: rawSale?.canal ?? rawSale?.channel ?? null,
  };
}
