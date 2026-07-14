import type { PrismaClient } from '@goldos/database';

import type { PurchasingDocumentType } from '../types/purchasing.types.js';
import { PURCHASING_DOCUMENT_PREFIXES } from '../types/purchasing.types.js';

export interface PurchasingDocumentNumberOptions {
  branchId?: string | null;
  prefix?: string;
  padLength?: number;
}

const DEFAULT_PAD_LENGTH = 6;

export class PurchasingDocumentNumberGenerator {
  constructor(private readonly prisma: PrismaClient) {}

  async next(
    tenantId: string,
    documentType: PurchasingDocumentType,
    options: PurchasingDocumentNumberOptions = {},
  ): Promise<string> {
    const prefix = options.prefix ?? PURCHASING_DOCUMENT_PREFIXES[documentType];
    const padLength = options.padLength ?? DEFAULT_PAD_LENGTH;
    const branchId = options.branchId ?? null;

    const sequence = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.purchasingDocumentSequence.findFirst({
        where: { tenantId, branchId, documentType, prefix },
      });

      if (existing) {
        return tx.purchasingDocumentSequence.update({
          where: { id: existing.id },
          data: { currentValue: { increment: 1 } },
        });
      }

      return tx.purchasingDocumentSequence.create({
        data: {
          tenantId,
          branchId,
          documentType,
          prefix,
          currentValue: 1,
          padLength,
        },
      });
    });

    const padded = String(sequence.currentValue).padStart(sequence.padLength, '0');
    return `${prefix}-${padded}`;
  }
}
