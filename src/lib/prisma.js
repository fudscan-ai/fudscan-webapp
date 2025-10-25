import { PrismaClient } from '@/generated/prisma/index.js';

// Global variable to store the Prisma client instance
let prisma;

// Configuration for Prisma client
const prismaConfig = {
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event', 
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
};

// Create a singleton Prisma client instance
function createPrismaClient() {
  const client = new PrismaClient(prismaConfig);

  // Log SQL queries in development
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e) => {
      console.log('\n🔍 Prisma Query:');
      console.log('Query:', e.query);
      console.log('Params:', e.params);
      console.log('Duration:', e.duration + 'ms');
      console.log('---');
    });
  }

  // Log errors
  client.$on('error', (e) => {
    console.error('❌ Prisma Error:', e);
  });

  // Log info messages
  client.$on('info', (e) => {
    console.log('ℹ️ Prisma Info:', e.message);
  });

  // Log warnings
  client.$on('warn', (e) => {
    console.warn('⚠️ Prisma Warning:', e.message);
  });

  return client;
}

// In development, create a new client for each request to avoid connection issues
// In production, reuse the same client instance
if (process.env.NODE_ENV === 'production') {
  if (!prisma) {
    prisma = createPrismaClient();
  }
} else {
  // In development, use globalThis to avoid creating multiple instances during hot reloads
  if (!globalThis.prisma) {
    globalThis.prisma = createPrismaClient();
  }
  prisma = globalThis.prisma;
}

export default prisma;

// Helper function to safely disconnect Prisma client
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Helper function to check database connection
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
