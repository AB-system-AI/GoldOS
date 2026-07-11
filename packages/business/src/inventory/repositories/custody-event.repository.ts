import type { Prisma, PrismaClient } from '@goldos/database';

export class CustodyEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.custodyEvent.findFirst({
      where: { id, tenantId },
      include: { inventoryItem: true, branch: true, employee: true },
    });
  }

  list(
    tenantId: string,
    filters?: {
      inventoryItemId?: string;
      branchId?: string;
      employeeId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.custodyEvent.findMany({
      where: {
        tenantId,
        ...(filters?.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      },
      include: { employee: true, branch: true },
      orderBy: { occurredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CustodyEventCreateInput, 'tenant'>) {
    return this.prisma.custodyEvent.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
