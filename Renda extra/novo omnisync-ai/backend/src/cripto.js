// backend/src/cripto.js
// Criptografia AES-256-GCM para segredos guardados no Neon
// (chaves de provedores de IA, tokens OAuth). A chave mestra
// deriva de AUTH_SECRET — sem ela, nada é legível.

import crypto from 'node:crypto';

function chaveMestra() {
  const segredo = process.env.AUTH_SECRET || 'omnisync-dev-secret';
  return crypto.scryptSync(segredo, 'nexora-cripto-v1', 32);
}

// Formato: base64(iv + authTag + cifrado).
export function criptografar(texto) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', chaveMestra(), iv);
  const cifrado = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, cifrado]).toString('base64');
}

export function descriptografar(b64) {
  const buf = Buffer.from(String(b64), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const cifrado = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', chaveMestra(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString('utf8');
}

export function mascarar(texto) {
  const s = String(texto || '');
  if (s.length <= 8) return '••••';
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}
