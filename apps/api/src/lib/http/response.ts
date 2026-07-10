import type { ApiError, ApiResponse } from '@goldos/types/api';

export function jsonOk(data: unknown, requestId: string, init?: ResponseInit): Response {
  const body: ApiResponse<unknown> = {
    data,
    meta: { requestId },
  };

  const headers = new Headers(init?.headers);
  headers.set('X-Request-Id', requestId);

  return Response.json(body, {
    status: init?.status,
    statusText: init?.statusText,
    headers,
  });
}

export function jsonError(
  code: string,
  message: string,
  requestId: string,
  options?: {
    status?: number;
    details?: ApiError['error']['details'];
  },
): Response {
  const body: ApiError = {
    error: {
      code,
      message,
      requestId,
      details: options?.details,
    },
  };

  return Response.json(body, {
    status: options?.status ?? 400,
    headers: {
      'X-Request-Id': requestId,
    },
  });
}
