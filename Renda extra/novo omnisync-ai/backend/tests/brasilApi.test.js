import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buscarCnpj,
  formatarCnpj,
  validarCnpj,
  limparCacheBrasilApi,
} from '../src/services/brasilApi.js';

const BRUTO = {
  cnpj: '33000167000101',
  razao_social: 'PETROLEO BRASILEIRO S.A. - PETROBRAS',
  nome_fantasia: 'PETROBRAS',
  descricao_situacao_cadastral: 'ATIVA',
  data_inicio_atividade: '1953-06-27',
  cnae_fiscal: '0610100',
  cnae_fiscal_descricao: 'Extração de petróleo bruto',
  capital_social: 1000000000,
  descricao_tipo_de_logradouro: 'PRAÇA',
  logradouro: 'QUADRA 7',
  numero: '1',
  bairro: 'PRAIA DO CANTO',
  municipio: 'RIO DE JANEIRO',
  uf: 'RJ',
};

function resposta(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe('brasilApi — consulta de CNPJ (Receita via BrasilAPI)', () => {
  beforeEach(() => {
    limparCacheBrasilApi();
    global.fetch = vi.fn(async () => resposta(200, BRUTO));
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('consulta com User-Agent próprio e mapeia os dados da Receita', async () => {
    const dados = await buscarCnpj('33000167000101');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('/33000167000101');
    // A BrasilAPI bloqueia com 403 o UA padrão do Node — precisa do próprio.
    expect(opts.headers['User-Agent']).toBe('OmniSync/1.0 (+https://omnisync.ai)');
    expect(dados).toMatchObject({
      cnpj: '33000167000101',
      razaoSocial: 'PETROLEO BRASILEIRO S.A. - PETROBRAS',
      situacaoCadastral: 'ATIVA',
      cnae: '0610100',
      capitalSocial: 1000000000,
      endereco: { logradouro: 'PRAÇA QUADRA 7', numero: '1', city: 'RIO DE JANEIRO', uf: 'RJ' },
    });
    expect(dados.abertoEm).toBeInstanceOf(Date);
  });

  it('cacheia por 24h: segunda consulta não volta à rede', async () => {
    await buscarCnpj('33000167000101');
    await buscarCnpj('33000167000101');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('CNPJ com dígito verificador errado → CNPJ_INVALIDO sem rede', async () => {
    await expect(buscarCnpj('33000167000100')).rejects.toMatchObject({ code: 'CNPJ_INVALIDO' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('404 → CNPJ_NAO_ENCONTRADO', async () => {
    global.fetch.mockResolvedValue(resposta(404, {}));
    await expect(buscarCnpj('33000167000101'))
      .rejects.toMatchObject({ code: 'CNPJ_NAO_ENCONTRADO' });
  });

  it('429 → BRASILAPI_RATE_LIMIT', async () => {
    global.fetch.mockResolvedValue(resposta(429, {}));
    await expect(buscarCnpj('33000167000101'))
      .rejects.toMatchObject({ code: 'BRASILAPI_RATE_LIMIT' });
  });

  it('403 → BRASILAPI_FAILED (bloqueio honesto, sem inventar dado)', async () => {
    global.fetch.mockResolvedValue(resposta(403, {}));
    await expect(buscarCnpj('33000167000101'))
      .rejects.toMatchObject({ code: 'BRASILAPI_FAILED' });
  });

  it('formatarCnpj formata e valida os 14 dígitos', () => {
    expect(formatarCnpj('33000167000101')).toBe('33.000.167/0001-01');
    expect(formatarCnpj('123')).toBeNull();
    expect(validarCnpj('33000167000101')).toBe(true);
    expect(validarCnpj('33000167000100')).toBe(false);
    expect(validarCnpj('11111111111111')).toBe(false);
  });
});
