import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { SupplierDetail } from '../pages/SupplierDetail';

vi.mock('../services/api', () => ({
  api: {
    getSupplierBySlug: vi.fn(),
  },
}));

function renderizar(slug = 'delta-atlantica') {
  return render(
    <MemoryRouter initialEntries={[`/fornecedores/${slug}`]}>
      <AppProvider>
        <Routes>
          <Route path="/fornecedores/:slug" element={<SupplierDetail />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  );
}

const FORNECEDOR_CNPJ = {
  id: 9,
  slug: 'delta-atlantica',
  name: 'Delta Atlântica',
  city: 'São Paulo',
  uf: 'SP',
  niche: 'wholesale',
  productCount: 0,
  cnpjVerificado: true,
  cnpj: '11.222.333/0001-81',
  razaoSocial: 'Delta Atlântica Comércio Ltda',
  situacaoCadastral: 'ATIVA',
  abertoEm: '1995-04-01',
  cnae: '4712-100',
  cnaeDescricao: 'Comércio varejista de mercadorias em geral',
  capitalSocial: 100000,
  endereco: 'Av. Central, nº 1000, Centro — São Paulo/SP',
  descricao: 'comércio varejista de mercadorias em geral • atividade desde 1995 • São Paulo/SP',
};

describe('SupplierDetail — bloco Sobre (Receita Federal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSupplierBySlug.mockResolvedValue({ fornecedor: FORNECEDOR_CNPJ, produtos: [] });
  });

  it('exibe o bloco com CNPJ, razão social, CNAE e capital', async () => {
    renderizar();
    const bloco = await screen.findByTestId('sobre-receita');
    expect(within(bloco).getByText('Sobre (Receita Federal)')).toBeTruthy();
    expect(within(bloco).getByText('ATIVA')).toBeTruthy();
    expect(within(bloco).getByText('11.222.333/0001-81')).toBeTruthy();
    expect(within(bloco).getByText('Delta Atlântica Comércio Ltda')).toBeTruthy();
    expect(within(bloco).getByText(/Comércio varejista de mercadorias em geral/)).toBeTruthy();
    expect(within(bloco).getByText('R$ 100.000,00')).toBeTruthy();
    expect(within(bloco).getByText(/\d+ anos/)).toBeTruthy();
  });

  it('fornecedor sem CNPJ verificado não mostra o bloco da Receita', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, cnpjVerificado: false, cnpj: null, razaoSocial: null },
      produtos: [],
    });
    renderizar();
    expect(await screen.findByText('Delta Atlântica')).toBeTruthy();
    expect(screen.queryByTestId('sobre-receita')).toBeNull();
  });
});

describe('SupplierDetail — bloco Contato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expõe telefone, WhatsApp, e-mail, endereço e link do Google Maps', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: {
        ...FORNECEDOR_CNPJ,
        telefone: '(11) 3456-7890',
        whatsapp: '11987654321',
        email: 'vendas@delta.com.br',
        lat: -23.5505,
        lng: -46.6333,
      },
      produtos: [],
    });
    renderizar();

    const bloco = await screen.findByTestId('bloco-contato');
    expect(within(bloco).getByText('Contato')).toBeTruthy();

    const tel = within(bloco).getByText('(11) 3456-7890');
    expect(tel.closest('a').getAttribute('href')).toBe('tel:1134567890');

    expect(within(bloco).getByTestId('link-whatsapp').getAttribute('href'))
      .toBe('https://wa.me/5511987654321');

    const email = within(bloco).getByTestId('link-email');
    expect(email.getAttribute('href')).toBe('mailto:vendas@delta.com.br');
    expect(email.textContent).toBe('vendas@delta.com.br');

    const maps = within(bloco).getByTestId('link-maps');
    expect(maps.getAttribute('href')).toBe('https://www.google.com/maps?q=-23.5505,-46.6333');
    expect(maps.getAttribute('target')).toBe('_blank');
    expect(within(bloco).getByText(/Av\. Central, nº 1000/)).toBeTruthy();
    expect(within(bloco).getByText(/comércio varejista de mercadorias em geral/)).toBeTruthy();
  });

  it('sem coordenadas, o link do Google Maps busca pelo endereço', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, lat: null, lng: null },
      produtos: [],
    });
    renderizar();

    const maps = await screen.findByTestId('link-maps');
    expect(maps.getAttribute('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        'Av. Central, nº 1000, Centro — São Paulo/SP, São Paulo, SP',
      )}`,
    );
  });

  it('fornecedor sem telefone, WhatsApp ou e-mail avisa honestamente', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, telefone: null, whatsapp: null, email: null },
      produtos: [],
    });
    renderizar();

    const bloco = await screen.findByTestId('bloco-contato');
    expect(within(bloco).getByText(/não publicou telefone, WhatsApp ou e-mail/i)).toBeTruthy();
    expect(within(bloco).queryByTestId('link-whatsapp')).toBeNull();
    expect(within(bloco).queryByTestId('link-email')).toBeNull();
    expect(within(bloco).queryByTestId('link-maps')).toBeTruthy();
  });

  it('não vira link de WhatsApp quando o número é curto demais', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, whatsapp: '1234', telefone: null },
      produtos: [],
    });
    renderizar();

    const bloco = await screen.findByTestId('bloco-contato');
    expect(within(bloco).queryByTestId('link-whatsapp')).toBeNull();
  });
});
