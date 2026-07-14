export const PURCHASING_DOCUMENT_TYPES = ['PR', 'RFQ', 'SQ', 'PO', 'GRN', 'PI', 'PRET'] as const;

export type PurchasingDocumentType = (typeof PURCHASING_DOCUMENT_TYPES)[number];

export const PURCHASING_DOCUMENT_PREFIXES: Record<PurchasingDocumentType, string> = {
  PR: 'PR',
  RFQ: 'RFQ',
  SQ: 'SQ',
  PO: 'PO',
  GRN: 'GRN',
  PI: 'PI',
  PRET: 'PRET',
};
