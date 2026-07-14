import type { PartnerStatus, Prisma, PrismaClient, SupplierType } from '@goldos/database';

import { activeOnly, scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class SupplierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        category: true,
        contacts: { where: activeOnly() },
        bankAccounts: { where: activeOnly() },
        documents: { where: activeOnly() },
      },
    });
  }

  findBySupplierNo(tenantId: string, supplierNo: string) {
    return this.prisma.supplier.findFirst({
      where: { supplierNo, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      categoryId?: string;
      status?: PartnerStatus;
      supplierType?: SupplierType;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.supplier.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.supplierType ? { supplierType: filters.supplierType } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.SupplierCreateInput, 'tenant'>) {
    return this.prisma.supplier.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.SupplierUpdateInput) {
    const result = await this.prisma.supplier.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.supplier.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listContacts(tenantId: string, supplierId: string) {
    return this.prisma.supplierContact.findMany({
      where: { supplierId, ...tenantScope(tenantId), ...activeOnly() },
    });
  }

  addContact(tenantId: string, data: Omit<Prisma.SupplierContactCreateInput, 'tenant'>) {
    return this.prisma.supplierContact.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  updateContact(tenantId: string, id: string, data: Prisma.SupplierContactUpdateInput) {
    return this.prisma.supplierContact.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data,
    });
  }

  softDeleteContact(tenantId: string, id: string) {
    return this.prisma.supplierContact.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listCategories(tenantId: string) {
    return this.prisma.supplierCategory.findMany({
      where: tenantScope(tenantId),
      orderBy: { name: 'asc' },
    });
  }

  findCategoryById(tenantId: string, id: string) {
    return this.prisma.supplierCategory.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findCategoryByCode(tenantId: string, code: string) {
    return this.prisma.supplierCategory.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  createCategory(tenantId: string, data: Omit<Prisma.SupplierCategoryCreateInput, 'tenant'>) {
    return this.prisma.supplierCategory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async updateCategory(tenantId: string, id: string, data: Prisma.SupplierCategoryUpdateInput) {
    const result = await this.prisma.supplierCategory.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.supplierCategory.findFirst({ where: scopedIdWhere(tenantId, id) });
  }

  softDeleteCategory(tenantId: string, id: string) {
    return this.prisma.supplierCategory.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listBankAccounts(tenantId: string, supplierId: string) {
    return this.prisma.supplierBankAccount.findMany({
      where: { supplierId, ...tenantScope(tenantId), ...activeOnly() },
    });
  }

  addBankAccount(tenantId: string, data: Omit<Prisma.SupplierBankAccountCreateInput, 'tenant'>) {
    return this.prisma.supplierBankAccount.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  listDocuments(tenantId: string, supplierId: string) {
    return this.prisma.supplierDocument.findMany({
      where: { supplierId, ...tenantScope(tenantId), ...activeOnly() },
    });
  }

  addDocument(tenantId: string, data: Omit<Prisma.SupplierDocumentCreateInput, 'tenant'>) {
    return this.prisma.supplierDocument.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
