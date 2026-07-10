import { prisma } from '@goldos/database';

import type { ApiResponse } from '@goldos/types/api';
import { generateRequestId } from '@goldos/utils';

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  checks: {
    database: 'ok' | 'error' | 'skipped';
  };
}

export async function GET(): Promise<Response> {
  const requestId = generateRequestId();
  let databaseStatus: HealthData['checks']['database'] = 'skipped';

  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'ok';
    } catch {
      databaseStatus = 'error';
    }
  }

  const status: HealthData['status'] = databaseStatus === 'error' ? 'degraded' : 'ok';

  const body: ApiResponse<HealthData> = {
    data: {
      status,
      service: 'goldos-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseStatus,
      },
    },
    meta: {
      requestId,
    },
  };

  return Response.json(body, {
    status: status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}
