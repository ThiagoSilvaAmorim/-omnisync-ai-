import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { api } from '../services/api';
import { CnpjDialog } from '../components/fornecedores/CnpjDialog';

vi.mock('../services/api', () => ({
  api: {
    buscarCnpjFornecedor: vi.fn(),
    criarFornecedorPorCnpj: vi.fn(),
  },
}));

const probe = { pathname: '' };

function Probe() {
  probe.pathname = useLocation().pathname;
  return null;
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/fornecedores']}>
      <Probe />
      <AppProvider>
        <CnpjDialog open onClose={vi.fn()} />
      </AppProvider>
    </MemoryRouter>
  );
}

const CNPJ_DIGITOS = '11222333000181';
const CNPJ_MASCARADO = '11.222.333/0001-81';

const PREVIEW = {
  dados: {
    cnpj: CNPJ_MASCARADO,
    razaoSocial: 'Delta Atlântica Comércio Ltda',
    nomeFantasia: 'Delta Atlântica',
    situacaoCadastral: 'ATIVA',
    cnae: '4712-100',
    cnaeDescricao: 'Comércio varejista de mercadorias em geral',
    abertoEm: '1995-04-01',
    capitalSocial: 100000,
    endereco: {
      logradouro: 'Av. Central',
      numero: '1000',
      bairro: 'Centro',
      city: 'São Paulo',
      uf: 'SP',
    },
  },
  descricao: 'comércio varejista de mercadorias em geral • atividade desde 1995 • São Paulo/SP',
  jaCadastrado: null,
};

async function buscarCnpj() {
  fireEvent.change(screen.getByTestId('input-cnpj'), { target: { value: CNPJ_DIGITOS } });
  fireEvent.click(screen.getByRole('button', { name: /Buscar/ }));
  return screen.findByTestId('preview-cnpj');
}

describe('CnpjDialog — cadastro de fornecedor por CNPJ (BrasilAPI)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    probe.pathname = '';
  });

  it('aplica máscara, busca no backend e mostra preview com razão, situação e endereço', async () => {
    api.buscarCnpjFornecedor.mockResolvedValue(PREVIEW);
    renderizar();
    const input = screen.getByTestId('input-cnpj');
    fireEvent.change(input, { target: { value: CNPJ_DIGITOS } });
    expect(input.value).toBe(CNPJ_MASCARADO);
    fireEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    expect(await screen.findByTestId('preview-cnpj')).toBeTruthy();
    expect(api.buscarCnpjFornecedor).toHaveBeenCalledWith(CNPJ_MASCARADO);
    const prev = within(screen.getByTestId('preview-cnpj'));
    expect(prev.getByText('Delta Atlântica Comércio Ltda')).toBeTruthy();
    expect(prev.getByText('ATIVA')).toBeTruthy();
    expect(prev.getByText(/Av\. Central, nº 1000/)).toBeTruthy();
    expect(prev.getByText(/Comércio varejista de mercadorias em geral/)).toBeTruthy();
  });

  it('erro da API exibe alerta honesto (sem inventar dados)', async () => {
    api.buscarCnpjFornecedor.mockRejectedValue(new Error('CNPJ não encontrado na Receita'));
    renderizar();
    fireEvent.change(screen.getByTestId('input-cnpj'), { target: { value: CNPJ_DIGITOS } });
    fireEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CNPJ não encontrado na Receita');
    expect(screen.queryByTestId('preview-cnpj')).toBeNull();
  });

  it('CNPJ já cadastrado oferece Ver fornecedor e navega ao detalhe', async () => {
    api.buscarCnpjFornecedor.mockResolvedValue({
      ...PREVIEW,
      jaCadastrado: { name: 'Delta Atlântica', slug: 'delta-atlantica' },
    });
    renderizar();
    await buscarCnpj();
    fireEvent.click(await screen.findByRole('button', { name: /Ver fornecedor/ }));
    await waitFor(() => {
      expect(probe.pathname).toBe('/fornecedores/delta-atlantica');
    });
  });

  it('Cadastrar cria fornecedor com os dígitos do CNPJ e navega ao detalhe', async () => {
    api.buscarCnpjFornecedor.mockResolvedValue(PREVIEW);
    api.criarFornecedorPorCnpj.mockResolvedValue({ fornecedor: { slug: 'delta-atlantica' } });
    renderizar();
    await buscarCnpj();
    fireEvent.click(await screen.findByRole('button', { name: /Cadastrar fornecedor/ }));
    await waitFor(() => {
      expect(api.criarFornecedorPorCnpj).toHaveBeenCalledWith({ cnpj: CNPJ_DIGITOS });
    });
    await waitFor(() => {
      expect(probe.pathname).toBe('/fornecedores/delta-atlantica');
    });
  });

  it('erro na criação (duplicado) mantém o diálogo aberto com o alerta', async () => {
    api.buscarCnpjFornecedor.mockResolvedValue(PREVIEW);
    api.criarFornecedorPorCnpj.mockRejectedValue(new Error('CNPJ já cadastrado'));
    renderizar();
    await buscarCnpj();
    fireEvent.click(await screen.findByRole('button', { name: /Cadastrar fornecedor/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CNPJ já cadastrado');
    expect(probe.pathname).toBe('/fornecedores');
  });
});
