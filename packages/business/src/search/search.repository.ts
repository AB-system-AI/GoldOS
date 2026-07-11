import type { PrismaClient } from '@goldos/database';

import { activeOnly, tenantScope } from '../repositories/tenant-scope.js';
import type { GlobalSearchHit, GlobalSearchQuery, SearchEntityType } from './types.js';

const DEFAULT_LIMIT = 20;

export class SearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async searchIndexed(
    tenantId: string,
    query: GlobalSearchQuery,
    entityTypes: SearchEntityType[],
  ): Promise<GlobalSearchHit[]> {
    const term = query.query.trim();
    if (!term || entityTypes.length === 0) {
      return [];
    }

    const take = query.limit ?? DEFAULT_LIMIT;
    const rows = await this.prisma.globalSearchIndex.findMany({
      where: {
        ...tenantScope(tenantId),
        ...activeOnly(),
        status: 'ACTIVE',
        entityType: { in: entityTypes },
        ...(query.branchId
          ? {
              metadata: {
                path: ['branchId'],
                equals: query.branchId,
              },
            }
          : {}),
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { subtitle: { contains: term, mode: 'insensitive' } },
          { content: { contains: term, mode: 'insensitive' } },
          { keywords: { has: term } },
        ],
      },
      orderBy: { indexedAt: 'desc' },
      skip: query.offset,
      take,
    });

    return rows.map((row) => ({
      entityType: row.entityType as SearchEntityType,
      entityId: row.entityId,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      branchId: extractBranchId(row.metadata),
      metadata: asMetadata(row.metadata),
      score: 1,
    }));
  }

  async searchLive(
    tenantId: string,
    query: GlobalSearchQuery,
    entityTypes: SearchEntityType[],
  ): Promise<GlobalSearchHit[]> {
    const term = query.query.trim();
    if (!term || entityTypes.length === 0) {
      return [];
    }

    const perTypeLimit = Math.max(
      1,
      Math.ceil((query.limit ?? DEFAULT_LIMIT) / entityTypes.length),
    );
    const searches = entityTypes.map((entityType) =>
      this.searchEntityType(tenantId, entityType, term, query.branchId, perTypeLimit),
    );
    const groups = await Promise.all(searches);
    return groups.flat();
  }

  private async searchEntityType(
    tenantId: string,
    entityType: SearchEntityType,
    term: string,
    branchId: string | undefined,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    switch (entityType) {
      case 'PRODUCT':
        return this.searchProducts(tenantId, term, take);
      case 'CUSTOMER':
        return this.searchCustomers(tenantId, term, take);
      case 'EMPLOYEE':
        return this.searchEmployees(tenantId, term, branchId, take);
      case 'SUPPLIER':
        return this.searchSuppliers(tenantId, term, take);
      case 'INVOICE':
        return this.searchInvoices(tenantId, term, branchId, take);
      case 'BRANCH':
        return this.searchBranches(tenantId, term, take);
      case 'WORKSHOP':
        return this.searchWorkshops(tenantId, term, branchId, take);
      case 'INVENTORY':
        return this.searchInventory(tenantId, term, branchId, take);
      default:
        return [];
    }
  }

  private async searchProducts(
    tenantId: string,
    term: string,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { barcode: { contains: term, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'PRODUCT',
      entityId: row.id,
      title: row.name,
      subtitle: row.sku,
      metadata: { sku: row.sku, status: row.status },
      score: 0.9,
    }));
  }

  private async searchCustomers(
    tenantId: string,
    term: string,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.customer.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { customerNo: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'CUSTOMER',
      entityId: row.id,
      title: row.name,
      subtitle: row.customerNo,
      metadata: { customerNo: row.customerNo, status: row.status },
      score: 0.9,
    }));
  }

  private async searchEmployees(
    tenantId: string,
    term: string,
    branchId: string | undefined,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.employee.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(branchId ? { branchId } : {}),
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { employeeNo: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
        ],
      },
      take,
      orderBy: { employeeNo: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'EMPLOYEE',
      entityId: row.id,
      title: `${row.firstName} ${row.lastName}`,
      subtitle: row.employeeNo,
      ...(row.branchId ? { branchId: row.branchId } : {}),
      metadata: { employeeNo: row.employeeNo, status: row.status },
      score: 0.9,
    }));
  }

  private async searchSuppliers(
    tenantId: string,
    term: string,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.supplier.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'SUPPLIER',
      entityId: row.id,
      title: row.name,
      subtitle: row.email ?? undefined,
      metadata: { status: row.status },
      score: 0.9,
    }));
  }

  private async searchInvoices(
    tenantId: string,
    term: string,
    branchId: string | undefined,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(branchId ? { branchId } : {}),
        OR: [{ invoiceNo: { contains: term, mode: 'insensitive' } }],
      },
      include: { customer: true },
      take,
      orderBy: { issuedAt: 'desc' },
    });

    return rows.map((row) => ({
      entityType: 'INVOICE',
      entityId: row.id,
      title: row.invoiceNo,
      subtitle: row.customer?.name,
      branchId: row.branchId,
      metadata: { status: row.status, paymentStatus: row.paymentStatus },
      score: 0.9,
    }));
  }

  private async searchBranches(
    tenantId: string,
    term: string,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.branch.findMany({
      where: {
        ...tenantScope(tenantId),
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'BRANCH',
      entityId: row.id,
      title: row.name,
      subtitle: row.code,
      branchId: row.id,
      metadata: { code: row.code, branchStatus: row.branchStatus },
      score: 0.9,
    }));
  }

  private async searchWorkshops(
    tenantId: string,
    term: string,
    branchId: string | undefined,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.workshop.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(branchId ? { branchId } : {}),
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { code: { contains: term, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'WORKSHOP',
      entityId: row.id,
      title: row.name,
      subtitle: row.code,
      ...(row.branchId ? { branchId: row.branchId } : {}),
      metadata: { code: row.code, status: row.status },
      score: 0.9,
    }));
  }

  private async searchInventory(
    tenantId: string,
    term: string,
    branchId: string | undefined,
    take: number,
  ): Promise<GlobalSearchHit[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(branchId ? { branchId } : {}),
        OR: [
          { serialNumber: { contains: term, mode: 'insensitive' } },
          { barcode: { contains: term, mode: 'insensitive' } },
          { product: { name: { contains: term, mode: 'insensitive' } } },
        ],
      },
      include: { product: true },
      take,
      orderBy: { serialNumber: 'asc' },
    });

    return rows.map((row) => ({
      entityType: 'INVENTORY',
      entityId: row.id,
      title: row.serialNumber,
      subtitle: row.product.name,
      branchId: row.branchId,
      metadata: { status: row.status, productId: row.productId },
      score: 0.9,
    }));
  }
}

function extractBranchId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  const value = (metadata as Record<string, unknown>).branchId;
  return typeof value === 'string' ? value : undefined;
}

function asMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }
  return metadata as Record<string, unknown>;
}
