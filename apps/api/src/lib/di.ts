import { createAuthContainer } from '@goldos/auth';
import { createBusinessContainer } from '@goldos/business';
import { prisma } from '@goldos/database';

import { env } from '@/env';

let authContainer: ReturnType<typeof createAuthContainer> | null = null;
let businessContainer: ReturnType<typeof createBusinessContainer> | null = null;

export function getAuthContainer() {
  authContainer ??= createAuthContainer({ authSecret: env.AUTH_SECRET, prisma });
  return authContainer;
}

export function getBusinessContainer() {
  businessContainer ??= createBusinessContainer({ prisma });
  return businessContainer;
}
