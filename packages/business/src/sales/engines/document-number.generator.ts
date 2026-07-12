import type { PrismaClient } from '@goldos/database';

import type { SalesDocumentType } from '../types/sales.types.js';

export interface DocumentNumberOptions {
  branchId?: string | null;
  prefix?: string;
  padLength?: number;
}

const DEFAULT_PREFIXES: Record<SalesDocumentType, string> = {
  ORDER: 'SO',
  INVOICE: 'INV',
  PAYMENT: 'PAY',
  RETURN: 'RET',
  EXCHANGE: 'EXC',
  BUYBACK: 'BBK',
  POS_SESSION: 'POS',
};

const DEFAULT_PAD_LENGTH = 6;

export class DocumentNumberGenerator {
  constructor(private readonly prisma: PrismaClient) {}

  async next(
    tenantId: string,
    documentType: SalesDocumentType,
    options: DocumentNumberOptions = {},
  ): Promise<string> {
    const prefix = options.prefix ?? DEFAULT_PREFIXES[documentType];
    const padLength = options.padLength ?? DEFAULT_PAD_LENGTH;
    const branchId = options.branchId ?? null;

    const sequence = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.salesDocumentSequence.findFirst({
        where: {
          tenantId,
          branchId,
          documentType,
          prefix,
        },
      });

      if (existing) {
        return tx.salesDocumentSequence.update({
          where: { id: existing.id },
          data: { currentValue: { increment: 1 } },
        });
      }

      return tx.salesDocumentSequence.create({
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
