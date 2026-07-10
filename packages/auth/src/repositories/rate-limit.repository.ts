import type { PrismaClient } from '@goldos/database';

export class RateLimitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countRecentEvents(bucketKey: string, since: Date): Promise<number> {
    return this.prisma.rateLimitEvent.count({
      where: {
        bucketKey,
        createdAt: { gte: since },
      },
    });
  }

  async recordEvent(bucketKey: string): Promise<void> {
    await this.prisma.rateLimitEvent.create({
      data: { bucketKey },
    });
  }

  async purgeExpiredEvents(bucketKey: string, before: Date): Promise<void> {
    await this.prisma.rateLimitEvent.deleteMany({
      where: {
        bucketKey,
        createdAt: { lt: before },
      },
    });
  }
}
