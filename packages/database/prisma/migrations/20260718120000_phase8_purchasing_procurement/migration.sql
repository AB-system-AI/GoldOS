-- Phase 8: Purchasing, Procurement & Supplier Operations

-- Enums
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CONVERTED');
CREATE TYPE "PurchaseRfqStatus" AS ENUM ('DRAFT', 'SENT', 'QUOTED', 'CLOSED', 'CANCELLED');
CREATE TYPE "SupplierQuotationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "PurchaseInvoiceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'VOIDED', 'CANCELLED');
CREATE TYPE "PurchaseReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PurchaseBillingStatus" AS ENUM ('UNBILLED', 'PARTIALLY_BILLED', 'BILLED');
CREATE TYPE "PurchaseApprovalLevel" AS ENUM ('BRANCH_MANAGER', 'FINANCE', 'OWNER', 'AUTO');
CREATE TYPE "PurchaseApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');
CREATE TYPE "PurchaseDocumentType" AS ENUM ('PURCHASE_REQUEST', 'PURCHASE_RFQ', 'SUPPLIER_QUOTATION', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'PURCHASE_INVOICE', 'PURCHASE_RETURN');

ALTER TYPE "AccountingReferenceType" ADD VALUE IF NOT EXISTS 'GOODS_RECEIPT';
ALTER TYPE "AccountingReferenceType" ADD VALUE IF NOT EXISTS 'PURCHASE_INVOICE';
ALTER TYPE "AccountingReferenceType" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'SUPPLIER_CREDIT';

-- Supplier extensions
ALTER TABLE "suppliers"
  ADD COLUMN IF NOT EXISTS "rating" DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS "is_preferred" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lead_time_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "delivery_sla_days" INTEGER,
  ADD COLUMN IF NOT EXISTS "credit_limit" DECIMAL(18,4),
  ADD COLUMN IF NOT EXISTS "tax_information" JSONB;

-- Purchase order extensions
ALTER TABLE "purchase_orders"
  ADD COLUMN IF NOT EXISTS "purchase_request_id" UUID,
  ADD COLUMN IF NOT EXISTS "purchase_rfq_id" UUID,
  ADD COLUMN IF NOT EXISTS "supplier_quotation_id" UUID,
  ADD COLUMN IF NOT EXISTS "warehouse_zone_id" UUID,
  ADD COLUMN IF NOT EXISTS "requested_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "approved_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "billing_status" "PurchaseBillingStatus" NOT NULL DEFAULT 'UNBILLED',
  ADD COLUMN IF NOT EXISTS "invoiced_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(18,4) NOT NULL DEFAULT 0;

ALTER TABLE "purchase_order_lines"
  ADD COLUMN IF NOT EXISTS "billed_qty" INTEGER NOT NULL DEFAULT 0;

-- Core purchasing tables (abbreviated; full DDL generated from Prisma schema)
CREATE TABLE IF NOT EXISTS "purchasing_document_sequences" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "document_type" VARCHAR(30) NOT NULL,
  "prefix" VARCHAR(20) NOT NULL,
  "current_value" INTEGER NOT NULL DEFAULT 0,
  "pad_length" INTEGER NOT NULL DEFAULT 6,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "purchasing_document_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_requests" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "request_no" VARCHAR(30) NOT NULL,
  "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "requested_by_id" UUID,
  "needed_by_date" DATE,
  "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
  "estimated_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_rfqs" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "purchase_request_id" UUID,
  "rfq_no" VARCHAR(30) NOT NULL,
  "status" "PurchaseRfqStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(255) NOT NULL,
  "due_date" DATE,
  "notes" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_rfqs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_quotations" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_rfq_id" UUID,
  "quotation_no" VARCHAR(30) NOT NULL,
  "status" "SupplierQuotationStatus" NOT NULL DEFAULT 'DRAFT',
  "valid_until" DATE,
  "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
  "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "lead_time_days" INTEGER,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "supplier_quotations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "goods_receipts" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "warehouse_zone_id" UUID,
  "receipt_no" VARCHAR(30) NOT NULL,
  "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
  "receipt_date" DATE NOT NULL,
  "received_by_id" UUID,
  "notes" TEXT,
  "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_invoices" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_order_id" UUID,
  "goods_receipt_id" UUID,
  "invoice_no" VARCHAR(30) NOT NULL,
  "supplier_invoice_no" VARCHAR(50),
  "status" "PurchaseInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "invoice_date" DATE NOT NULL,
  "due_date" DATE,
  "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
  "subtotal" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "paid_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_returns" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_order_id" UUID,
  "goods_receipt_id" UUID,
  "return_no" VARCHAR(30) NOT NULL,
  "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
  "return_date" DATE NOT NULL,
  "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "reason" TEXT,
  "notes" TEXT,
  "approved_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_approvals" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "document_type" "PurchaseDocumentType" NOT NULL,
  "document_id" UUID NOT NULL,
  "level" "PurchaseApprovalLevel" NOT NULL DEFAULT 'BRANCH_MANAGER',
  "status" "PurchaseApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "approver_id" UUID,
  "comments" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "purchase_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_bank_accounts" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "bank_name" VARCHAR(150) NOT NULL,
  "account_name" VARCHAR(150) NOT NULL,
  "account_number" VARCHAR(50),
  "iban" VARCHAR(50),
  "swift_code" VARCHAR(20),
  "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_documents" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "document_type" VARCHAR(50) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_url" VARCHAR(500) NOT NULL,
  "expires_at" TIMESTAMPTZ(6),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_performance_metrics" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "total_orders" INTEGER NOT NULL DEFAULT 0,
  "total_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "on_time_deliveries" INTEGER NOT NULL DEFAULT 0,
  "late_deliveries" INTEGER NOT NULL DEFAULT 0,
  "avg_lead_time_days" DECIMAL(8,2),
  "quality_score" DECIMAL(5,2),
  "return_rate" DECIMAL(5,4),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "supplier_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- Line-item tables
CREATE TABLE IF NOT EXISTS "purchase_request_lines" (
  "id" UUID NOT NULL,
  "purchase_request_id" UUID NOT NULL,
  "product_id" UUID,
  "line_no" INTEGER NOT NULL,
  "description" VARCHAR(255),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "estimated_unit_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "estimated_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_request_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_rfq_lines" (
  "id" UUID NOT NULL,
  "purchase_rfq_id" UUID NOT NULL,
  "product_id" UUID,
  "line_no" INTEGER NOT NULL,
  "description" VARCHAR(255),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_rfq_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_rfq_suppliers" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "purchase_rfq_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "sent_at" TIMESTAMPTZ(6),
  "status" VARCHAR(30) NOT NULL DEFAULT 'INVITED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "purchase_rfq_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "supplier_quotation_lines" (
  "id" UUID NOT NULL,
  "supplier_quotation_id" UUID NOT NULL,
  "product_id" UUID,
  "line_no" INTEGER NOT NULL,
  "description" VARCHAR(255),
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_cost" DECIMAL(18,4) NOT NULL,
  "total_cost" DECIMAL(18,4) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "supplier_quotation_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "goods_receipt_lines" (
  "id" UUID NOT NULL,
  "goods_receipt_id" UUID NOT NULL,
  "purchase_order_line_id" UUID,
  "product_id" UUID NOT NULL,
  "inventory_item_id" UUID,
  "line_no" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_cost" DECIMAL(18,4) NOT NULL,
  "total_cost" DECIMAL(18,4) NOT NULL,
  "weight_grams" DECIMAL(12,4),
  "karat" "GoldKarat",
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_invoice_lines" (
  "id" UUID NOT NULL,
  "purchase_invoice_id" UUID NOT NULL,
  "purchase_order_line_id" UUID,
  "product_id" UUID,
  "line_no" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_cost" DECIMAL(18,4) NOT NULL,
  "tax_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "total_cost" DECIMAL(18,4) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_invoice_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_return_lines" (
  "id" UUID NOT NULL,
  "purchase_return_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "inventory_item_id" UUID,
  "purchase_order_line_id" UUID,
  "line_no" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_cost" DECIMAL(18,4) NOT NULL,
  "total_cost" DECIMAL(18,4) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "purchase_return_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "purchase_approval_configs" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "level" "PurchaseApprovalLevel" NOT NULL DEFAULT 'BRANCH_MANAGER',
  "min_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
  "max_amount" DECIMAL(18,4),
  "auto_approve_below" DECIMAL(18,4),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "purchase_approval_configs_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchase_rfq_id_fkey" FOREIGN KEY ("purchase_rfq_id") REFERENCES "purchase_rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_quotation_id_fkey" FOREIGN KEY ("supplier_quotation_id") REFERENCES "supplier_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_zone_id_fkey" FOREIGN KEY ("warehouse_zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchasing_document_sequences" ADD CONSTRAINT "purchasing_document_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchasing_document_sequences" ADD CONSTRAINT "purchasing_document_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_request_lines" ADD CONSTRAINT "purchase_request_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_rfqs" ADD CONSTRAINT "purchase_rfqs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_purchase_rfq_id_fkey" FOREIGN KEY ("purchase_rfq_id") REFERENCES "purchase_rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_rfq_lines" ADD CONSTRAINT "purchase_rfq_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_purchase_rfq_id_fkey" FOREIGN KEY ("purchase_rfq_id") REFERENCES "purchase_rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_rfq_suppliers" ADD CONSTRAINT "purchase_rfq_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_quotations" ADD CONSTRAINT "supplier_quotations_purchase_rfq_id_fkey" FOREIGN KEY ("purchase_rfq_id") REFERENCES "purchase_rfqs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_supplier_quotation_id_fkey" FOREIGN KEY ("supplier_quotation_id") REFERENCES "supplier_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_quotation_lines" ADD CONSTRAINT "supplier_quotation_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_zone_id_fkey" FOREIGN KEY ("warehouse_zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_lines" ADD CONSTRAINT "purchase_invoice_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_purchase_return_id_fkey" FOREIGN KEY ("purchase_return_id") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_return_lines" ADD CONSTRAINT "purchase_return_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_approvals" ADD CONSTRAINT "purchase_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_approvals" ADD CONSTRAINT "purchase_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_approval_configs" ADD CONSTRAINT "purchase_approval_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_approval_configs" ADD CONSTRAINT "purchase_approval_configs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_performance_metrics" ADD CONSTRAINT "supplier_performance_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_performance_metrics" ADD CONSTRAINT "supplier_performance_metrics_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "purchasing_document_sequences_tenant_id_branch_id_document_type_prefix_key" ON "purchasing_document_sequences"("tenant_id", "branch_id", "document_type", "prefix");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_requests_tenant_id_request_no_key" ON "purchase_requests"("tenant_id", "request_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_request_lines_purchase_request_id_line_no_key" ON "purchase_request_lines"("purchase_request_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_rfqs_tenant_id_rfq_no_key" ON "purchase_rfqs"("tenant_id", "rfq_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_rfq_lines_purchase_rfq_id_line_no_key" ON "purchase_rfq_lines"("purchase_rfq_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_rfq_suppliers_purchase_rfq_id_supplier_id_key" ON "purchase_rfq_suppliers"("purchase_rfq_id", "supplier_id");
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_quotations_tenant_id_quotation_no_key" ON "supplier_quotations"("tenant_id", "quotation_no");
CREATE UNIQUE INDEX IF NOT EXISTS "supplier_quotation_lines_supplier_quotation_id_line_no_key" ON "supplier_quotation_lines"("supplier_quotation_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_tenant_id_receipt_no_key" ON "goods_receipts"("tenant_id", "receipt_no");
CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipt_lines_goods_receipt_id_line_no_key" ON "goods_receipt_lines"("goods_receipt_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_invoices_tenant_id_invoice_no_key" ON "purchase_invoices"("tenant_id", "invoice_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_invoice_lines_purchase_invoice_id_line_no_key" ON "purchase_invoice_lines"("purchase_invoice_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_returns_tenant_id_return_no_key" ON "purchase_returns"("tenant_id", "return_no");
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_return_lines_purchase_return_id_line_no_key" ON "purchase_return_lines"("purchase_return_id", "line_no");

-- Indexes
CREATE INDEX IF NOT EXISTS "purchasing_document_sequences_tenant_id_idx" ON "purchasing_document_sequences"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_requests_tenant_id_idx" ON "purchase_requests"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_requests_branch_id_idx" ON "purchase_requests"("branch_id");
CREATE INDEX IF NOT EXISTS "purchase_requests_status_idx" ON "purchase_requests"("status");
CREATE INDEX IF NOT EXISTS "purchase_request_lines_purchase_request_id_idx" ON "purchase_request_lines"("purchase_request_id");
CREATE INDEX IF NOT EXISTS "purchase_rfqs_tenant_id_idx" ON "purchase_rfqs"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_rfqs_branch_id_idx" ON "purchase_rfqs"("branch_id");
CREATE INDEX IF NOT EXISTS "purchase_rfqs_status_idx" ON "purchase_rfqs"("status");
CREATE INDEX IF NOT EXISTS "purchase_rfq_lines_purchase_rfq_id_idx" ON "purchase_rfq_lines"("purchase_rfq_id");
CREATE INDEX IF NOT EXISTS "purchase_rfq_suppliers_tenant_id_idx" ON "purchase_rfq_suppliers"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_rfq_suppliers_supplier_id_idx" ON "purchase_rfq_suppliers"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_quotations_tenant_id_idx" ON "supplier_quotations"("tenant_id");
CREATE INDEX IF NOT EXISTS "supplier_quotations_supplier_id_idx" ON "supplier_quotations"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_quotations_status_idx" ON "supplier_quotations"("status");
CREATE INDEX IF NOT EXISTS "supplier_quotation_lines_supplier_quotation_id_idx" ON "supplier_quotation_lines"("supplier_quotation_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_tenant_id_idx" ON "goods_receipts"("tenant_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_supplier_id_idx" ON "goods_receipts"("supplier_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_status_idx" ON "goods_receipts"("status");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_goods_receipt_id_idx" ON "goods_receipt_lines"("goods_receipt_id");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_inventory_item_id_idx" ON "goods_receipt_lines"("inventory_item_id");
CREATE INDEX IF NOT EXISTS "purchase_invoices_tenant_id_idx" ON "purchase_invoices"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_invoices_supplier_id_idx" ON "purchase_invoices"("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_invoices_status_idx" ON "purchase_invoices"("status");
CREATE INDEX IF NOT EXISTS "purchase_invoice_lines_purchase_invoice_id_idx" ON "purchase_invoice_lines"("purchase_invoice_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_tenant_id_idx" ON "purchase_returns"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_supplier_id_idx" ON "purchase_returns"("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_status_idx" ON "purchase_returns"("status");
CREATE INDEX IF NOT EXISTS "purchase_return_lines_purchase_return_id_idx" ON "purchase_return_lines"("purchase_return_id");
CREATE INDEX IF NOT EXISTS "purchase_approvals_tenant_id_idx" ON "purchase_approvals"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_approvals_document_type_document_id_idx" ON "purchase_approvals"("document_type", "document_id");
CREATE INDEX IF NOT EXISTS "purchase_approvals_status_idx" ON "purchase_approvals"("status");
CREATE INDEX IF NOT EXISTS "purchase_approval_configs_tenant_id_idx" ON "purchase_approval_configs"("tenant_id");
CREATE INDEX IF NOT EXISTS "purchase_approval_configs_branch_id_idx" ON "purchase_approval_configs"("branch_id");
CREATE INDEX IF NOT EXISTS "supplier_bank_accounts_tenant_id_idx" ON "supplier_bank_accounts"("tenant_id");
CREATE INDEX IF NOT EXISTS "supplier_bank_accounts_supplier_id_idx" ON "supplier_bank_accounts"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_documents_tenant_id_idx" ON "supplier_documents"("tenant_id");
CREATE INDEX IF NOT EXISTS "supplier_documents_supplier_id_idx" ON "supplier_documents"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_performance_metrics_tenant_id_idx" ON "supplier_performance_metrics"("tenant_id");
CREATE INDEX IF NOT EXISTS "supplier_performance_metrics_supplier_id_idx" ON "supplier_performance_metrics"("supplier_id");
CREATE INDEX IF NOT EXISTS "supplier_performance_metrics_period_start_period_end_idx" ON "supplier_performance_metrics"("period_start", "period_end");

-- Phase 8 hardening indexes and columns
CREATE INDEX IF NOT EXISTS "purchase_rfqs_purchase_request_id_idx" ON "purchase_rfqs"("purchase_request_id");
ALTER TABLE "goods_receipt_lines" ADD COLUMN IF NOT EXISTS "gold_rate_at_purchase" DECIMAL(12, 4);
