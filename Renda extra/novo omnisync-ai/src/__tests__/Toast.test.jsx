import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AppProvider, useApp } from '../context/AppContext';
import { ToastContainer } from '../components/ui/Toast';

// Captura o addToast real do AppContext para disparar toasts no teste.
function Captura({ aoPronto }) {
  const { addToast } = useApp();
  aoPronto(addToast);
  return null;
}

function preparar() {
  let disparar;
  render(
    <AppProvider>
      <Captura aoPronto={fn => { disparar = fn; }} />
      <ToastContainer />
    </AppProvider>
  );
  return (...args) => act(() => disparar(...args));
}

describe('Toast — variantes com ícone e cor coerentes', () => {
  it('padrão é sucesso: ícone verde e role=status', () => {
    const disparar = preparar();
    disparar('Preço atualizado');
    const box = screen.getByText('Preço atualizado').closest('div');
    expect(box.querySelector('.text-teal-500')).toBeTruthy();
    expect(box.getAttribute('role')).toBe('status');
  });

  it('erro: ícone vermelho e role=alert', () => {
    const disparar = preparar();
    disparar('Erro ao carregar dados de integrações', 'erro');
    const box = screen.getByText('Erro ao carregar dados de integrações').closest('div');
    expect(box.querySelector('.text-red-500')).toBeTruthy();
    expect(box.getAttribute('role')).toBe('alert');
  });

  it('aviso: ícone âmbar', () => {
    const disparar = preparar();
    disparar('Saldo baixo', 'aviso');
    const box = screen.getByText('Saldo baixo').closest('div');
    expect(box.querySelector('.text-amber-500')).toBeTruthy();
    expect(box.getAttribute('role')).toBe('status');
  });

  it('tipo desconhecido cai no padrão sucesso', () => {
    const disparar = preparar();
    disparar('Mensagem genérica', 'indefinido');
    const box = screen.getByText('Mensagem genérica').closest('div');
    expect(box.querySelector('.text-teal-500')).toBeTruthy();
  });
});
