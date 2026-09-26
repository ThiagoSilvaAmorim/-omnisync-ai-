import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { assinarToken } from '../src/auth.js';

vi.mock('../src/prisma/client.js', () => ({
  prisma: {
    supplier: { findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
    fornecedor: { findMany: vi.fn(), findUnique: vi.fn() },
    catalogProduct: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  },
}));

import { autocompleteLocal, limparCachePlaces } from '../src/services/googlePlaces.js';

const CHAVE = 'chave-teste-places';

function resposta(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const PREDICTIONS = {
  status: 'OK',
  predictions: [
    {
      place_id: 'p1',
      description: 'Petrobras - EDISE, Rio de Janeiro, Brazil',
      structured_formatting: { main_text: 'Petrobras - EDISE', secondary_text: 'Rio de Janeiro, Brazil' },
      terms: [
        { value: 'Petrobras - EDISE', types: ['establishment'] },
        { value: 'Rio de Janeiro', types: ['locality', 'political'] },
        { value: 'Rio de Janeiro', types: ['administrative_area_level_1', 'political'] },
      ],
    },
    { place_id: 'p2', description: 'Betim, Minas Gerais, Brazil', terms: [{ value: 'Betim', types: ['locality'] }, { value: 'Minas Gerais', types: ['administrative_area_level_1'] }] },
  ],
};

function tokenValido() {
  return assinarToken({ email: 'teste@omnisync.ai', nome: 'Teste', perfil: 'Diretor' });
}

describe('googlePlaces — autocomplete de local', () => {
  beforeEach(() => {
    limparCachePlaces();
    process.env.GOOGLE_PLACES_KEY = CHAVE;
    global.fetch = vi.fn(async () => resposta(200, PREDICTIONS));
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.GOOGLE_PLACES_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it('mapeia predictions com cidade e estado (país BR, pt-BR)', async () => {
    const sugestoes = await autocompleteLocal('petrobras');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('language=pt-BR');
    expect(url).toContain('components=country:br');
    expect(sugestoes).toHaveLength(2);
    expect(sugestoes[0]).toMatchObject({
      placeId: 'p1',
      principal: 'Petrobras - EDISE',
      cidade: 'Rio de Janeiro',
      estado: 'Rio de Janeiro',
    });
    expect(sugestoes[1]).toMatchObject({ cidade: 'Betim', estado: 'Minas Gerais' });
  });

  it('cacheia por 5min: repetir a busca não volta à rede', async () => {
    await autocompleteLocal('petrobras');
    await autocompleteLocal('petrobras');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('busca com menos de 3 caracteres falha sem rede', async () => {
    await expect(autocompleteLocal('pe')).rejects.toMatchObject({ code: 'INPUT_CURTO' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sem chave configurada → SEM_CHAVE sem rede', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    await expect(autocompleteLocal('petrobras', { chave: '' })).rejects.toMatchObject({ code: 'SEM_CHAVE' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('aceita GOOGLE_MAPS_API_KEY (nome usado no Railway)', async () => {
    delete process.env.GOOGLE_PLACES_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'chave-maps-railway';
    const sugestoes = await autocompleteLocal('petrobras');
    expect(sugestoes).toHaveLength(2);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('key=chave-maps-railway');
  });

  it('OVER_QUERY_LIMIT → PLACES_RATE_LIMIT', async () => {
    global.fetch.mockResolvedValue(resposta(200, { status: 'OVER_QUERY_LIMIT' }));
    await expect(autocompleteLocal('petrobras')).rejects.toMatchObject({ code: 'PLACES_RATE_LIMIT' });
  });

  it('ZERO_RESULTS → lista vazia (sem erro)', async () => {
    global.fetch.mockResolvedValue(resposta(200, { status: 'ZERO_RESULTS', predictions: [] }));
    await expect(autocompleteLocal('zzzzqqqq')).resolves.toEqual([]);
  });

  it('falha de rede → PLACES_TIMEOUT', async () => {
    global.fetch.mockRejectedValue(new Error('aborted'));
    await expect(autocompleteLocal('petrobras')).rejects.toMatchObject({ code: 'PLACES_TIMEOUT' });
  });
});

describe('GET /api/places/autocomplete (rota)', () => {
  beforeEach(() => {
    limparCachePlaces();
    process.env.GOOGLE_PLACES_KEY = CHAVE;
    global.fetch = vi.fn(async () => resposta(200, PREDICTIONS));
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.GOOGLE_PLACES_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  function auth() {
    return { Authorization: `Bearer ${tokenValido()}` };
  }

  it('sem token retorna 401 (API paga exige login)', async () => {
    const res = await request(app).get('/api/places/autocomplete?q=petrobras');
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('com token devolve as sugestões', async () => {
    const res = await request(app).get('/api/places/autocomplete?q=petrobras').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.sugestoes).toHaveLength(2);
    expect(res.body.sugestoes[0]).toMatchObject({ cidade: 'Rio de Janeiro' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('q curto retorna 400 sem gastar cota', async () => {
    const res = await request(app).get('/api/places/autocomplete?q=pe').set(auth());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INPUT_CURTO');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
