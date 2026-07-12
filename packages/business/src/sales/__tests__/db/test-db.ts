import { createPrismaClient } from '@goldos/database';
import type { PrismaClient } from '@goldos/database';

export function resolveTestDatabaseUrl(): string | undefined {
  return process.env.TEST_DATABASE_URL;
}

export function createTestPrisma(): PrismaClient {
  const url = resolveTestDatabaseUrl();
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required for database integration tests');
  }
  return createPrismaClient({ datasources: { db: { url } } });
}

export async function withRollback<T>(prisma: PrismaClient, fn: (tx: PrismaClient) => Promise<T>) {
  try {
    await prisma.$transaction(async (tx) => {
      await fn(tx as unknown as PrismaClient);
      throw new Error('__TEST_ROLLBACK__');
    });
  } catch (error) {
    if (error instanceof Error && error.message === '__TEST_ROLLBACK__') {
      return undefined as T;
    }
    throw error;
  }
}
