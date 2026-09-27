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

import { autocompleteLocal, buscarFornecedoresPlaces, limparCachePlaces } from '../src/services/googlePlaces.js';

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

  it('predição legada SEM types reconstitui cidade/UF pela ordem dos termos', async () => {
    limparCachePlaces();
    global.fetch.mockResolvedValue(resposta(200, {
      status: 'OK',
      predictions: [
        {
          place_id: 'p9',
          description: 'Petrobras - EDISEN - Avenida Henrique Valadares - Centro, Rio de Janeiro - RJ, Brasil',
          structured_formatting: { main_text: 'Petrobras - EDISEN', secondary_text: 'Avenida Henrique Valadares - Centro, Rio de Janeiro - RJ, Brasil' },
          terms: [
            { value: 'Petrobras - EDISEN', types: [] },
            { value: 'Avenida Henrique Valadares', types: [] },
            { value: 'Centro', types: [] },
            { value: 'Rio de Janeiro', types: [] },
            { value: 'RJ', types: [] },
            { value: 'Brasil', types: [] },
          ],
        },
      ],
    }));
    const sugestoes = await autocompleteLocal('edisen legado');
    expect(sugestoes[0]).toMatchObject({ cidade: 'Rio de Janeiro', estado: 'RJ' });
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

describe('googlePlaces — buscarFornecedoresPlaces (Text Search)', () => {
  const PLACES = {
    places: [
      {
        id: 'ChIJAVEC',
        displayName: { text: 'AVEC CAMPINAS DISTRIBUIDORA LTDA' },
        nationalPhoneNumber: '(19) 3728-2200',
        websiteUri: 'http://ecomaveccampinas.com.br/',
        formattedAddress: 'Av. Ricardo Bassoli Cezare, 281, Campinas - SP',
        location: { latitude: -22.9099, longitude: -47.0626 },
      },
      { id: 'sem-nome', displayName: null },
    ],
  };

  beforeEach(() => {
    limparCachePlaces();
    process.env.GOOGLE_PLACES_KEY = CHAVE;
    global.fetch = vi.fn(async () => resposta(200, PLACES));
  });

  afterEach(() => {
    delete global.fetch;
    delete process.env.GOOGLE_PLACES_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it('POST com textQuery em pt-BR e FieldMask; mapeia telefone/site/geo', async () => {
    const itens = await buscarFornecedoresPlaces({ termo: 'importadora e distribuidora', cidade: 'Campinas', uf: 'sp', limite: 8 });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('places:searchText');
    expect(opts.method).toBe('POST');
    expect(opts.headers['X-Goog-Api-Key']).toBe(CHAVE);
    expect(opts.headers['X-Goog-FieldMask']).toContain('places.displayName');
    const corpo = JSON.parse(opts.body);
    expect(corpo).toMatchObject({
      textQuery: 'importadora e distribuidora em Campinas SP',
      languageCode: 'pt-BR',
      regionCode: 'BR',
      maxResultCount: 8,
    });

    // item sem nome é descartado; o válido vira fornecedor pronto
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      placeId: 'ChIJAVEC',
      nome: 'AVEC CAMPINAS DISTRIBUIDORA LTDA',
      telefone: '(19) 3728-2200',
      site: 'http://ecomaveccampinas.com.br/',
      lat: -22.9099,
      lng: -47.0626,
    });
  });

  it('cacheia a consulta por 5min (repetir não volta à rede)', async () => {
    await buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' });
    await buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('termo vazio → TERMO_INVALIDO sem rede', async () => {
    await expect(buscarFornecedoresPlaces({ termo: '   ', cidade: 'Campinas', uf: 'SP' }))
      .rejects.toMatchObject({ code: 'TERMO_INVALIDO' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sem cidade → CIDADE_INVALIDA sem rede', async () => {
    await expect(buscarFornecedoresPlaces({ termo: 'importadora' }))
      .rejects.toMatchObject({ code: 'CIDADE_INVALIDA' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sem chave → SEM_CHAVE sem rede', async () => {
    delete process.env.GOOGLE_PLACES_KEY;
    await expect(buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' }))
      .rejects.toMatchObject({ code: 'SEM_CHAVE' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('429 → PLACES_RATE_LIMIT', async () => {
    global.fetch.mockResolvedValue(resposta(429, {}));
    await expect(buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' }))
      .rejects.toMatchObject({ code: 'PLACES_RATE_LIMIT' });
  });

  it('403 → PLACES_NEGADO com a mensagem do Google', async () => {
    global.fetch.mockResolvedValue(resposta(403, { error: { message: 'API key inválida' } }));
    await expect(buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' }))
      .rejects.toMatchObject({ code: 'PLACES_NEGADO', message: 'API key inválida' });
  });

  it('fetch falhando → PLACES_TIMEOUT', async () => {
    global.fetch.mockRejectedValue(new Error('abort'));
    await expect(buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' }))
      .rejects.toMatchObject({ code: 'PLACES_TIMEOUT' });
  });

  it('corpo não-JSON → PLACES_INVALIDO', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
    await expect(buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' }))
      .rejects.toMatchObject({ code: 'PLACES_INVALIDO' });
  });

  it('aceita GOOGLE_MAPS_API_KEY (nome usado no Railway)', async () => {
    delete process.env.GOOGLE_PLACES_KEY;
    process.env.GOOGLE_MAPS_API_KEY = 'chave-railway';
    await buscarFornecedoresPlaces({ termo: 'importadora', cidade: 'Campinas', uf: 'SP' });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers['X-Goog-Api-Key']).toBe('chave-railway');
  });
});
