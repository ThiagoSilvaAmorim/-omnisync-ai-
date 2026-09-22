import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiActionButton } from '../components/ui/AiActionButton';

function montar(onRun, onResult) {
  return render(<AiActionButton label="Analisar com Gemini" onRun={onRun} onResult={onResult} />);
}

describe('AiActionButton', () => {
  it('mostra loading durante a execução', async () => {
    let liberar;
    const promessa = new Promise(r => { liberar = r; });
    montar(() => promessa);
    fireEvent.click(screen.getByText('Analisar com Gemini'));
    expect(await screen.findByText('Analisando com IA...')).toBeTruthy();
    liberar({ ok: true });
  });

  it('sucesso chama onResult sem mensagem de erro', async () => {
    const onResult = vi.fn();
    montar(async () => ({ ok: true }), onResult);
    fireEvent.click(screen.getByText('Analisar com Gemini'));
    await waitFor(() => expect(onResult).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('resposta ok:false mostra dados insuficientes', async () => {
    montar(async () => ({ ok: false, code: 'INSUFFICIENT_DATA' }));
    fireEvent.click(screen.getByText('Analisar com Gemini'));
    expect(await screen.findByText('Dados insuficientes para uma análise confiável.')).toBeTruthy();
  });

  it('falha mostra erro explícito', async () => {
    montar(async () => { throw new Error('Rede caiu'); });
    fireEvent.click(screen.getByText('Analisar com Gemini'));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
