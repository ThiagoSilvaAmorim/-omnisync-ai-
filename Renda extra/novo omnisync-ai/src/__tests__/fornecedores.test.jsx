import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { Fornecedores } from '../pages/Fornecedores';

vi.mock('../services/api', () => ({
  api: {
    getFornecedoresSalvos: vi.fn(async () => []),
    getSuppliers: vi.fn(async () => ({ ok: true, fornecedores: [] })),
    getSuppliersCidades: vi.fn(async () => ({ ok: true, cidades: [] })),
    importSuppliersOsm: vi.fn(async () => ({
      ok: true,
      novos: 0,
      fornecedores: [],
      mensagem: 'Nenhum fornecedor público encontrado para esse filtro no OpenStreetMap.',
    })),
    salvarFornecedor: vi.fn(),
    verificarFornecedor: vi.fn(),
    excluirFornecedor: vi.fn(),
    favoritarFornecedor: vi.fn(),
    arquivarFornecedor: vi.fn(),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Fornecedores />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('Fornecedores (estados honestos OSM)', () => {
  it('estado inicial pede busca por cidade, sem cards fixos', async () => {
    renderizar();
    expect(
      await screen.findByText(
        'Pesquise uma cidade (UF + cidade) para encontrar fornecedores públicos no OpenStreetMap.'
      )
    ).toBeTruthy();
  });

  it('lista vazia honesta quando nada foi salvo', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('tab', { name: 'Meus fornecedores' }));
    expect(
      await screen.findByText('Nenhum fornecedor salvo ainda. Busque empresas públicas acima ou cadastre manualmente.')
    ).toBeTruthy();
  });

  it('aba Favoritos tem estado vazio próprio', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('tab', { name: 'Favoritos' }));
    expect(await screen.findByText('Nenhum favorito ainda. Marque ★ nos fornecedores.')).toBeTruthy();
  });

  it('não exibe métricas inventadas sem dados', async () => {
    const { container } = renderizar();
    await screen.findByText(
      'Pesquise uma cidade (UF + cidade) para encontrar fornecedores públicos no OpenStreetMap.'
    );
    expect(container.textContent).not.toContain('Total comprado');
    expect(container.textContent).not.toContain('Em alta');
  });

  it('botão de importar OSM fica desabilitado sem UF e cidade', async () => {
    renderizar();
    const botoes = await screen.findAllByRole('button', { name: /Buscar novos no mapa/i });
    expect(botoes.length).toBeGreaterThan(0);
    expect(botoes.every(b => b.disabled)).toBe(true);
  });

  it('com UF e cidade, importação usa OpenStreetMap sem chave', async () => {
    const { api } = await import('../services/api');
    api.getSuppliersCidades.mockResolvedValue({ ok: true, cidades: ['Campinas'] });
    api.getSuppliers.mockResolvedValue({ ok: true, fornecedores: [] });
    api.importSuppliersOsm.mockResolvedValue({
      ok: true,
      novos: 1,
      mensagem: '1 novo(s) fornecedor(es) encontrado(s).',
      fornecedores: [
        {
          id: 1,
          osmId: 'node/1',
          nome: 'Distribuidora Campinas',
          categoria: 'wholesale',
          cidade: 'Campinas',
          uf: 'SP',
          fonte: 'osm',
        },
      ],
    });

    renderizar();
    const uf = await screen.findByLabelText('UF');
    fireEvent.change(uf, { target: { value: 'SP' } });
    const cidade = await screen.findByLabelText('Cidade');
    await waitFor(() => expect(cidade.disabled).toBe(false));
    fireEvent.change(cidade, { target: { value: 'Campinas' } });

    const botoes = await screen.findAllByRole('button', { name: /Buscar novos no mapa/i });
    const botao = botoes.find(b => !b.disabled) || botoes[0];
    await waitFor(() => expect(botao.disabled).toBe(false), { timeout: 3000 });
    fireEvent.click(botao);

    await waitFor(() => expect(api.importSuppliersOsm).toHaveBeenCalledWith({ uf: 'SP', cidade: 'Campinas' }));
    expect((await screen.findAllByText('Distribuidora Campinas')).length).toBeGreaterThan(0);
  });
});
