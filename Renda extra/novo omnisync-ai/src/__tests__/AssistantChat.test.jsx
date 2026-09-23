import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssistantChat } from '../components/assistant/AssistantChat';

vi.mock('../lib/gemini', () => ({
  askAssistant: vi.fn(async () => 'resposta gemini'),
}));

vi.mock('../services/api', () => ({
  api: {
    getPedidos: vi.fn(async () => [{ id: 'P1', total: 200, data: '2026-09-10' }]),
    getProdutos: vi.fn(async () => ({ produtos: [] })),
    getCupons: vi.fn(async () => []),
    getTransacoes: vi.fn(async () => []),
  },
}));

describe('AssistantChat (atalhos reais)', () => {
  it('chip responde com dados reais sem Gemini', async () => {
    render(<AssistantChat embedded />);
    fireEvent.click(screen.getByText('Resumo financeiro'));
    expect(await screen.findByText('Ainda não há movimentações financeiras registradas.')).toBeTruthy();
  });
});
