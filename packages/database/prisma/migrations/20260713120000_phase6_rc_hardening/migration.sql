-- Phase 6 RC: Enterprise Sales Hardening

ALTER TYPE "InventoryLockType" ADD VALUE IF NOT EXISTS 'SALE';
ALTER TYPE "InventoryLockType" ADD VALUE IF NOT EXISTS 'RESERVATION';

-- Extend enums
ALTER TYPE "SalesExchangeStatus" ADD VALUE IF NOT EXISTS 'EVALUATION';
ALTER TYPE "SalesExchangeStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "LoyaltyTransactionType" ADD VALUE IF NOT EXISTS 'REVERSE';

CREATE TYPE "CashierQueueStatus" AS ENUM ('WAITING', 'CALLING', 'PROCESSING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "InvoiceTemplateType" AS ENUM ('RECEIPT_80MM', 'RECEIPT_58MM', 'A4', 'TAX_INVOICE', 'GIFT_INVOICE', 'GOLD_CERTIFICATE');
CREATE TYPE "TextDirection" AS ENUM ('RTL', 'LTR');
CREATE TYPE "ManualOverrideType" AS ENUM ('SELLING_PRICE', 'BUYBACK_PRICE', 'DISCOUNT', 'MAKING_CHARGE', 'LABOR_CHARGE');
CREATE TYPE "SalesExchangeLineDirection" AS ENUM ('RETURN', 'NEW_SALE');
CREATE TYPE "SalesEventType" AS ENUM (
  'SALE_COMPLETED', 'PAYMENT_COMPLETED', 'DISCOUNT_PENDING', 'DISCOUNT_APPROVED', 'DISCOUNT_REJECTED',
  'EXCHANGE_APPROVED', 'EXCHANGE_COMPLETED', 'RETURN_COMPLETED', 'BUYBACK_COMPLETED', 'INVOICE_ISSUED',
  'POS_SESSION_OPENED', 'POS_SESSION_CLOSED', 'QUEUE_WAITING', 'QUEUE_CALLING'
);

-- Sales orders extensions
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "exchange_rate_snapshot" JSONB;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "reservation_id" UUID;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "seller_employee_id" UUID;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "cashier_employee_id" UUID;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "loyalty_points_redeemed" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "loyalty_points_earned" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "discount_pending" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "checkout_locked_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "sales_orders_seller_employee_id_idx" ON "sales_orders"("seller_employee_id");
CREATE INDEX IF NOT EXISTS "sales_orders_cashier_employee_id_idx" ON "sales_orders"("cashier_employee_id");
CREATE INDEX IF NOT EXISTS "sales_orders_reservation_id_idx" ON "sales_orders"("reservation_id");
CREATE INDEX IF NOT EXISTS "sales_orders_tenant_id_status_branch_id_idx" ON "sales_orders"("tenant_id", "status", "branch_id");

-- Invoice extensions
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "cashier_employee_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "qr_code" VARCHAR(255);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "barcode" VARCHAR(100);

CREATE INDEX IF NOT EXISTS "invoices_cashier_employee_id_idx" ON "invoices"("cashier_employee_id");
CREATE INDEX IF NOT EXISTS "invoices_qr_code_idx" ON "invoices"("qr_code");
CREATE INDEX IF NOT EXISTS "invoices_barcode_idx" ON "invoices"("barcode");

-- Sales exchange extensions
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "return_amount" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "new_sale_amount" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "refund_amount" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "gold_rate_snapshot" JSONB;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "exchange_rate_snapshot" JSONB;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "evaluation_notes" TEXT;
ALTER TABLE "sales_exchanges" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

-- Discount approval extensions
ALTER TABLE "discount_approvals" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ(6);
ALTER TABLE "discount_approvals" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

-- Loyalty transaction extensions
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6);
ALTER TABLE "loyalty_transactions" ADD COLUMN IF NOT EXISTS "multiplier" DECIMAL(8,4) NOT NULL DEFAULT 1;

-- Invoice template extensions
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "template_type" "InvoiceTemplateType" NOT NULL DEFAULT 'A4';
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "language" VARCHAR(10) NOT NULL DEFAULT 'ar';
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "direction" "TextDirection" NOT NULL DEFAULT 'RTL';
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "paper_width_mm" INTEGER;
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "logo_file_id" UUID;
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "footer_text" TEXT;
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "terms_text" TEXT;
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "show_qr" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "show_barcode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "invoice_templates" ADD COLUMN IF NOT EXISTS "show_vat" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "invoice_templates_template_type_idx" ON "invoice_templates"("template_type");

-- New tables
CREATE TABLE "cashier_queue_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "seller_employee_id" UUID,
    "cashier_employee_id" UUID,
    "status" "CashierQueueStatus" NOT NULL DEFAULT 'WAITING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "estimated_wait_minutes" INTEGER,
    "queue_position" INTEGER,
    "queued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "called_at" TIMESTAMPTZ(6),
    "processing_started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "cashier_queue_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cashier_queue_entries_sales_order_id_key" ON "cashier_queue_entries"("sales_order_id");
CREATE INDEX "cashier_queue_entries_tenant_id_idx" ON "cashier_queue_entries"("tenant_id");
CREATE INDEX "cashier_queue_entries_branch_id_idx" ON "cashier_queue_entries"("branch_id");
CREATE INDEX "cashier_queue_entries_status_idx" ON "cashier_queue_entries"("status");
CREATE INDEX "cashier_queue_entries_tenant_id_branch_id_status_idx" ON "cashier_queue_entries"("tenant_id", "branch_id", "status");

CREATE TABLE "sales_exchange_lines" (
    "id" UUID NOT NULL,
    "sales_exchange_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "direction" "SalesExchangeLineDirection" NOT NULL,
    "invoice_item_id" UUID,
    "inventory_item_id" UUID,
    "product_id" UUID,
    "buyback_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL(18,4) NOT NULL,
    "weight" DECIMAL(12,4),
    "karat" "GoldKarat",
    "pricing_snapshot" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "sales_exchange_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sales_exchange_lines_sales_exchange_id_line_no_key" ON "sales_exchange_lines"("sales_exchange_id", "line_no");
CREATE INDEX "sales_exchange_lines_sales_exchange_id_idx" ON "sales_exchange_lines"("sales_exchange_id");

CREATE TABLE "manual_price_overrides" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "reference_type" VARCHAR(50) NOT NULL,
    "reference_id" UUID NOT NULL,
    "override_type" "ManualOverrideType" NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "original_value" DECIMAL(18,4) NOT NULL,
    "override_value" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manual_price_overrides_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "manual_price_overrides_tenant_id_idx" ON "manual_price_overrides"("tenant_id");
CREATE INDEX "manual_price_overrides_reference_type_reference_id_idx" ON "manual_price_overrides"("reference_type", "reference_id");

CREATE TABLE "loyalty_program_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "points_per_currency" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "vip_multiplier" DECIMAL(8,4) NOT NULL DEFAULT 1.5,
    "platinum_multiplier" DECIMAL(8,4) NOT NULL DEFAULT 2,
    "expiration_days" INTEGER NOT NULL DEFAULT 365,
    "redeem_rate" DECIMAL(18,6) NOT NULL DEFAULT 0.01,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "loyalty_program_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loyalty_program_rules_tenant_id_key" ON "loyalty_program_rules"("tenant_id");

CREATE TABLE "sales_event_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "user_id" UUID,
    "event_type" "SalesEventType" NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_event_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sales_event_logs_tenant_id_idx" ON "sales_event_logs"("tenant_id");
CREATE INDEX "sales_event_logs_event_type_idx" ON "sales_event_logs"("event_type");
CREATE INDEX "sales_event_logs_occurred_at_idx" ON "sales_event_logs"("occurred_at");

-- Foreign keys
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_seller_employee_id_fkey" FOREIGN KEY ("seller_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_cashier_employee_id_fkey" FOREIGN KEY ("cashier_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cashier_employee_id_fkey" FOREIGN KEY ("cashier_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_logo_file_id_fkey" FOREIGN KEY ("logo_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cashier_queue_entries" ADD CONSTRAINT "cashier_queue_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cashier_queue_entries" ADD CONSTRAINT "cashier_queue_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cashier_queue_entries" ADD CONSTRAINT "cashier_queue_entries_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cashier_queue_entries" ADD CONSTRAINT "cashier_queue_entries_seller_employee_id_fkey" FOREIGN KEY ("seller_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashier_queue_entries" ADD CONSTRAINT "cashier_queue_entries_cashier_employee_id_fkey" FOREIGN KEY ("cashier_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_exchange_lines" ADD CONSTRAINT "sales_exchange_lines_sales_exchange_id_fkey" FOREIGN KEY ("sales_exchange_id") REFERENCES "sales_exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_exchange_lines" ADD CONSTRAINT "sales_exchange_lines_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_exchange_lines" ADD CONSTRAINT "sales_exchange_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_exchange_lines" ADD CONSTRAINT "sales_exchange_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_exchange_lines" ADD CONSTRAINT "sales_exchange_lines_buyback_id_fkey" FOREIGN KEY ("buyback_id") REFERENCES "buyback_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "manual_price_overrides" ADD CONSTRAINT "manual_price_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "manual_price_overrides" ADD CONSTRAINT "manual_price_overrides_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_price_overrides" ADD CONSTRAINT "manual_price_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loyalty_program_rules" ADD CONSTRAINT "loyalty_program_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sales_event_logs" ADD CONSTRAINT "sales_event_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_event_logs" ADD CONSTRAINT "sales_event_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
