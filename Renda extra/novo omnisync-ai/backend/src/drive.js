// backend/src/drive.js
// Integração opcional com Google Drive (armazenamento de pacotes
// contábeis, XMLs e relatórios). Sem credencial configurada, tudo
// responde 503 com o passo a passo — nunca simula sucesso.
// Formas suportadas (nesta ordem):
// 1. Conta de serviço: GOOGLE_SERVICE_ACCOUNT_JSON (JSON com client_email
//    e private_key) + pasta opcional GOOGLE_DRIVE_FOLDER_ID.
// 2. OAuth próprio: GOOGLE_DRIVE_REFRESH_TOKEN (+ CLIENT_ID/SECRET).

import { google } from 'googleapis';
import { prisma } from './prisma/client.js';
import { descriptografar } from './cripto.js';

function lerContaSalva() {
  return prisma.contaIntegracao.findUnique({ where: { provedor: 'google-drive' } })
    .then(c => {
      if (!c || !c.ativo) return null;
      try {
        return { rotulo: c.rotulo, segredo: JSON.parse(descriptografar(c.segredo)), metadados: c.metadados || {} };
      } catch {
        return null;
      }
    })
    .catch(() => null);
}

export async function statusDrive() {
  const conta = await lerContaSalva();
  if (conta?.segredo?.refreshToken) {
    return { vinculado: true, via: 'oauth', rotulo: conta.rotulo, pasta: conta.metadados?.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || null };
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return { vinculado: true, via: 'service-account', rotulo: 'Conta de serviço', pasta: process.env.GOOGLE_DRIVE_FOLDER_ID || null };
  }
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    return { vinculado: true, via: 'oauth-env', rotulo: 'OAuth (env)', pasta: process.env.GOOGLE_DRIVE_FOLDER_ID || null };
  }
  return {
    vinculado: false,
    via: null,
    comoVincular: [
      '1. Crie um projeto em console.cloud.google.com e ative a Google Drive API.',
      '2. Crie uma conta de serviço, baixe o JSON e defina GOOGLE_SERVICE_ACCOUNT_JSON (ou use OAuth e salve o refresh token nesta tela).',
      '3. Compartilhe a pasta do Drive com o e-mail da conta de serviço (se usar pasta).',
    ],
  };
}

async function clienteDrive() {
  const conta = await lerContaSalva();
  if (conta?.segredo?.refreshToken) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ refresh_token: conta.segredo.refreshToken });
    return google.drive({ version: 'v3', auth });
  }
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth });
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const cred = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: cred.client_email, private_key: cred.private_key },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    return google.drive({ version: 'v3', auth });
  }
  return null;
}

// Envia um buffer ao Drive (pasta configurada ou raiz). Retorna id + link.
export async function enviarAoDrive({ nome, mime, conteudoBase64, pasta }) {
  const drive = await clienteDrive();
  if (!drive) {
    const erro = new Error('Google Drive não vinculado. Siga o passo a passo na tela Integrações.');
    erro.status = 503;
    throw erro;
  }
  const pastaId = pasta || process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
  const res = await drive.files.create({
    requestBody: { name: nome, parents: pastaId ? [pastaId] : undefined },
    media: { mimeType: mime, body: Buffer.from(conteudoBase64, 'base64') },
    fields: 'id, name, webViewLink',
  });
  return { id: res.data.id, nome: res.data.name, link: res.data.webViewLink };
}
