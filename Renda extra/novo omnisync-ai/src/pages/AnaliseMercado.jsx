import { useMemo, useState } from 'react';
import { ExternalLink, Loader2, MapPin, Search, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ehDiretor } from '../lib/permissoes';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { AcessoRestrito } from '../components/ui/AcessoRestrito';

// ============================================
// Análise de Mercado — paleta âmbar.
// Fonte: catálogo oficial do ML (/products/search, via backend).
// A busca de anúncios responde 403 para a credencial, então vendas,
// preço, reputação e frete não existem na API de catálogo: a tela
// mostra "—" (nada é inventado).
// ============================================

const VAZIO = '—';

function exibir(valor, formatar) {
  if (valor === null || valor === undefined || valor === '') return VAZIO;
  return formatar ? formatar(valor) : valor;
}

function formatarData(iso) {
  if (!iso) return VAZIO;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return VAZIO;
  return d.toLocaleDateString('pt-BR');
}

function kpi(rotulo, valor, destaque) {
  return { rotulo, valor, destaque };
}

export function AnaliseMercado() {
  const { user } = useAuth();

  const [termo, setTermo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [analise, setAnalise] = useState(null);

  const [posTermo, setPosTermo] = useState('');
  const [posProduto, setPosProduto] = useState('');
  const [posCarregando, setPosCarregando] = useState(false);
  const [posErro, setPosErro] = useState('');
  const [posicao, setPosicao] = useState(null);

  async function analisar(e) {
    e.preventDefault();
    const chave = termo.trim();
    if (chave.length < 2) {
      setErro('Digite uma palavra-chave com pelo menos 2 caracteres.');
      setAnalise(null);
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      const res = await api.analiseMercado.criar(chave);
      setAnalise(res?.analise || null);
      if (!res?.analise?.itens?.length) setErro('Nenhum produto encontrado no catálogo para este termo.');
    } catch (e2) {
      setAnalise(null);
      setErro(e2?.message || 'Falha ao analisar o termo.');
    } finally {
      setCarregando(false);
    }
  }

  async function verPosicao(e) {
    e.preventDefault();
    const t = posTermo.trim();
    const p = posProduto.trim().toUpperCase();
    if (t.length < 2 || !p) {
      setPosErro('Informe a palavra-chave e o ID do seu produto (MLB...).');
      setPosicao(null);
      return;
    }
    setPosCarregando(true);
    setPosErro('');
    setPosicao(null);
    try {
      const res = await api.analiseMercado.posicionamento(t, p);
      setPosicao(res);
    } catch (e2) {
      setPosErro(e2?.message || 'Falha ao consultar a posição.');
    } finally {
      setPosCarregando(false);
    }
  }

  const itens = useMemo(() => (analise?.itens || []).slice().sort((a, b) => {
    const va = a.vendasMes;
    const vb = b.vendasMes;
    if (va === null && vb === null) return a.ordem - b.ordem;
    if (va === null) return 1;
    if (vb === null) return -1;
    return vb - va;
  }), [analise]);

  const kp = useMemo(() => {
    if (!itens.length) return [];
    const ativos = itens.filter(i => i.status === 'active').length;
    const comMarca = itens.filter(i => i.marca).length;
    const comDias = itens.filter(i => Number.isFinite(i.diasNoAr));
    const mediaDias = comDias.length
      ? Math.round(comDias.reduce((soma, i) => soma + i.diasNoAr, 0) / comDias.length)
      : null;
    return [
      kpi('Produtos analisados', itens.length, true),
      kpi('Ativos no catálogo', ativos),
      kpi('Com marca informada', comMarca),
      kpi('Dias no ar (média)', mediaDias === null ? VAZIO : mediaDias),
    ];
  }, [itens]);

  if (!ehDiretor(user)) return <AcessoRestrito />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Análise de Mercado</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Catálogo oficial do Mercado Livre para a palavra-chave — sem scraping, sem dados inventados.
          </p>
        </div>
        {analise && (
          <Badge variant="amber">
            {analise.criadaEm ? `Analisado em ${formatarData(analise.criadaEm)}` : 'Análise carregada'}
          </Badge>
        )}
      </div>

      <Card className="border-amber-200 dark:border-amber-500/30">
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={analisar}>
            <div className="min-w-[240px] flex-1">
              <Input
                label="Palavra-chave"
                placeholder="Ex.: fone de ouvido bluetooth"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                disabled={carregando}
              />
            </div>
            <Button type="submit" className="bg-amber-500 text-white hover:bg-amber-600" disabled={carregando}>
              {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              {carregando ? 'Analisando…' : 'Analisar'}
            </Button>
          </form>
          {erro && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {erro}
            </p>
          )}
        </CardContent>
      </Card>

      {kp.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kp.map(c => (
            <div key={c.rotulo} className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">{c.rotulo}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{c.valor}</p>
            </div>
          ))}
        </div>
      )}

      {analise && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <strong>Fonte:</strong> catálogo oficial do Mercado Livre (API <code>/products/search</code>).
          A busca de anúncios está bloqueada (403) para esta credencial, então vendas/mês, vendas/dia,
          preço, frete grátis e reputação não são expostos — exibidos como <strong>{VAZIO}</strong>.
        </div>
      )}

      {itens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Produtos concorrentes ({itens.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3 text-right">Dias no ar</th>
                  <th className="px-4 py-3 text-right">Vendas/mês</th>
                  <th className="px-4 py-3 text-right">Vendas/dia</th>
                  <th className="px-4 py-3 text-right">Preço</th>
                  <th className="px-4 py-3">Frete grátis</th>
                  <th className="px-4 py-3">Reputação</th>
                  <th className="px-4 py-3 text-right">Fotos</th>
                  <th className="px-4 py-3 text-right">Variações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map(i => (
                  <tr key={i.produtoId} className="border-b border-slate-100 last:border-0 hover:bg-amber-50/60 dark:border-slate-800 dark:hover:bg-amber-500/5">
                    <td className="px-4 py-3 text-xs text-slate-400">{i.ordem}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {i.imagemUrl ? (
                          <a
                            href={i.urlPublica || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Abrir ${i.nome} no Mercado Livre`}
                            className="shrink-0"
                          >
                            <img src={i.imagemUrl} alt={i.nome} className="h-8 w-8 rounded object-cover" loading="lazy" />
                          </a>
                        ) : (
                          <a
                            href={i.urlPublica || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Buscar ${i.nome} no Mercado Livre`}
                            className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-xs text-slate-400 hover:bg-amber-100 hover:text-amber-600 dark:bg-slate-800 dark:hover:bg-amber-500/20"
                          >
                            {VAZIO}
                          </a>
                        )}
                        <div>
                          <p className="max-w-[260px] truncate font-medium text-slate-800 dark:text-slate-100" title={i.nome}>
                            {i.urlPublica ? (
                              <a
                                href={i.urlPublica}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-amber-600 hover:underline dark:hover:text-amber-400"
                              >
                                {i.nome}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              i.nome
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{i.produtoId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{exibir(i.marca)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={i.status === 'active' ? 'teal' : 'slate'}>{i.status ? i.status : VAZIO}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatarData(i.criadoEm)}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">{exibir(i.diasNoAr)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{exibir(i.vendasMes)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{exibir(i.vendasDia)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{exibir(i.preco)}</td>
                    <td className="px-4 py-3 text-slate-500">{exibir(i.freteGratis, v => (v ? 'Sim' : 'Não'))}</td>
                    <td className="px-4 py-3 text-slate-500">{exibir(i.reputacao)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{exibir(i.fotos)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{exibir(i.variacoes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 dark:border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-amber-500" />
            Posicionamento do meu produto (top 50 do catálogo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" onSubmit={verPosicao}>
            <div className="min-w-[200px] flex-1">
              <Input label="Palavra-chave da posição" placeholder="Ex.: fone bluetooth" value={posTermo} onChange={e => setPosTermo(e.target.value)} disabled={posCarregando} />
            </div>
            <div className="min-w-[180px] flex-1">
              <Input label="ID do meu produto" placeholder="MLB123456789" value={posProduto} onChange={e => setPosProduto(e.target.value)} disabled={posCarregando} />
            </div>
            <Button type="submit" variant="secondary" disabled={posCarregando}>
              {posCarregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Ver posição
            </Button>
          </form>
          {posErro && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{posErro}</p>
          )}
          {posicao && (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
              {posicao.encontrado ? (
                <>
                  <Badge variant="amber" className="mr-2">#{posicao.posicao}</Badge>
                  seu produto aparece na posição {posicao.posicao} dos {posicao.posicoesVerificadas} primeiros resultados do catálogo para “{posicao.termo}”.
                </>
              ) : (
                <>Seu produto não aparece entre os {posicao.posicoesVerificadas} primeiros resultados do catálogo para “{posicao.termo}”.</>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
