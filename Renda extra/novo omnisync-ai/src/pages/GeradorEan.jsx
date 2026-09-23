import { useState } from 'react';
import { Barcode, Copy, RefreshCw } from 'lucide-react';
import { gerarEan13, validarEan13 } from '../lib/ean13';
import { useToast } from '../hooks/useToast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// ============================================
// Gerador de EAN — códigos EAN-13 válidos com
// dígito verificador real para cadastrar
// produtos nos marketplaces.
// ============================================

export function GeradorEan() {
  const toast = useToast();
  const [prefixo, setPrefixo] = useState('789');
  const [codigo, setCodigo] = useState('');
  const [validacao, setValidacao] = useState('');
  const [valido, setValido] = useState(null);

  const gerar = () => {
    setCodigo(gerarEan13(prefixo));
    setValido(null);
    setValidacao('');
  };

  const copiar = async () => {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      toast('Código copiado');
    } catch {
      toast('Não foi possível copiar');
    }
  };

  const validar = () => {
    const ok = validarEan13(validacao);
    setValido(ok);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">Gerador de EAN</h1>
        <p className="text-sm text-slate-500">Gere códigos EAN-13 válidos para cadastrar seus produtos nos marketplaces</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerar código</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-40">
              <Input label="Prefixo (opcional)" value={prefixo} onChange={e => setPrefixo(e.target.value)} placeholder="789" />
            </div>
            <Button onClick={gerar}>
              <Barcode className="h-4 w-4" /> Gerar EAN
            </Button>
            <Button variant="secondary" onClick={gerar}>
              <RefreshCw className="h-4 w-4" /> Gerar outro
            </Button>
          </div>
          {codigo && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="font-mono text-2xl font-bold tracking-widest text-slate-800 dark:text-slate-100">{codigo}</p>
              <Button size="sm" variant="secondary" onClick={copiar}>
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validar código</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input label="Código EAN-13" value={validacao} onChange={e => { setValidacao(e.target.value); setValido(null); }} placeholder="7891234567890" />
            </div>
            <Button variant="secondary" onClick={validar}>Validar</Button>
          </div>
          {valido != null && (
            <p className={`mt-3 text-sm font-medium ${valido ? 'text-teal-600' : 'text-red-500'}`}>
              {valido ? 'Código EAN-13 válido.' : 'Código inválido: confira os 13 dígitos.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
