import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock do api para usar o caminho de demonstração (sem backend real)
vi.mock('../services/api', () => ({
  api: {
    login: vi.fn(async (email, senha) => {
      await new Promise(r => setTimeout(r, 10));
      if (email.toLowerCase() === 'admin@omnisync.ai' && senha === '123456') {
        return { token: 'mock-token', user: { nome: 'Carlos Menezes', email } };
      }
      throw new Error('E-mail ou senha inválidos');
    }),
  },
}));

function Consumer() {
  const { user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.nome : 'não-logado'}</span>
      <button onClick={() => login('admin@omnisync.ai', '123456')}>entrar</button>
      <button onClick={logout}>sair</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('faz login e logout', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('não-logado');

    fireEvent.click(screen.getByText('entrar'));
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('Carlos Menezes'));

    fireEvent.click(screen.getByText('sair'));
    expect(screen.getByTestId('user').textContent).toBe('não-logado');
  });
});
