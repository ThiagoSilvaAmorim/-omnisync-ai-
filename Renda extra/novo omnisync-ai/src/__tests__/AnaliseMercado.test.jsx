import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnaliseMercado } from '../pages/AnaliseMercado';

const estado = vi.hoisted(() => ({ perfil: 'Diretor' }));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { nome: 'Teste', perfil: estado.perfil } }),
}));

vi.mock('../services/api', () => ({
  api: {
    analiseMercado: {
      criar: vi.fn(),
      buscar: vi.fn(),
      posicionamento: vi.fn(),
    },
  },
}));

import { api } from '../services/api';

const ITEM = {
  ordem: 1,
  produtoId: 'MLB111',
  nome: 'Fone A',
  marca: 'MarcaX',
  status: 'active',
  dominio: 'MLB-HEADPHONES',
  imagemUrl: null,
  permalink: null,
  criadoEm: '2024-01-01T00:00:00Z',
  diasNoAr: 900,
  preco: null,
  vendasMes: null,
  vendasDia: null,
  freteGratis: null,
  reputacao: null,
  fotos: 3,
  variacoes: 1,
  urlPublica: 'https://lista.mercadolivre.com.br/fone-a',
};

describe('Análise de Mercado (reais, sem mock de dados)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estado.perfil = 'Diretor';
  });

  it('análise exibe produtos reais e "—" onde a API não expõe métricas', async () => {
    api.analiseMercado.criar.mockResolvedValue({
      ok: true,
      cached: false,
      analise: {
        id: 1,
        termo: 'fone',
        fonte: 'catalogo_ml',
        totalResultados: 10000,
        criadaEm: new Date().toISOString(),
        expiraEm: new Date(Date.now() + 3600000).toISOString(),
        itens: [ITEM],
      },
    });

    render(<AnaliseMercado />);
    fireEvent.change(screen.getByLabelText('Palavra-chave'), { target: { value: 'fone' } });
    fireEvent.click(screen.getByText('Analisar'));

    expect(await screen.findByText('Fone A')).toBeTruthy();
    expect(api.analiseMercado.criar).toHaveBeenCalledWith('fone');
    expect(screen.getByText('Produtos analisados')).toBeTruthy();
    expect(screen.getByText('MarcaX')).toBeTruthy();
    // Métricas que o catálogo não expõe ficam em "—".
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/A busca de anúncios está bloqueada \(403\)/i)).toBeTruthy();

    // Nome e foto são links clicáveis que abrem no Mercado Livre (nova aba).
    const link = screen.getByRole('link', { name: /Fone A/ });
    expect(link.getAttribute('href')).toBe('https://lista.mercadolivre.com.br/fone-a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('erro do backend é exibido sem inventar conteúdo', async () => {
    api.analiseMercado.criar.mockRejectedValue(new Error('Busca do catálogo do Mercado Livre falhou (HTTP 403).'));

    render(<AnaliseMercado />);
    fireEvent.change(screen.getByLabelText('Palavra-chave'), { target: { value: 'fone' } });
    fireEvent.click(screen.getByText('Analisar'));

    expect(await screen.findByText(/HTTP 403/)).toBeTruthy();
    expect(screen.queryByText('Fone A')).toBeNull();
  });

  it('posicionamento devolve a posição real no catálogo', async () => {
    api.analiseMercado.posicionamento.mockResolvedValue({
      ok: true,
      termo: 'fone',
      produtoId: 'MLB111',
      encontrado: true,
      posicao: 3,
      posicoesVerificadas: 50,
      total: 10000,
      fonte: 'catalogo_ml',
    });

    render(<AnaliseMercado />);
    fireEvent.change(screen.getByLabelText('Palavra-chave da posição'), { target: { value: 'fone' } });
    fireEvent.change(screen.getByLabelText('ID do meu produto'), { target: { value: 'MLB111' } });
    fireEvent.click(screen.getByText('Ver posição'));

    expect(await screen.findByText('#3')).toBeTruthy();
    expect(api.analiseMercado.posicionamento).toHaveBeenCalledWith('fone', 'MLB111');
    expect(screen.getByText(/posição 3 dos 50 primeiros/i)).toBeTruthy();
  });

  it('perfil sem acesso vê Acesso restrito', () => {
    estado.perfil = 'Comercial';
    render(<AnaliseMercado />);
    expect(screen.getByText('Acesso restrito')).toBeTruthy();
    expect(api.analiseMercado.criar).not.toHaveBeenCalled();
  });
});
