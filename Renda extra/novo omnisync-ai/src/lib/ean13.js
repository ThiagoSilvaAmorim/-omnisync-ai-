// ============================================
// ean13.js — geração e validação de EAN-13 com
// dígito verificador real (módulo 10, pesos 1/3).
// Puro e testável; sem rede, sem backend.
// ============================================

// Calcula o dígito verificador dos 12 primeiros dígitos.
export function digitoVerificador(base12) {
  const digitos = String(base12).replace(/\D/g, '');
  if (digitos.length !== 12) return null;
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += Number(digitos[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (soma % 10)) % 10);
}

// Gera um EAN-13 válido. Prefixo opcional (ex.: país); o resto é aleatório.
export function gerarEan13(prefixo = '') {
  const limpo = String(prefixo).replace(/\D/g, '').slice(0, 12);
  let base = limpo;
  while (base.length < 12) {
    base += String(Math.floor(Math.random() * 10));
    if (base.length === 1 && base === '0') base = String(1 + Math.floor(Math.random() * 9));
  }
  return base + digitoVerificador(base);
}

// Valida um EAN-13 completo.
export function validarEan13(codigo) {
  const digitos = String(codigo).replace(/\D/g, '');
  if (digitos.length !== 13) return false;
  return digitoVerificador(digitos.slice(0, 12)) === digitos[12];
}
