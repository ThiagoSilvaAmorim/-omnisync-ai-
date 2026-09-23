import { lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AcessoRestrito } from './components/ui/AcessoRestrito';
import { useAuth } from './context/AuthContext';
import { podeAcessar } from './lib/permissoes';

// Lazy loading: cada tela vira um chunk separado, carregado
// apenas quando a rota correspondente é acessada.
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Cadastro = lazy(() => import('./pages/Cadastro').then(m => ({ default: m.Cadastro })));
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha').then(m => ({ default: m.EsqueciSenha })));
const Empresa = lazy(() => import('./pages/Empresa').then(m => ({ default: m.Empresa })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const ProdutoIntel = lazy(() => import('./pages/ProdutoIntel').then(m => ({ default: m.ProdutoIntel })));
const Produtos = lazy(() => import('./pages/Produtos').then(m => ({ default: m.Produtos })));
const RadarMercado = lazy(() => import('./pages/RadarMercado').then(m => ({ default: m.RadarMercado })));
const Estoque = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })));
const Simulador = lazy(() => import('./pages/Simulador').then(m => ({ default: m.Simulador })));
const CentralIA = lazy(() => import('./pages/CentralIA').then(m => ({ default: m.CentralIA })));
const Publicacoes = lazy(() => import('./pages/Publicacoes').then(m => ({ default: m.Publicacoes })));
const Seguranca = lazy(() => import('./pages/Seguranca').then(m => ({ default: m.Seguranca })));
const Vendas = lazy(() => import('./pages/Vendas').then(m => ({ default: m.Vendas })));
const Pedidos = lazy(() => import('./pages/Pedidos').then(m => ({ default: m.Pedidos })));
const Compras = lazy(() => import('./pages/Compras').then(m => ({ default: m.Compras })));
const Fornecedores = lazy(() => import('./pages/Fornecedores').then(m => ({ default: m.Fornecedores })));
const FornecedorDetalhe = lazy(() => import('./pages/FornecedorDetalhe').then(m => ({ default: m.FornecedorDetalhe })));
const Clientes = lazy(() => import('./pages/Clientes').then(m => ({ default: m.Clientes })));
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe').then(m => ({ default: m.ClienteDetalhe })));
const Financeiro = lazy(() => import('./pages/Financeiro').then(m => ({ default: m.Financeiro })));
const Fiscal = lazy(() => import('./pages/Fiscal').then(m => ({ default: m.Fiscal })));
const Logistica = lazy(() => import('./pages/Logistica').then(m => ({ default: m.Logistica })));
const CentralBO = lazy(() => import('./pages/CentralBO').then(m => ({ default: m.CentralBO })));
const Tarefas = lazy(() => import('./pages/Tarefas').then(m => ({ default: m.Tarefas })));
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const GeradorEan = lazy(() => import('./pages/GeradorEan').then(m => ({ default: m.GeradorEan })));const Diretor = lazy(() => import('./pages/Diretor').then(m => ({ default: m.Diretor })));
const Metas = lazy(() => import('./pages/Metas').then(m => ({ default: m.Metas })));
const Relatorios = lazy(() => import('./pages/Relatorios').then(m => ({ default: m.Relatorios })));
const Atividade = lazy(() => import('./pages/Atividade').then(m => ({ default: m.Atividade })));
const LaboratorioOportunidades = lazy(() => import('./pages/LaboratorioOportunidades').then(m => ({ default: m.LaboratorioOportunidades })));
const Calendario = lazy(() => import('./pages/Calendario').then(m => ({ default: m.Calendario })));
const ConteudoIA = lazy(() => import('./pages/ConteudoIA').then(m => ({ default: m.ConteudoIA })));
const Integracoes = lazy(() => import('./pages/Integracao').then(m => ({ default: m.Integracao })));
const Integracao = lazy(() => import('./pages/Integracao').then(m => ({ default: m.Integracao })));
const Marketing = lazy(() => import('./pages/Marketing').then(m => ({ default: m.Marketing })));
const Configuracoes = lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })));
const Automacao = lazy(() => import('./pages/Automacao').then(m => ({ default: m.Automacao })));
const ConfiguracoesHub = lazy(() => import('./pages/ConfiguracoesHub').then(m => ({ default: m.ConfiguracoesHub })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Protege as rotas: redireciona para /login se não autenticado.
function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// RBAC granular: cada segmento da URL é um módulo da matriz de perfis.
// Sem permissão, exibe AcessoRestrito em vez da tela.
function RequireModulo() {
  const { user } = useAuth();
  const location = useLocation();
  const modulo = location.pathname.split('/')[1] || 'dashboard';
  if (!podeAcessar(user?.perfil, modulo)) return <AcessoRestrito />;
  return <Outlet />;
}

// ============================================
// App — configuração de rotas. /login é público;
// todas as demais exigem autenticação.
// ============================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página de venda (pública) */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireModulo />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/produto-intel" element={<ProdutoIntel />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/radar-mercado" element={<RadarMercado />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/simulador" element={<Simulador />} />
            <Route path="/central-ia" element={<CentralIA />} />
            <Route path="/publicacoes" element={<Publicacoes />} />
            <Route path="/seguranca" element={<Seguranca />} />
            <Route path="/empresa" element={<Empresa />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/fornecedores/:id" element={<FornecedorDetalhe />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<ClienteDetalhe />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/fiscal" element={<Fiscal />} />
            <Route path="/logistica" element={<Logistica />} />
            <Route path="/central-bo" element={<CentralBO />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/ean" element={<GeradorEan />} />
            <Route path="/diretor" element={<Diretor />} />
            <Route path="/metas" element={<Metas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/atividade" element={<Atividade />} />
            <Route path="/laboratorio-oportunidades" element={<LaboratorioOportunidades />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/conteudo-ia" element={<ConteudoIA />} />
            <Route path="/integracao" element={<Integracoes />} />
            <Route path="/integracoes" element={<Integracao />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/ia-automacao" element={<Automacao />} />
            <Route path="/configuracoes-hub" element={<ConfiguracoesHub />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
