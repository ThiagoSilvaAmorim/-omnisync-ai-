import { describe, it, expect } from 'vitest';
import {
  MARKETPLACE_STATUS,
  mapMlStatus,
  parseOAuthCallback,
  shopeeAdapter,
  tiktokShopAdapter,
  normalizeMarketplaceOrder,
  normalizeMarketplaceProduct,
  normalizeMarketplaceInventory,
  normalizeMarketplaceSale,
} from '../services/marketplaces';

describe('mapMlStatus', () => {
  it('mapeia os 4 status do backend', () => {
    expect(mapMlStatus('conectado')).toBe(MARKETPLACE_STATUS.CONNECTED);
    expect(mapMlStatus('token_expirado')).toBe(MARKETPLACE_STATUS.TOKEN_EXPIRED);
    expect(mapMlStatus('nao_configurado')).toBe(MARKETPLACE_STATUS.NOT_CONNECTED);
    expect(mapMlStatus('desconectado')).toBe(MARKETPLACE_STATUS.NOT_CONNECTED);
  });

  it('status desconhecido vira erro', () => {
    expect(mapMlStatus('qualquer_coisa')).toBe(MARKETPLACE_STATUS.ERROR);
    expect(mapMlStatus(undefined)).toBe(MARKETPLACE_STATUS.ERROR);
  });
});

describe('parseOAuthCallback', () => {
  it('reconhece sucesso do backend', () => {
    expect(parseOAuthCallback('?connected=mercadolivre')).toEqual({ ok: true, provider: 'mercadolivre' });
  });

  it('reconhece erro do backend', () => {
    const r = parseOAuthCallback('?error=access_denied');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('access_denied');
  });

  it('resposta vazia não afirma nada', () => {
    expect(parseOAuthCallback('')).toEqual({ ok: null });
  });
});

describe('shopee/tiktok sem configuração', () => {
  it.each([
    ['shopee', shopeeAdapter],
    ['tiktok-shop', tiktokShopAdapter],
  ])('%s fica em preparação pendente', async (_nome, adapter) => {
    const s = await adapter.getStatus();
    expect(s.status).toBe(MARKETPLACE_STATUS.CONFIGURATION_PENDING);
    expect(s.status).not.toBe(MARKETPLACE_STATUS.CONNECTED);
  });

  it.each([
    ['shopee', shopeeAdapter],
    ['tiktok-shop', tiktokShopAdapter],
  ])('%s nunca simula conexão', async (_nome, adapter) => {
    await expect(adapter.getAuthorizationUrl()).rejects.toThrow('Configure o aplicativo oficial');
    await expect(adapter.listOrders()).rejects.toThrow('Configure o aplicativo oficial');
    await expect(adapter.listProducts()).rejects.toThrow('Configure o aplicativo oficial');
  });
});

describe('normalizadores', () => {
  it('pedido preserva contrato comum', () => {
    const n = normalizeMarketplaceOrder('shopee', { id: 'S1', total: 100, moeda: 'BRL', status: 'pago', cliente: 'Ana' });
    expect(n.provider).toBe('shopee');
    expect(n.externalId).toBe('S1');
    expect(n.currency).toBe('BRL');
    expect(n.originalAmount).toBe(100);
    expect(n.source).toBe('orders');
    expect(n.lastSyncedAt).toBeTruthy();
  });

  it('entrada vazia não quebra', () => {
    expect(() => normalizeMarketplaceOrder('shopee', null)).not.toThrow();
    expect(() => normalizeMarketplaceProduct('tiktok-shop', {})).not.toThrow();
    expect(() => normalizeMarketplaceInventory('shopee', undefined)).not.toThrow();
    expect(() => normalizeMarketplaceSale('tiktok-shop', {})).not.toThrow();
  });

  it('saída não contém segredos', () => {
    const n = normalizeMarketplaceProduct('shopee', { id: 'P1', token: 'abc', client_secret: 'x' });
    expect(JSON.stringify(n)).not.toMatch(/token|secret|password|cookie|jwt/i);
  });
});
