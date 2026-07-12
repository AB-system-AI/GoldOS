import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput, asJson } from '../../services/validation.js';
import type { InvoiceTemplateRepository } from '../repositories/invoice-template.repository.js';

const createSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(150),
  branchId: z.string().uuid().optional().nullable(),
  templateType: z.enum([
    'RECEIPT_80MM',
    'RECEIPT_58MM',
    'A4',
    'TAX_INVOICE',
    'GIFT_INVOICE',
    'GOLD_CERTIFICATE',
  ]),
  language: z.string().min(2).max(10).default('ar'),
  direction: z.enum(['RTL', 'LTR']).default('RTL'),
  paperWidthMm: z.number().int().positive().optional().nullable(),
  logoFileId: z.string().uuid().optional().nullable(),
  footerText: z.string().optional().nullable(),
  termsText: z.string().optional().nullable(),
  showQr: z.boolean().default(true),
  showBarcode: z.boolean().default(true),
  showVat: z.boolean().default(true),
  layout: z.record(z.unknown()).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial().omit({ code: true });

export class InvoiceTemplateService {
  constructor(
    private readonly invoiceTemplateRepository: InvoiceTemplateRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.invoiceTemplateRepository.findById(tenantId, id),
      'Invoice template not found',
    );
  }

  list(tenantId: string, filters?: Parameters<InvoiceTemplateRepository['list']>[1]) {
    return this.invoiceTemplateRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    const template = await this.invoiceTemplateRepository.create(tenantId, {
      code: data.code,
      name: data.name,
      templateType: data.templateType,
      language: data.language,
      direction: data.direction,
      paperWidthMm: data.paperWidthMm ?? null,
      footerText: data.footerText ?? null,
      termsText: data.termsText ?? null,
      showQr: data.showQr,
      showBarcode: data.showBarcode,
      showVat: data.showVat,
      isDefault: data.isDefault,
      isActive: data.isActive,
      layout: asJson(data.layout ?? {}),
      ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
      ...(data.logoFileId ? { logoFile: { connect: { id: data.logoFileId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'invoice_template',
      entityId: template.id,
      newValues: template,
      context,
    });

    return template;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await this.getById(tenantId, id);
    const data = parseInput(updateSchema, input);

    const updated = await this.invoiceTemplateRepository.update(tenantId, id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.templateType !== undefined ? { templateType: data.templateType } : {}),
      ...(data.language !== undefined ? { language: data.language } : {}),
      ...(data.direction !== undefined ? { direction: data.direction } : {}),
      ...(data.paperWidthMm !== undefined ? { paperWidthMm: data.paperWidthMm } : {}),
      ...(data.footerText !== undefined ? { footerText: data.footerText } : {}),
      ...(data.termsText !== undefined ? { termsText: data.termsText } : {}),
      ...(data.showQr !== undefined ? { showQr: data.showQr } : {}),
      ...(data.showBarcode !== undefined ? { showBarcode: data.showBarcode } : {}),
      ...(data.showVat !== undefined ? { showVat: data.showVat } : {}),
      ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.layout !== undefined ? { layout: asJson(data.layout) } : {}),
      ...(data.branchId !== undefined
        ? data.branchId
          ? { branch: { connect: { id: data.branchId } } }
          : { branch: { disconnect: true } }
        : {}),
      ...(data.logoFileId !== undefined
        ? data.logoFileId
          ? { logoFile: { connect: { id: data.logoFileId } } }
          : { logoFile: { disconnect: true } }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'invoice_template',
      entityId: id,
      oldValues: existing,
      newValues: updated,
      context,
    });

    return updated;
  }

  async remove(tenantId: string, id: string, context?: AuditContext) {
    await this.getById(tenantId, id);
    await this.invoiceTemplateRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'invoice_template',
      entityId: id,
      context,
    });
    return { deleted: true };
  }

  resolveForPrint(
    tenantId: string,
    templateType: Parameters<InvoiceTemplateRepository['findDefault']>[1],
    branchId?: string | null,
  ) {
    return this.invoiceTemplateRepository.findDefault(tenantId, templateType, branchId);
  }
}
