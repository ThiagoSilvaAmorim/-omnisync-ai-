// prisma/client.js - Singleton PrismaClient para serverless (Vercel)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Pool dimensionado para serverless: hidratação na subida + espelho de
// eventos/tarefas + consultas da rota concorrem na mesma instância.
// 1 conexão estourava o pool (timeout); 5 é seguro atrás do PgBouncer.
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || '';
  if (!url) return '';
  return url.includes('?')
    ? `${url}&connection_limit=5&pool_timeout=20`
    : `${url}?connection_limit=5&pool_timeout=20`;
};

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error'],
  datasources: {
    db: { url: getDatabaseUrl() }
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;