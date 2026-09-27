import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FiltersBar } from '../components/fornecedores/FiltersBar';

// LocalAutocomplete é substituído por um gatilho: queremos testar
// o que o FiltersBar FAZ ao receber uma sugestão, não a chamada
// ao Google (cuberta em LocalAutocomplete.test.jsx).
vi.mock('../components/fornecedores/LocalAutocomplete', () => ({
  LocalAutocomplete: ({ onSelecionar }) => (
    <button
      type="button"
      data-testid="disparar-sugestao"
      onClick={() => onSelecionar(window.__sugestao)}
    >
      disparar
    </button>
  ),
}));

function renderizar(cidades = []) {
  const spies = {
    onQ: vi.fn(),
    onUf: vi.fn(),
    onCidade: vi.fn(),
    onNiche: vi.fn(),
    onOrder: vi.fn(),
    onCategory: vi.fn(),
  };

  render(
    <FiltersBar
      tab="fornecedores"
      q=""
      uf=""
      niche=""
      niches={[]}
      cidade=""
      cidades={cidades}
      order=""
      categorias={[]}
      {...spies}
    />,
  );

  return spies;
}

function selecionar(sugestao) {
  window.__sugestao = sugestao;
  fireEvent.click(screen.getByTestId('disparar-sugestao'));
}

const BETIM = { principal: 'Betim', cidade: 'Betim', estado: 'MG', descricao: 'Betim, MG, Brasil' };

describe('FiltersBar — aplicarLocal (sugestão do Google Places)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__sugestao = null;
  });

  it('aceita a UF como SIGLA (formato que o Google devolve)', () => {
    const s = renderizar([]);
    selecionar(BETIM);
    expect(s.onUf).toHaveBeenCalledWith('MG');
    expect(s.onCidade).toHaveBeenCalledWith('');
    expect(s.onQ).toHaveBeenCalledWith('Betim');
  });

  it('aceita a UF por extenso', () => {
    const s = renderizar([]);
    selecionar({ ...BETIM, estado: 'Minas Gerais' });
    expect(s.onUf).toHaveBeenCalledWith('MG');
  });

  it('estado desconhecido não aplica UF nenhuma', () => {
    const s = renderizar([]);
    selecionar({ ...BETIM, estado: 'Atlântida' });
    expect(s.onUf).not.toHaveBeenCalled();
    expect(s.onQ).toHaveBeenCalledWith('Betim');
  });

  it('cidade já cadastrada vira filtro de cidade + UF', () => {
    const s = renderizar([{ city: 'Betim', total: 3 }]);
    selecionar(BETIM);
    expect(s.onQ).toHaveBeenCalledWith('');
    expect(s.onUf).toHaveBeenCalledWith('MG');
    expect(s.onCidade).toHaveBeenCalledWith('Betim');
  });

  it('sem cidade/estado, usa o texto principal na busca', () => {
    const s = renderizar([]);
    selecionar({ principal: 'Petrobras - EDISEN', cidade: null, estado: null });
    expect(s.onQ).toHaveBeenCalledWith('Petrobras - EDISEN');
    expect(s.onUf).not.toHaveBeenCalled();
    expect(s.onCidade).toHaveBeenCalledWith('');
  });
});
