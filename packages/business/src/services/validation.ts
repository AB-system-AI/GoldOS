import type { Prisma } from '@goldos/database';
import type { ZodSchema } from 'zod';

import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';

export function parseInput<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BusinessError(BusinessErrorCodes.VALIDATION_ERROR, 'Validation failed', {
      details: result.error.errors.map((issue) => ({
        field: issue.path.join('.') || 'root',
        code: issue.code,
        message: issue.message,
      })),
    });
  }
  return result.data;
}

export async function assertTenantRef<T>(
  finder: () => Promise<T | null | undefined>,
  message = 'Referenced entity not found in tenant',
): Promise<T> {
  const entity = await finder();
  if (!entity) {
    throw new BusinessError(BusinessErrorCodes.TENANT_MISMATCH, message);
  }
  return entity;
}

export async function assertFound<T>(
  entity: Promise<T | null | undefined> | T | null | undefined,
  message: string,
): Promise<T> {
  const resolved = entity instanceof Promise ? await entity : entity;
  if (!resolved) {
    throw new BusinessError(BusinessErrorCodes.NOT_FOUND, message);
  }
  return resolved;
}

export function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function asJsonOptional(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : asJson(value);
}
