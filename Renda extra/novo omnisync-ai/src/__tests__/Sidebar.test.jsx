import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SECTIONS } from '../lib/navigation';
import { Sidebar } from '../components/layout/Sidebar';

function Sonda() {
  const { pathname } = useLocation();
  return <div data-testid="sonda">{pathname}</div>;
}

function renderizar({ forceExpanded = false, onNavigate } = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Sidebar forceExpanded={forceExpanded} onNavigate={onNavigate} />
        <Routes>
          <Route path="*" element={<Sonda />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Sidebar — trilha de ícones (desktop)', () => {
  beforeEach(() => {
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'Ana Souza', email: 'ana@x.com', perfil: 'Diretor' }));
  });

  it('mostra exatamente um botão de trilha por seção', () => {
    renderizar();
    expect(screen.queryAllByTestId(/^rail-/).length).toBe(SECTIONS.length);
    SECTIONS.forEach(secao => {
      expect(screen.getByRole('button', { name: secao.titulo })).toBeTruthy();
    });
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('clique no ícone abre o painel com nome da seção e itens; clique de novo fecha', () => {
    renderizar();
    const trilha = screen.getByRole('button', { name: 'Operação' });
    fireEvent.click(trilha);
    const painel = screen.getByTestId('painel-secao');
    expect(within(painel).getByText('Operação')).toBeTruthy();
    expect(within(painel).getByText('Pedidos')).toBeTruthy();
    expect(within(painel).getByText('Produtos')).toBeTruthy();
    expect(trilha.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Operação' }));
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('clique em item navega e fecha o painel', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Inteligência' }));
    fireEvent.click(within(screen.getByTestId('painel-secao')).getByText('Radar de Mercado'));
    expect(screen.getByTestId('sonda').textContent).toBe('/radar-mercado');
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('clique fora da barra fecha o painel', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Finanças' }));
    expect(screen.getByTestId('painel-secao')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('Esc fecha o painel', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(screen.getByTestId('painel-secao')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('hover no ícone abre o painel sem clicar e ele fecha ao sair da barra', async () => {
    renderizar();
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Operação' }));
    expect(screen.getByTestId('painel-secao')).toBeTruthy();

    fireEvent.mouseLeave(screen.getByTestId('sidebar-raiz'));
    await new Promise(r => setTimeout(r, 250));
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('botão discreto do rodapé oculta a barra e persiste a preferência', () => {
    renderizar();
    fireEvent.click(screen.getByLabelText('Ocultar menu lateral'));
    expect(localStorage.getItem('omnisync-sidebar-hidden')).toBe('1');
  });

  it('dispara onNavigate ao clicar num item (fecha o drawer mobile)', () => {
    const onNavigate = vi.fn();
    renderizar({ onNavigate });
    fireEvent.click(screen.getByRole('button', { name: 'Principal' }));
    fireEvent.click(within(screen.getByTestId('painel-secao')).getByText('Dashboard'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar — modo expandido (drawer mobile, forceExpanded)', () => {
  beforeEach(() => {
    localStorage.setItem('omnisync-user', JSON.stringify({ nome: 'Ana Souza', email: 'ana@x.com', perfil: 'Diretor' }));
  });

  it('renderiza seções e itens visíveis, sem trilha e sem painel', () => {
    renderizar({ forceExpanded: true });
    expect(screen.getByText('Principal')).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Operação')).toBeTruthy();
    expect(screen.queryAllByTestId(/^rail-/).length).toBe(0);
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });

  it('item navega direto (sem painel)', () => {
    renderizar({ forceExpanded: true });
    fireEvent.click(screen.getByText('Vendas'));
    expect(screen.getByTestId('sonda').textContent).toBe('/vendas');
    expect(screen.queryByTestId('painel-secao')).toBeNull();
  });
});
