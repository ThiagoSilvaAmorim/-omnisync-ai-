import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Infinity as InfinityIcon,
  MessageCircle,
  Package,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ============================================
// Landing — página de venda (pública).
// Estrutura: dor → solução → 3 recursos-chave
// → preço → WhatsApp.
// ============================================

const WHATSAPP = 'https://wa.me/5511999999999?text=' + encodeURIComponent('Olá! Quero saber mais sobre o OmniSync AI.');

const PASSOS = [
  { num: '1', titulo: 'Conecte suas contas', desc: 'Autorize seus marketplaces e fornecedores direto na página oficial de cada um.' },
  { num: '2', titulo: 'Deixe a IA trabalhar', desc: '8 agentes analisam seus dados, alertam riscos e fazem reposição automática.' },
  { num: '3', titulo: 'Acompanhe o lucro', desc: 'Painel do diretor com lucro real, metas, relatórios e notas fiscais em dia.' },
];

const RECURSOS = [
  {
    icon: RefreshCw,
    titulo: 'Marketplaces conectados',
    desc: 'Mercado Livre, Shopee e Amazon — os pedidos caem direto no sistema, sem planilha.',
  },
  {
    icon: Package,
    titulo: 'Reposição automática',
    desc: 'Estoque baixo? O OmniSync pede ao fornecedor sozinho. Você só monitora o ciclo.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Fiscal em dia',
    desc: 'NF-e com origem (fornecedor/marketplace), XML e PDF prontos para o contador.',
  },
];

const PLANOS = [
  {
    nome: 'Iniciante',
    preco: 'R$ 49',
    desc: 'Para quem está começando',
    recursos: ['1 marketplace', '100 pedidos/mês', 'Reposição automática', 'Suporte por e-mail'],
  },
  {
    nome: 'Profissional',
    preco: 'R$ 99',
    destaque: true,
    desc: 'Para lojas em crescimento',
    recursos: ['3 marketplaces', '1.000 pedidos/mês', 'Central de IA completa', 'Relatórios em PDF', 'Suporte prioritário'],
  },
  {
    nome: 'Empresarial',
    preco: 'R$ 199',
    desc: 'Para operações grandes',
    recursos: ['Marketplaces ilimitados', 'Pedidos ilimitados', 'Múltiplos usuários', 'Gerente de conta'],
  },
];

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <InfinityIcon className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold">OmniSync AI</span>
        </div>
        <Link
          to={user ? '/dashboard' : '/login'}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-500"
        >
          {user ? 'Acessar painel' : 'Entrar'}
        </Link>
      </nav>

      {/* Hero — dor + solução */}
      <header className="mx-auto max-w-4xl px-6 pb-16 pt-14 text-center">
        <p className="mx-auto mb-4 w-fit rounded-full border border-primary-500/30 bg-primary-500/10 px-4 py-1 text-xs font-medium text-primary-300">
          Sistema inteligente de gestão multicanal
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          Chega de perder vendas por
          <br />
          <span className="bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent">
            falta de controle
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
          O OmniSync AI conecta seus marketplaces, faz a reposição automática com seus fornecedores
          e mantém o fiscal em dia — tudo em um só lugar, com IA trabalhando por você.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-medium transition-all hover:bg-primary-500 active:scale-95"
          >
            Testar grátis por 14 dias <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 font-medium transition-colors hover:border-green-500 hover:text-green-400"
          >
            <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
          </a>
        </div>
      </header>

      {/* Como funciona */}
      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">Como funciona</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PASSOS.map(p => (
              <div key={p.num} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-lg font-bold">
                  {p.num}
                </span>
                <h3 className="mt-4 font-semibold">{p.titulo}</h3>
                <p className="mt-2 text-sm text-slate-400">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recursos-chave */}
      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">Tudo o que sua loja precisa</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {RECURSOS.map(r => (
              <div key={r.titulo} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-500/15 text-primary-300">
                  <r.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{r.titulo}</h3>
                <p className="mt-2 text-sm text-slate-400">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preço */}
      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold">Planos simples, sem surpresa</h2>
          <p className="mt-2 text-center text-sm text-slate-400">14 dias grátis em qualquer plano</p>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANOS.map(p => (
              <div
                key={p.nome}
                className={`rounded-2xl border p-6 ${
                  p.destaque ? 'border-primary-500 bg-primary-500/10' : 'border-slate-800 bg-slate-900'
                }`}
              >
                {p.destaque && (
                  <span className="mb-2 inline-block rounded-full bg-primary-600 px-3 py-0.5 text-xs font-medium">
                    Mais popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{p.nome}</h3>
                <p className="mt-1 text-sm text-slate-400">{p.desc}</p>
                <p className="mt-4 text-3xl font-bold">
                  {p.preco}
                  <span className="text-sm font-normal text-slate-400">/mês</span>
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {p.recursos.map(r => (
                    <li key={r} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-400" /> {r}
                    </li>
                  ))}
                </ul>
                <a
                  href={WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
                    p.destaque ? 'bg-primary-600 hover:bg-primary-500' : 'border border-slate-700 hover:border-primary-500'
                  }`}
                >
                  Começar agora
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA WhatsApp */}
      <section className="border-t border-slate-800 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold">Ainda tem dúvidas?</h2>
          <p className="mt-2 text-slate-400">
            Fale direto com a gente no WhatsApp — respondemos rápido e ajudamos na configuração.
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-medium transition-colors hover:bg-green-500"
          >
            <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        © 2026 OmniSync AI — Sistema inteligente de gestão multicanal
      </footer>
    </div>
  );
}
