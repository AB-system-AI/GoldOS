import type { ManualOverrideType, Prisma, PrismaClient } from '@goldos/database';

export class ManualOverrideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      referenceType?: string;
      referenceId?: string;
      overrideType?: ManualOverrideType;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.manualPriceOverride.findMany({
      where: {
        tenantId,
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.referenceType ? { referenceType: filters.referenceType } : {}),
        ...(filters?.referenceId ? { referenceId: filters.referenceId } : {}),
        ...(filters?.overrideType ? { overrideType: filters.overrideType } : {}),
      },
      include: { createdBy: true, branch: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.ManualPriceOverrideCreateInput, 'tenant'>) {
    return this.prisma.manualPriceOverride.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { createdBy: true },
    });
  }
}
