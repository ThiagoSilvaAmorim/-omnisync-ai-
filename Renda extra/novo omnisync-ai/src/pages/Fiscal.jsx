import { useEffect, useState } from 'react';
import { ExternalLink, FileArchive, FileDown, FileText, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { api } from '../services/api';
import { downloadFile } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Skeleton } from '../components/ui/Skeleton';

// ============================================
// Fiscal — notas fiscais com origem
// (fornecedor/marketplace) e download em
// XML, DANFE (txt) e PDF.
// ============================================

const STATUS = { autorizada: 'teal', pendente: 'amber', rejeitada: 'red' };

function gerarXml(nota) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00">
    <ide>
      <natOp>${nota.tipo === 'Saída' ? 'Venda' : 'Compra'}</natOp>
      <nNF>${nota.numero}</nNF>
      <dhEmi>${nota.data}</dhEmi>
    </ide>
    <origem>
      <xOrigem>${nota.origem}</xOrigem>
    </origem>
    <dest>
      <xNome>${nota.destinatario}</xNome>
    </dest>
      <total>
        <ICMSTot>
          <vNF>${Number(nota.valor ?? 0).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
  </infNFe>
</NFe>`;
}

function gerarDanfeTxt(nota) {
  return [
    'DANFE — Documento Auxiliar da Nota Fiscal Eletrônica',
    '=====================================================',
    `Nota: ${nota.numero}`,
    `Tipo: ${nota.tipo}`,
    `Destinatário: ${nota.destinatario}`,
    `Origem: ${nota.origem}`,
    `Data de emissão: ${nota.data}`,
    `Valor total: R$ ${Number(nota.valor ?? 0).toFixed(2).replace('.', ',')}`,
    `Status: ${nota.status}`,
    '-----------------------------------------------------',
    'Emitente: OmniSync AI Ltda — CNPJ 00.000.000/0000-00',
  ].join('\n');
}

function gerarPdfDoc(nota) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('DANFE - Documento Auxiliar da NF-e', 105, 20, { align: 'center' });
  doc.setFontSize(9);
  doc.text('Emitente: OmniSync AI Ltda - CNPJ 00.000.000/0000-00', 105, 27, { align: 'center' });
  doc.line(14, 32, 196, 32);

  doc.setFontSize(11);
  const linhas = [
    ['Nota:', nota.numero],
    ['Tipo:', nota.tipo],
    ['Destinatario:', nota.destinatario],
    ['Origem:', nota.origem],
    ['Data de emissao:', nota.data],
    ['Valor total:', `R$ ${Number(nota.valor ?? 0).toFixed(2).replace('.', ',')}`],
    ['Status:', nota.status],
  ];
  let y = 44;
  linhas.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(valor, 55, y);
    y += 8;
  });

  doc.setFontSize(9);
  doc.text('Este documento e uma representacao simplificada da NF-e.', 14, y + 6);

  return doc;
}

function gerarPdf(nota) {
  gerarPdfDoc(nota).save(`${nota.numero.replace(/\s/g, '-')}-DANFE.pdf`);
}

function baixarBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function Fiscal() {
  const toast = useToast();
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [selecionadas, setSelecionadas] = useState([]);
  const [gerandoZip, setGerandoZip] = useState(false);

  // Notas reais via GET /api/fiscal (Neon: tabela NotaFiscal).
  useEffect(() => {
    let ativo = true;
    api.getFiscal()
      .then(lista => { if (ativo) setNotasFiscais(Array.isArray(lista) ? lista : []); })
      .catch(e => {
        console.error('Erro ao carregar notas fiscais:', e);
        toast('Erro ao carregar notas fiscais');
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [toast]);

  const baixarXml = nota => {
    downloadFile(`${nota.numero.replace(/\s/g, '-')}.xml`, gerarXml(nota), 'application/xml');
    toast(`XML da ${nota.numero} baixado`);
  };

  const baixarDanfe = nota => {
    downloadFile(`${nota.numero.replace(/\s/g, '-')}-DANFE.txt`, gerarDanfeTxt(nota));
    toast(`DANFE da ${nota.numero} baixada`);
  };

  const baixarPdf = nota => {
    gerarPdf(nota);
    toast(`PDF da ${nota.numero} gerado`);
  };

  const filtradas = notasFiscais.filter(n => {
    if (busca && !`${n.numero} ${n.destinatario}`.toLowerCase().includes(busca.toLowerCase())) return false;
    if (tipoFiltro !== 'todos' && n.tipo !== tipoFiltro) return false;
    if (statusFiltro !== 'todos' && n.status !== statusFiltro) return false;
    return true;
  });

  const alternarSelecao = id => {
    setSelecionadas(prev => (prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]));
  };

  const baixarLote = formato => {
    const alvos = filtradas.filter(n => selecionadas.includes(n.id));
    if (alvos.length === 0) {
      toast('Selecione ao menos uma nota');
      return;
    }
    alvos.forEach((n, i) => {
      setTimeout(() => {
        if (formato === 'xml') baixarXml(n);
        else if (formato === 'danfe') baixarDanfe(n);
        else baixarPdf(n);
      }, i * 400);
    });
    toast(`${alvos.length} arquivo(s) ${formato.toUpperCase()} em download`);
  };

  // Monta o pacote contábil .ZIP (reuso entre download local e Drive).
  const montarPacoteZip = async alvos => {
    const zip = new JSZip();
    const pastaPdf = zip.folder('pdfs');
    const pastaXml = zip.folder('xmls');
    const pastaDanfe = zip.folder('danfes');
    alvos.forEach(n => {
      const base = n.numero.replace(/\s/g, '-');
      pastaPdf.file(`${base}-DANFE.pdf`, gerarPdfDoc(n).output('blob'));
      pastaXml.file(`${base}.xml`, gerarXml(n));
      pastaDanfe.file(`${base}-DANFE.txt`, gerarDanfeTxt(n));
    });
    return zip.generateAsync({ type: 'blob' });
  };

  // Pacote contábil .ZIP: PDFs + XMLs + DANFEs das notas selecionadas (ou filtradas).
  const baixarPacoteZip = async () => {
    const alvos = filtradas.filter(n => selecionadas.length === 0 || selecionadas.includes(n.id));
    if (alvos.length === 0) {
      toast('Nenhuma nota para empacotar');
      return;
    }
    setGerandoZip(true);
    try {
      const blob = await montarPacoteZip(alvos);
      baixarBlob('pacote-contabil.zip', blob);
      toast(`Pacote contábil com ${alvos.length} nota(s) baixado`);
    } catch (e) {
      console.error('Erro ao gerar pacote ZIP:', e);
      toast('Erro ao gerar pacote contábil');
    } finally {
      setGerandoZip(false);
    }
  };

  // Envia o mesmo pacote ao Google Drive (se vinculado; senão mostra o motivo).
  const enviarPacoteDrive = async () => {
    const alvos = filtradas.filter(n => selecionadas.length === 0 || selecionadas.includes(n.id));
    if (alvos.length === 0) {
      toast('Nenhuma nota para enviar');
      return;
    }
    setGerandoZip(true);
    try {
      const blob = await montarPacoteZip(alvos);
      const base64 = await new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => resolve(String(leitor.result).split(',')[1]);
        leitor.onerror = reject;
        leitor.readAsDataURL(blob);
      });
      const r = await api.enviarDrive({ nome: `pacote-contabil-${new Date().toISOString().slice(0, 10)}.zip`, mime: 'application/zip', conteudoBase64: base64 });
      toast(`Pacote enviado ao Drive${r.link ? '' : ''}`);
    } catch (e) {
      console.error('Erro ao enviar ao Drive:', e);
      toast(e.message || 'Erro ao enviar ao Drive');
    } finally {
      setGerandoZip(false);
    }
  };

  const rejeitadas = notasFiscais.filter(n => n.status === 'rejeitada').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Fiscal</h1>
          <p className="text-sm text-slate-500">Notas fiscais com origem (fornecedor/marketplace), XML e PDF</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://cav.receita.fazenda.gov.br/autenticacao/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-200"
          >
            <ExternalLink className="h-4 w-4" /> Portal e-CAC
          </a>
          <Button variant="secondary" onClick={baixarPacoteZip} disabled={gerandoZip}>
            <FileArchive className="h-4 w-4" /> {gerandoZip ? 'Gerando...' : 'Pacote contábil .ZIP'}
          </Button>
          <Button variant="secondary" onClick={enviarPacoteDrive} disabled={gerandoZip}>
            <FileArchive className="h-4 w-4" /> Enviar ao Drive
          </Button>
        </div>
      </div>

      {rejeitadas > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {rejeitadas} nota(s) rejeitada(s) pela SEFAZ — corrija e reenvie antes do fechamento.
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar número ou destinatário..."
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <Select label="Tipo" value={tipoFiltro} onChange={setTipoFiltro} options={[{ value: 'todos', label: 'Todos' }, { value: 'Saída', label: 'Saída' }, { value: 'Entrada', label: 'Entrada' }]} />
          <Select label="Status" value={statusFiltro} onChange={setStatusFiltro} options={[{ value: 'todos', label: 'Todos' }, { value: 'autorizada', label: 'Autorizada' }, { value: 'pendente', label: 'Pendente' }, { value: 'rejeitada', label: 'Rejeitada' }]} />
        </div>
      </Card>

      {selecionadas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm dark:border-primary-500/30 dark:bg-primary-500/10">
          <span className="font-medium text-slate-700 dark:text-slate-200">{selecionadas.length} selecionada(s)</span>
          <button type="button" onClick={() => baixarLote('xml')} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">Baixar XMLs</button>
          <button type="button" onClick={() => baixarLote('danfe')} className="rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Baixar DANFEs</button>
          <button type="button" onClick={() => baixarLote('pdf')} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700">Baixar PDFs</button>
          <button type="button" onClick={() => setSelecionadas([])} className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-700">Limpar seleção</button>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="px-5 py-3 font-medium"><span className="sr-only">Selecionar</span></th>
                <th className="px-5 py-3 font-medium">Nota</th>
                <th className="px-5 py-3 font-medium">Tipo</th>
                <th className="px-5 py-3 font-medium">Destinatário</th>
                <th className="px-5 py-3 font-medium">Origem</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-3">
                    <Skeleton className="h-12 rounded-lg" />
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-6 text-center text-sm text-slate-500">
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              ) : (
              filtradas.map(n => (
                <tr key={n.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${n.status === 'rejeitada' ? 'bg-red-50/60 dark:bg-red-500/5' : ''}`}>
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selecionadas.includes(n.id)}
                      onChange={() => alternarSelecao(n.id)}
                      aria-label={`Selecionar ${n.numero}`}
                      className="h-4 w-4 accent-primary-600"
                    />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{n.numero}</td>
                  <td className="px-5 py-3"><Badge variant={n.tipo === 'Saída' ? 'sky' : 'slate'}>{n.tipo}</Badge></td>
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{n.destinatario}</td>
                  <td className="px-5 py-3">
                    <Badge variant={n.origem === 'Fornecedor' ? 'indigo' : 'teal'}>{n.origem}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{n.data}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                    R$ {Number(n.valor ?? 0).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-5 py-3"><Badge variant={STATUS[n.status] ?? 'slate'}>{n.status}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => baixarPdf(n)}
                        title="Baixar PDF"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        <Printer className="h-3.5 w-3.5" /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => baixarXml(n)}
                        title="Baixar XML"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        <FileText className="h-3.5 w-3.5" /> XML
                      </button>
                      <button
                        type="button"
                        onClick={() => baixarDanfe(n)}
                        title="Baixar DANFE"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary-500 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        <FileDown className="h-3.5 w-3.5" /> DANFE
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
