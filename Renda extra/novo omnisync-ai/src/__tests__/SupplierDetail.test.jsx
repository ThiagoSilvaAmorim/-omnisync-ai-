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

  it('exibe o bloco com CNPJ, razão social, CNAE, capital e endereço', async () => {
    renderizar();
    const bloco = await screen.findByTestId('sobre-receita');
    expect(within(bloco).getByText('Sobre (Receita Federal)')).toBeTruthy();
    expect(within(bloco).getByText('ATIVA')).toBeTruthy();
    expect(within(bloco).getByText('11.222.333/0001-81')).toBeTruthy();
    expect(within(bloco).getByText('Delta Atlântica Comércio Ltda')).toBeTruthy();
    expect(within(bloco).getByText(/Comércio varejista de mercadorias em geral/)).toBeTruthy();
    expect(within(bloco).getByText('R$ 100.000,00')).toBeTruthy();
    expect(within(bloco).getByText(/Av\. Central, nº 1000/)).toBeTruthy();
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
