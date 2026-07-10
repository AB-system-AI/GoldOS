import type { ApiResponse } from '@goldos/types/api';
import { generateRequestId } from '@goldos/utils';

interface ApiInfo {
  name: string;
  version: string;
  documentation: string;
}

export function GET(): Response {
  const requestId = generateRequestId();

  const body: ApiResponse<ApiInfo> = {
    data: {
      name: 'GoldOS API',
      version: 'v1',
      documentation: '/api/docs',
    },
    meta: {
      requestId,
    },
  };

  return Response.json(body, {
    headers: {
      'X-Request-Id': requestId,
    },
  });
}
