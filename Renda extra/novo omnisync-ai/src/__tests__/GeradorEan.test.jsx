import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import { GeradorEan } from '../pages/GeradorEan';

function renderizar() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <GeradorEan />
      </AppProvider>
    </MemoryRouter>
  );
}

describe('GeradorEan', () => {
  it('gera código válido com o prefixo', async () => {
    renderizar();
    fireEvent.click(screen.getAllByText('Gerar EAN')[0]);
    const codigo = await screen.findByText(/^789\d{10}$/);
    expect(codigo).toBeTruthy();
  });

  it('valida código conhecido', async () => {
    renderizar();
    fireEvent.change(screen.getByLabelText('Código EAN-13'), { target: { value: '5901234123457' } });
    fireEvent.click(screen.getByText('Validar'));
    expect(await screen.findByText('Código EAN-13 válido.')).toBeTruthy();
  });
});
