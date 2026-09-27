import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { SupplierDetail } from '../pages/SupplierDetail';

vi.mock('../services/api', () => ({
  api: {
    getSupplierBySlug: vi.fn(),
    analisarDominio: vi.fn(),
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

describe('SupplierDetail — seção Catálogo (link do site)', () => {
  const PRODUTO = {
    id: 'p7',
    name: 'Fone Bluetooth TWS',
    sku: 'DEMO-FONE-003',
    costPrice: 52,
    category: 'eletrônicos',
    imageUrl: null,
    comparacoes: {
      outrasOfertas: [{
        productId: 'p9',
        name: 'Fone Bluetooth TWS',
        sku: 'DEMO-FONE-001',
        costPrice: 48,
        supplier: { slug: '3g-foods', name: '3G Foods', city: 'Campinas', uf: 'SP', acceptsDropshipping: true, telefone: null, productCount: 3 },
      }],
      resumo: { custoAtual: 52, menorCusto: 48, diferenca: 4, souOMenor: false, totalOfertas: 2 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('com site, mostra o link "Ver catálogo no site do fornecedor" apontando para fora', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, siteUrl: 'https://deltaatlantica.com.br' },
      produtos: [],
    });
    renderizar();

    await screen.findByTestId('bloco-catalogo');
    const link = screen.getByTestId('link-catalogo-site');
    expect(link.getAttribute('href')).toBe('https://deltaatlantica.com.br');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.textContent).toMatch(/Ver catálogo no site/);
    // ainda sem produtos: avisa honestamente e mantém o link
    expect(screen.getByText(/Use o link acima para ver o catálogo/i)).toBeTruthy();
  });

  it('sem site, não há link e o vazio explica a situação', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, siteUrl: null },
      produtos: [],
    });
    renderizar();

    await screen.findByTestId('bloco-catalogo');
    expect(screen.queryByTestId('link-catalogo-site')).toBeNull();
    expect(screen.getByText(/não informou site público/i)).toBeTruthy();
  });

  it('renderiza os produtos com bloco de comparação e botão Gemini', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, siteUrl: 'https://deltaatlantica.com.br', productCount: 1 },
      produtos: [PRODUTO],
    });
    renderizar();

    const card = (await screen.findAllByText('Fone Bluetooth TWS'))[0].closest('article');
    expect(card).toBeTruthy();

    // bloco de comparação com a oferta do concorrente
    const comp = within(card).getByTestId('comparacao-ofertas');
    expect(within(comp).getByText('3G Foods')).toBeTruthy();
    expect(within(comp).getByText('R$ 48,00')).toBeTruthy();
    // Intl pt-BR usa espaço não separável depois de "R$" → casa com \s
    expect(within(comp).getByTestId('diferenca-preco').textContent).toMatch(/R\$\s*4,00/);

    // botão do Gemini presente no mesmo card
    expect(within(card).getByTestId('btn-melhor-compra')).toBeTruthy();
  });

  it('clicar em "Melhor compra" chama o Gemini com o produtoId e mostra a análise', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, productCount: 1 },
      produtos: [PRODUTO],
    });
    api.analisarDominio.mockResolvedValue({
      ok: true,
      analysis: 'O menor custo é da 3G Foods (R$ 48,00).',
      recommendations: ['Compre na 3G Foods em Campinas.'],
      risks: ['Confirme o lote antes de fechar.'],
    });

    renderizar();
    const card = (await screen.findAllByText('Fone Bluetooth TWS'))[0].closest('article');

    fireEvent.click(within(card).getByTestId('btn-melhor-compra'));

    expect(api.analisarDominio).toHaveBeenCalledWith('purchase', { produtoId: 'p7' });
    const analise = await within(card).findByTestId('analise-melhor-compra');
    expect(within(analise).getByText(/menor custo é da 3G Foods/)).toBeTruthy();
    expect(within(analise).getByText(/Compre na 3G Foods/)).toBeTruthy();
    expect(within(analise).getByText(/Confirme o lote/)).toBeTruthy();
  });

  it('falha do Gemini vira mensagem honesta no card (sem quebrar a página)', async () => {
    api.getSupplierBySlug.mockResolvedValue({
      fornecedor: { ...FORNECEDOR_CNPJ, productCount: 1 },
      produtos: [PRODUTO],
    });
    api.analisarDominio.mockResolvedValue({ ok: false, message: 'Dados insuficientes para recomendar.' });

    renderizar();
    const card = (await screen.findAllByText('Fone Bluetooth TWS'))[0].closest('article');

    fireEvent.click(within(card).getByTestId('btn-melhor-compra'));

    const erro = await within(card).findByTestId('erro-melhor-compra');
    expect(erro.textContent).toBe('Dados insuficientes para recomendar.');
    expect(within(card).queryByTestId('analise-melhor-compra')).toBeNull();
  });
});

