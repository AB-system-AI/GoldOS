import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import {
  assertFound,
  assertTenantRef,
  asJsonOptional,
  parseInput,
} from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { SkuGenerator } from '../engines/sku-generator.js';
import type { ProductRepository } from '../repositories/product.repository.js';
import type { ProductTagRepository } from '../repositories/product-tag.repository.js';

const goldItemSchema = z.object({
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']),
  grossWeight: z.number().positive(),
  netWeight: z.number().positive(),
  stoneWeight: z.number().optional().nullable(),
  goldWeight: z.number().optional().nullable(),
  purity: z.number().optional().nullable(),
  hallmark: z.string().max(50).optional().nullable(),
  makingCost: z.number().optional().nullable(),
  stoneCost: z.number().optional().nullable(),
  laborCost: z.number().optional().nullable(),
});

const diamondItemSchema = z.object({
  carat: z.number().positive(),
  cut: z
    .enum([
      'ROUND',
      'PRINCESS',
      'CUSHION',
      'OVAL',
      'EMERALD',
      'PEAR',
      'MARQUISE',
      'RADIANT',
      'ASSCHER',
      'HEART',
      'OTHER',
    ])
    .optional()
    .nullable(),
  color: z
    .enum(['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'FANCY', 'OTHER'])
    .optional()
    .nullable(),
  clarity: z
    .enum(['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3', 'OTHER'])
    .optional()
    .nullable(),
  shape: z
    .enum([
      'ROUND',
      'PRINCESS',
      'CUSHION',
      'OVAL',
      'EMERALD',
      'PEAR',
      'MARQUISE',
      'RADIANT',
      'ASSCHER',
      'HEART',
      'OTHER',
    ])
    .optional()
    .nullable(),
  certificateNumber: z.string().max(50).optional().nullable(),
  lab: z.string().max(50).optional().nullable(),
  fluorescence: z.string().max(20).optional().nullable(),
  measurements: z.string().max(50).optional().nullable(),
});

const gemstoneSchema = z.object({
  stoneType: z.enum([
    'RUBY',
    'SAPPHIRE',
    'EMERALD',
    'PEARL',
    'TURQUOISE',
    'OPAL',
    'AMETHYST',
    'TOPAZ',
    'GARNET',
    'OTHER',
  ]),
  carat: z.number().optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  clarity: z.string().max(30).optional().nullable(),
  origin: z.string().max(100).optional().nullable(),
  treatment: z.string().max(100).optional().nullable(),
});

const createProductSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  brandId: z.string().uuid().optional().nullable(),
  collectionId: z.string().uuid().optional().nullable(),
  manufacturerId: z.string().uuid().optional().nullable(),
  sku: z.string().min(1).max(50).optional(),
  skuPrefix: z.string().max(20).optional(),
  name: z.string().min(1).max(255),
  type: z.enum(['GOLD', 'DIAMOND', 'GEMSTONE', 'WATCH', 'ACCESSORY', 'OTHER']),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).optional(),
  description: z.string().optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  makingChargeType: z.enum(['PER_GRAM', 'FIXED', 'PERCENTAGE']).optional().nullable(),
  makingChargeValue: z.number().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
  goldItem: goldItemSchema.optional(),
  diamondItem: diamondItemSchema.optional(),
  gemstone: gemstoneSchema.optional(),
});

const updateProductSchema = createProductSchema.partial().omit({ type: true, sku: true });

const setTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});

export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productTagRepository: ProductTagRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly skuGenerator: SkuGenerator,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.productRepository.findById(tenantId, id), 'Product not found');
  }

  list(tenantId: string, filters?: Parameters<ProductRepository['list']>[1]) {
    return this.productRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createProductSchema, input);

    if (data.categoryId) {
      const categoryId = data.categoryId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCategory(tenantId, categoryId),
        'Category not found in tenant',
      );
    }
    if (data.brandId) {
      const brandId = data.brandId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasBrand(tenantId, brandId),
        'Brand not found in tenant',
      );
    }
    if (data.collectionId) {
      const collectionId = data.collectionId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCollection(tenantId, collectionId),
        'Collection not found in tenant',
      );
    }
    if (data.manufacturerId) {
      const manufacturerId = data.manufacturerId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasManufacturer(tenantId, manufacturerId),
        'Manufacturer not found in tenant',
      );
    }

    this.validateTypeSpecificData(data.type, data);

    const sku =
      data.sku ??
      (await this.skuGenerator.next(tenantId, {
        prefix: data.skuPrefix ?? data.type.substring(0, 3),
        productType: data.type,
      }));

    const existing = await this.productRepository.findBySku(tenantId, sku);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Product SKU already exists');
    }

    const product = await this.productRepository.create(tenantId, {
      sku,
      name: data.name,
      type: data.type,
      status: data.status,
      description: data.description ?? null,
      barcode: data.barcode ?? null,
      makingChargeType: data.makingChargeType ?? null,
      makingChargeValue: data.makingChargeValue ?? null,
      metadata: asJsonOptional(data.metadata) ?? {},
      ...(data.categoryId ? { category: { connect: { id: data.categoryId } } } : {}),
      ...(data.brandId ? { brand: { connect: { id: data.brandId } } } : {}),
      ...(data.collectionId ? { collection: { connect: { id: data.collectionId } } } : {}),
      ...(data.manufacturerId ? { manufacturer: { connect: { id: data.manufacturerId } } } : {}),
      ...(data.type === 'GOLD' && data.goldItem
        ? {
            goldItem: {
              create: {
                karat: data.goldItem.karat,
                grossWeight: data.goldItem.grossWeight,
                netWeight: data.goldItem.netWeight,
                stoneWeight: data.goldItem.stoneWeight ?? null,
                goldWeight: data.goldItem.goldWeight ?? null,
                purity: data.goldItem.purity ?? null,
                hallmark: data.goldItem.hallmark ?? null,
                makingCost: data.goldItem.makingCost ?? null,
                stoneCost: data.goldItem.stoneCost ?? null,
                laborCost: data.goldItem.laborCost ?? null,
              },
            },
          }
        : {}),
      ...(data.type === 'DIAMOND' && data.diamondItem
        ? {
            diamondItem: {
              create: {
                carat: data.diamondItem.carat,
                cut: data.diamondItem.cut ?? null,
                color: data.diamondItem.color ?? null,
                clarity: data.diamondItem.clarity ?? null,
                shape: data.diamondItem.shape ?? null,
                certificateNumber: data.diamondItem.certificateNumber ?? null,
                lab: data.diamondItem.lab ?? null,
                fluorescence: data.diamondItem.fluorescence ?? null,
                measurements: data.diamondItem.measurements ?? null,
              },
            },
          }
        : {}),
      ...(data.type === 'GEMSTONE' && data.gemstone
        ? {
            gemstone: {
              create: {
                stoneType: data.gemstone.stoneType,
                carat: data.gemstone.carat ?? null,
                color: data.gemstone.color ?? null,
                clarity: data.gemstone.clarity ?? null,
                origin: data.gemstone.origin ?? null,
                treatment: data.gemstone.treatment ?? null,
              },
            },
          }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'product',
      entityId: product.id,
      newValues: product,
      context,
    });

    return product;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.productRepository.findById(tenantId, id),
      'Product not found',
    );
    const data = parseInput(updateProductSchema, input);

    if (data.categoryId) {
      const categoryId = data.categoryId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCategory(tenantId, categoryId),
        'Category not found in tenant',
      );
    }
    if (data.brandId) {
      const brandId = data.brandId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasBrand(tenantId, brandId),
        'Brand not found in tenant',
      );
    }
    if (data.collectionId) {
      const collectionId = data.collectionId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCollection(tenantId, collectionId),
        'Collection not found in tenant',
      );
    }

    await assertFound(
      this.productRepository.update(tenantId, id, {
        name: data.name,
        status: data.status,
        description: data.description,
        barcode: data.barcode,
        makingChargeType: data.makingChargeType,
        makingChargeValue: data.makingChargeValue,
        metadata: asJsonOptional(data.metadata),
        ...(data.categoryId !== undefined
          ? data.categoryId
            ? { category: { connect: { id: data.categoryId } } }
            : { category: { disconnect: true } }
          : {}),
        ...(data.brandId !== undefined
          ? data.brandId
            ? { brand: { connect: { id: data.brandId } } }
            : { brand: { disconnect: true } }
          : {}),
        ...(data.collectionId !== undefined
          ? data.collectionId
            ? { collection: { connect: { id: data.collectionId } } }
            : { collection: { disconnect: true } }
          : {}),
      }),
      'Product not found',
    );

    if (data.goldItem && existing.type === 'GOLD') {
      await this.productRepository.updateGoldItem(id, data.goldItem);
    }
    if (data.diamondItem && existing.type === 'DIAMOND') {
      await this.productRepository.updateDiamondItem(id, data.diamondItem);
    }
    if (data.gemstone && existing.type === 'GEMSTONE') {
      await this.productRepository.updateGemstone(id, data.gemstone);
    }

    const updated = await this.getById(tenantId, id);

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'product',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      context,
    });

    return updated;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.productRepository.findById(tenantId, id),
      'Product not found',
    );
    await this.productRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'product',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }

  listTags(tenantId: string, productId: string) {
    return this.productTagRepository.listAssignments(tenantId, productId);
  }

  async setTags(tenantId: string, productId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(setTagsSchema, input);
    await assertFound(this.productRepository.findById(tenantId, productId), 'Product not found');

    const existing = await this.productTagRepository.listAssignments(tenantId, productId);
    const existingTagIds = new Set(existing.map((assignment) => assignment.tagId));
    const nextTagIds = new Set(data.tagIds);

    for (const tagId of nextTagIds) {
      if (!existingTagIds.has(tagId)) {
        await assertTenantRef(
          () => this.entityOwnershipRepository.hasProductTag(tenantId, tagId),
          'Product tag not found in tenant',
        );
        await this.productTagRepository.assignTag(tenantId, productId, tagId);
      }
    }

    for (const assignment of existing) {
      if (!nextTagIds.has(assignment.tagId)) {
        await this.productTagRepository.unassignTag(tenantId, productId, assignment.tagId);
      }
    }

    const tags = await this.productTagRepository.listAssignments(tenantId, productId);

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'product',
      entityId: productId,
      newValues: { tagIds: data.tagIds },
      context,
    });

    return tags;
  }

  private validateTypeSpecificData(type: string, data: z.infer<typeof createProductSchema>) {
    if (type === 'GOLD' && !data.goldItem) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Gold products require goldItem data',
      );
    }
    if (type === 'DIAMOND' && !data.diamondItem) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Diamond products require diamondItem data',
      );
    }
    if (type === 'GEMSTONE' && !data.gemstone) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Gemstone products require gemstone data',
      );
    }
  }
}
