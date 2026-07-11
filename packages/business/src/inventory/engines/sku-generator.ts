import type { PrismaClient } from '@goldos/database';

export interface SkuGeneratorOptions {
  prefix?: string;
  productType?: string | null;
  padLength?: number;
}

const DEFAULT_PREFIX = 'SKU';
const DEFAULT_PAD_LENGTH = 6;

export class SkuGenerator {
  constructor(private readonly prisma: PrismaClient) {}

  async next(tenantId: string, options: SkuGeneratorOptions = {}): Promise<string> {
    const prefix = options.prefix ?? DEFAULT_PREFIX;
    const productType = options.productType ?? null;
    const padLength = options.padLength ?? DEFAULT_PAD_LENGTH;

    const sequence = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.skuSequence.findFirst({
        where: { tenantId, prefix, productType },
      });

      if (existing) {
        return tx.skuSequence.update({
          where: { id: existing.id },
          data: { currentValue: { increment: 1 } },
        });
      }

      return tx.skuSequence.create({
        data: {
          tenantId,
          prefix,
          productType,
          currentValue: 1,
          padLength,
        },
      });
    });

    const padded = String(sequence.currentValue).padStart(sequence.padLength, '0');
    return `${prefix}-${padded}`;
  }
}
