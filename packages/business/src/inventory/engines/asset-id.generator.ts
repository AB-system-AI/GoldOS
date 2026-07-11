import type { PrismaClient } from '@goldos/database';

const ASSET_PREFIX = 'AST';
const ASSET_PRODUCT_TYPE = '__ASSET__';
const DEFAULT_PAD_LENGTH = 8;

export class AssetIdGenerator {
  constructor(private readonly prisma: PrismaClient) {}

  async next(tenantId: string): Promise<string> {
    const sequence = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.skuSequence.findFirst({
        where: { tenantId, prefix: ASSET_PREFIX, productType: ASSET_PRODUCT_TYPE },
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
          prefix: ASSET_PREFIX,
          productType: ASSET_PRODUCT_TYPE,
          currentValue: 1,
          padLength: DEFAULT_PAD_LENGTH,
        },
      });
    });

    const padded = String(sequence.currentValue).padStart(sequence.padLength, '0');
    return `${ASSET_PREFIX}-${padded}`;
  }
}
