import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../services/api';
import { normalizarPerfil } from '../lib/permissoes';

// O e-mail do diretor (único com permissão de criar usuários).
const DIRETOR_EMAIL = 't.bruno000@gmail.com';
const NOME_DIRETOR = 'Thiago Amorim';

// ============================================
// AuthContext — sessão do usuário.
// O login usa a camada api.js: com VITE_API_URL
// definido, autentica no backend real; sem ele,
// usa as credenciais de demonstração.
// ============================================

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('omnisync-user');
      if (!stored) return null;
      const u = JSON.parse(stored);
      // Normaliza sessões antigas salvas com rótulos legados (ex: Admin).
      return { ...u, perfil: normalizarPerfil(u.perfil) };
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, senha) => {
    try {
      const result = await api.login(email, senha);
      const u = {
        nome: result?.user?.nome || 'Usuário',
        email: result?.user?.email || email.toLowerCase(),
        perfil: normalizarPerfil(result?.user?.perfil || 'Diretor'),
      };
      setUser(u);
      localStorage.setItem('omnisync-user', JSON.stringify(u));
      return u;
    } catch (err) {
      // Fallback: usuários cadastrados localmente
      const usuarios = JSON.parse(localStorage.getItem('omnisync-usuarios') || '[]');
      const usuario = usuarios.find(u => u.email === email.toLowerCase() && u.senha === senha);
      if (usuario) {
        const u = { nome: usuario.nome, email: usuario.email, perfil: normalizarPerfil(usuario.perfil || 'Comercial') };
        setUser(u);
        localStorage.setItem('omnisync-user', JSON.stringify(u));
        return u;
      }
      throw err;
    }
  }, []);

  // Cadastro de novo usuário — apenas o diretor pode criar contas.
  // Isso evita que qualquer pessoa cadastre-se apenas colocando o nome.
  const registrar = useCallback(async (nome, email, senha) => {
    // Verificar se o usuário atual é o diretor (identidade ou perfil Diretor)
    const usuarioAtual = user;
    if (!usuarioAtual) throw new Error('É necessário estar logado como diretor para cadastrar novos usuários');

    const isDiretor = (usuarioAtual.email === DIRETOR_EMAIL && usuarioAtual.nome === NOME_DIRETOR)
      || normalizarPerfil(usuarioAtual.perfil) === 'Diretor';
    if (!isDiretor) throw new Error('Apenas o Diretor (Thiago Amorim) pode cadastrar novos usuários');

    await new Promise(r => setTimeout(r, 400));
    if (!nome.trim() || !email.trim() || !senha) throw new Error('Preencha todos os campos');
    if (senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres');

    const usuarios = JSON.parse(localStorage.getItem('omnisync-usuarios') || '[]');
    if (usuarios.some(u => u.email === email.toLowerCase())) {
      throw new Error('Este e-mail já está cadastrado');
    }
    usuarios.push({ nome: nome.trim(), email: email.toLowerCase(), senha, perfil: 'Usuario' });
    localStorage.setItem('omnisync-usuarios', JSON.stringify(usuarios));

    const u = { nome: nome.trim(), email: email.toLowerCase(), perfil: 'Usuario' };
    setUser(u);
    localStorage.setItem('omnisync-user', JSON.stringify(u));
    return u;
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('omnisync-user');
    localStorage.removeItem('omnisync-token');
  }, []);

  const value = useMemo(() => ({ user, login, registrar, logout }), [user, login, registrar, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
