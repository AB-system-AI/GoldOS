import type { InvoiceTemplateType } from '@goldos/database';

import { buildPrintPayload } from '../engines/invoice.engine.js';
import type { InvoiceRepository } from '../repositories/invoice.repository.js';
import type { InvoiceTemplateService } from './invoice-template.service.js';

export type PrintFormat = 'A4' | 'RECEIPT_80MM' | 'RECEIPT_58MM' | 'PDF';

const FORMAT_MAP: Record<PrintFormat, InvoiceTemplateType> = {
  A4: 'A4',
  RECEIPT_80MM: 'RECEIPT_80MM',
  RECEIPT_58MM: 'RECEIPT_58MM',
  PDF: 'A4',
};

const PAPER_WIDTH: Record<PrintFormat, number | null> = {
  A4: null,
  RECEIPT_80MM: 80,
  RECEIPT_58MM: 58,
  PDF: null,
};

export class InvoicePrintService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceTemplateService: InvoiceTemplateService,
  ) {}

  async generatePrintPayload(tenantId: string, invoiceId: string, format: PrintFormat) {
    const invoice = await this.invoiceRepository.findById(tenantId, invoiceId);
    if (!invoice) return null;

    const templateType = FORMAT_MAP[format];
    const template = await this.invoiceTemplateService.resolveForPrint(
      tenantId,
      templateType,
      invoice.branchId,
    );

    const base = buildPrintPayload(invoice);
    const paperWidthMm = template?.paperWidthMm ?? PAPER_WIDTH[format];
    const direction = template?.direction ?? 'RTL';
    const language = template?.language ?? 'ar';

    return {
      ...base,
      format,
      templateType,
      paperWidthMm,
      direction,
      language,
      thermal: format === 'RECEIPT_80MM' || format === 'RECEIPT_58MM',
      pdfReady: format === 'PDF' || format === 'A4',
      printable: true,
      branding: {
        logoUrl: template?.logoFile ? `/api/v1/files/${template.logoFile.id}` : null,
        footerText: template?.footerText ?? null,
        termsText: template?.termsText ?? null,
      },
      display: {
        showQr: template?.showQr ?? true,
        showBarcode: template?.showBarcode ?? true,
        showVat: template?.showVat ?? true,
      },
      qrCode: invoice.qrCode ?? `INV:${invoice.invoiceNo}`,
      barcode: invoice.barcode ?? invoice.invoiceNo,
      goldDetails: invoice.items.map((item) => ({
        lineNo: item.lineNo,
        description: item.description,
        weight: item.weight ? Number(item.weight) : null,
        karat: item.karat,
        unitPrice: Number(item.unitPrice),
        totalAmount: Number(item.totalAmount),
      })),
      payments: invoice.payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount),
        reference: p.reference,
      })),
      vat: {
        taxAmount: Number(invoice.taxAmount),
        showVat: template?.showVat ?? true,
      },
      customer: invoice.customer
        ? {
            name: invoice.customer.name,
            phone: invoice.customer.phone,
          }
        : null,
      company: { name: invoice.branch.name, code: invoice.branch.code },
    };
  }
}
