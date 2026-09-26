import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocalAutocomplete } from '../components/fornecedores/LocalAutocomplete';
import { FiltersBar } from '../components/fornecedores/FiltersBar';

vi.mock('../services/api', () => ({ api: { autocompleteLocal: vi.fn() } }));
import { api } from '../services/api';

const SUGESTOES = {
  sugestoes: [
    {
      placeId: 'p1',
      descricao: 'Petrobras - EDISE, Rio de Janeiro, Brazil',
      principal: 'Petrobras - EDISE',
      secundario: 'Rio de Janeiro, Brazil',
      cidade: 'Rio de Janeiro',
      estado: 'Rio de Janeiro',
    },
    {
      placeId: 'p2',
      descricao: 'Betim, Minas Gerais, Brazil',
      principal: 'Betim',
      secundario: 'Minas Gerais, Brazil',
      cidade: 'Betim',
      estado: 'Minas Gerais',
    },
  ],
};

function esperarDebounce() {
  return new Promise(r => setTimeout(r, 450));
}

describe('LocalAutocomplete (Google Places)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não consulta a API com menos de 3 caracteres', async () => {
    render(<LocalAutocomplete onSelecionar={() => {}} />);
    fireEvent.change(screen.getByLabelText('Buscar local'), { target: { value: 'pe' } });
    await esperarDebounce();
    expect(api.autocompleteLocal).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sugestoes-locais')).toBeNull();
  });

  it('digitar 3+ caracteres traz sugestões e o clique dispara a seleção', async () => {
    api.autocompleteLocal.mockResolvedValue(SUGESTOES);
    const onSelecionar = vi.fn();
    render(<LocalAutocomplete onSelecionar={onSelecionar} />);

    fireEvent.change(screen.getByLabelText('Buscar local'), { target: { value: 'rio de janeiro' } });
    await esperarDebounce();

    await waitFor(() => expect(screen.getByTestId('sugestoes-locais')).toBeTruthy());
    expect(screen.getAllByTestId('sugestao-local')).toHaveLength(2);

    fireEvent.click(screen.getAllByTestId('sugestao-local')[0]);
    expect(onSelecionar).toHaveBeenCalledTimes(1);
    expect(onSelecionar).toHaveBeenCalledWith(expect.objectContaining({ cidade: 'Rio de Janeiro' }));
    expect(screen.queryByTestId('sugestoes-locais')).toBeNull();
  });

  it('erro do backend vira aviso honesto (ex.: sem chave/rota)', async () => {
    api.autocompleteLocal.mockRejectedValue(new Error('Google Places não configurado (falta GOOGLE_PLACES_KEY).'));
    render(<LocalAutocomplete onSelecionar={() => {}} />);

    fireEvent.change(screen.getByLabelText('Buscar local'), { target: { value: 'betim' } });
    await esperarDebounce();

    await waitFor(() => expect(screen.getByTestId('erro-local')).toBeTruthy());
    expect(screen.getByTestId('erro-local').textContent).toContain('GOOGLE_PLACES_KEY');
  });
});

describe('FiltersBar + autocomplete de local', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderBar(cidades = []) {
    const handlers = {
      onQ: vi.fn(),
      onUf: vi.fn(),
      onNiche: vi.fn(),
      onCidade: vi.fn(),
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
        {...handlers}
      />
    );
    return handlers;
  }

  it('sugestão com cidade do catálogo aplica cidade + UF', async () => {
    api.autocompleteLocal.mockResolvedValue(SUGESTOES);
    const h = renderBar([{ city: 'Rio de Janeiro', total: 12 }]);

    fireEvent.change(screen.getByLabelText('Buscar local'), { target: { value: 'rio de janeiro' } });
    await esperarDebounce();
    await waitFor(() => expect(screen.getAllByTestId('sugestao-local').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByTestId('sugestao-local')[0]);
    expect(h.onCidade).toHaveBeenCalledWith('Rio de Janeiro');
    expect(h.onUf).toHaveBeenCalledWith('RJ');
    expect(h.onQ).toHaveBeenCalledWith('');
  });

  it('cidade fora do catálogo cai na busca textual com UF', async () => {
    api.autocompleteLocal.mockResolvedValue(SUGESTOES);
    const h = renderBar([{ city: 'São Paulo', total: 3 }]);

    fireEvent.change(screen.getByLabelText('Buscar local'), { target: { value: 'betim' } });
    await esperarDebounce();
    await waitFor(() => expect(screen.getAllByTestId('sugestao-local').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByTestId('sugestao-local')[1]);
    expect(h.onCidade).toHaveBeenCalledWith('');
    expect(h.onQ).toHaveBeenCalledWith('Betim');
    expect(h.onUf).toHaveBeenCalledWith('MG');
  });
});
