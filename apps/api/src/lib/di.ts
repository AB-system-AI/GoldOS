import { createAuthContainer } from '@goldos/auth';
import { prisma } from '@goldos/database';

import { env } from '@/env';

let container: ReturnType<typeof createAuthContainer> | null = null;

export function getAuthContainer() {
  container ??= createAuthContainer({ authSecret: env.AUTH_SECRET, prisma });
  return container;
}
