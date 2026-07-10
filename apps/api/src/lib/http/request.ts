import { parseClientInfo } from '@goldos/auth';
import { generateRequestId } from '@goldos/utils';
import type { ZodType } from 'zod';

export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? generateRequestId();
}

export function getClientInfo(request: Request) {
  return parseClientInfo(request.headers);
}

export async function parseJsonBody<Output>(
  request: Request,
  schema: ZodType<Output>,
): Promise<Output> {
  const raw: unknown = await request.json();
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw result.error;
  }
  return result.data;
}
