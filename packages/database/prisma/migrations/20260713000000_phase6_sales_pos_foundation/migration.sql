-- Phase 6: Sales, POS & Customer Operations Foundation

-- Extend SalesOrderStatus enum
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "SalesOrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Phase 6 enums
CREATE TYPE "PosSessionStatus" AS ENUM ('OPEN', 'PARKED', 'CHECKOUT', 'CLOSED');
CREATE TYPE "SalesReturnStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SalesExchangeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BuybackTransactionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRE');

-- Extend sales_orders
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "employee_id" UUID;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "pos_session_id" UUID;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "gold_rate_snapshot" JSONB;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6);

CREATE INDEX IF NOT EXISTS "sales_orders_employee_id_idx" ON "sales_orders"("employee_id");
CREATE INDEX IF NOT EXISTS "sales_orders_payment_status_idx" ON "sales_orders"("payment_status");
CREATE INDEX IF NOT EXISTS "sales_orders_organization_id_idx" ON "sales_orders"("organization_id");
CREATE INDEX IF NOT EXISTS "sales_orders_pos_session_id_idx" ON "sales_orders"("pos_session_id");

-- Extend sales_order_lines
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "inventory_item_id" UUID;
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(12,4);
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "karat" "GoldKarat";
ALTER TABLE "sales_order_lines" ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB;

CREATE INDEX IF NOT EXISTS "sales_order_lines_inventory_item_id_idx" ON "sales_order_lines"("inventory_item_id");

-- Extend invoices
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "employee_id" UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "pricing_snapshot" JSONB;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_paid" DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_due" DECIMAL(18,4) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "invoices_employee_id_idx" ON "invoices"("employee_id");

-- Extend payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "employee_id" UUID;

CREATE INDEX IF NOT EXISTS "payments_branch_id_idx" ON "payments"("branch_id");

-- POS sessions
CREATE TABLE "pos_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "employee_id" UUID,
    "cash_register_id" UUID,
    "session_no" VARCHAR(30) NOT NULL,
    "status" "PosSessionStatus" NOT NULL DEFAULT 'OPEN',
    "cart_data" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pos_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pos_sessions_tenant_id_session_no_key" ON "pos_sessions"("tenant_id", "session_no");
CREATE INDEX "pos_sessions_tenant_id_idx" ON "pos_sessions"("tenant_id");
CREATE INDEX "pos_sessions_branch_id_idx" ON "pos_sessions"("branch_id");
CREATE INDEX "pos_sessions_employee_id_idx" ON "pos_sessions"("employee_id");
CREATE INDEX "pos_sessions_status_idx" ON "pos_sessions"("status");

-- Sales document sequences
CREATE TABLE "sales_document_sequences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "document_type" VARCHAR(30) NOT NULL,
    "prefix" VARCHAR(20) NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "pad_length" INTEGER NOT NULL DEFAULT 6,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sales_document_sequences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_document_sequences_tenant_id_branch_id_document_type_prefix_key"
    ON "sales_document_sequences"("tenant_id", "branch_id", "document_type", "prefix");
CREATE INDEX "sales_document_sequences_tenant_id_idx" ON "sales_document_sequences"("tenant_id");

-- Sales returns
CREATE TABLE "sales_returns" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "employee_id" UUID,
    "invoice_id" UUID NOT NULL,
    "return_no" VARCHAR(30) NOT NULL,
    "status" "SalesReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "refund_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sales_returns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_returns_tenant_id_return_no_key" ON "sales_returns"("tenant_id", "return_no");
CREATE INDEX "sales_returns_tenant_id_idx" ON "sales_returns"("tenant_id");
CREATE INDEX "sales_returns_branch_id_idx" ON "sales_returns"("branch_id");
CREATE INDEX "sales_returns_customer_id_idx" ON "sales_returns"("customer_id");
CREATE INDEX "sales_returns_invoice_id_idx" ON "sales_returns"("invoice_id");
CREATE INDEX "sales_returns_status_idx" ON "sales_returns"("status");

CREATE TABLE "sales_return_lines" (
    "id" UUID NOT NULL,
    "sales_return_id" UUID NOT NULL,
    "invoice_item_id" UUID,
    "inventory_item_id" UUID,
    "line_no" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "refund_amount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sales_return_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_return_lines_sales_return_id_line_no_key" ON "sales_return_lines"("sales_return_id", "line_no");
CREATE INDEX "sales_return_lines_sales_return_id_idx" ON "sales_return_lines"("sales_return_id");

-- Sales exchanges
CREATE TABLE "sales_exchanges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "employee_id" UUID,
    "original_invoice_id" UUID NOT NULL,
    "new_invoice_id" UUID,
    "exchange_no" VARCHAR(30) NOT NULL,
    "status" "SalesExchangeStatus" NOT NULL DEFAULT 'DRAFT',
    "price_difference" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "sales_exchanges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sales_exchanges_tenant_id_exchange_no_key" ON "sales_exchanges"("tenant_id", "exchange_no");
CREATE INDEX "sales_exchanges_tenant_id_idx" ON "sales_exchanges"("tenant_id");
CREATE INDEX "sales_exchanges_branch_id_idx" ON "sales_exchanges"("branch_id");
CREATE INDEX "sales_exchanges_customer_id_idx" ON "sales_exchanges"("customer_id");
CREATE INDEX "sales_exchanges_status_idx" ON "sales_exchanges"("status");

-- Buyback transactions
CREATE TABLE "buyback_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "employee_id" UUID,
    "inventory_item_id" UUID,
    "transaction_no" VARCHAR(30) NOT NULL,
    "status" "BuybackTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "karat" "GoldKarat" NOT NULL,
    "weight_grams" DECIMAL(12,4) NOT NULL,
    "purity" DECIMAL(8,4),
    "gold_rate_snapshot" JSONB,
    "offered_amount" DECIMAL(18,4) NOT NULL,
    "approved_amount" DECIMAL(18,4),
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "buyback_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "buyback_transactions_tenant_id_transaction_no_key" ON "buyback_transactions"("tenant_id", "transaction_no");
CREATE INDEX "buyback_transactions_tenant_id_idx" ON "buyback_transactions"("tenant_id");
CREATE INDEX "buyback_transactions_branch_id_idx" ON "buyback_transactions"("branch_id");
CREATE INDEX "buyback_transactions_customer_id_idx" ON "buyback_transactions"("customer_id");
CREATE INDEX "buyback_transactions_status_idx" ON "buyback_transactions"("status");

-- Loyalty foundation
CREATE TABLE "loyalty_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "points_balance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lifetime_points" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "tier" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "loyalty_accounts_tenant_id_customer_id_key" ON "loyalty_accounts"("tenant_id", "customer_id");
CREATE INDEX "loyalty_accounts_tenant_id_idx" ON "loyalty_accounts"("tenant_id");

CREATE TABLE "loyalty_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "loyalty_account_id" UUID NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" DECIMAL(18,4) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "reason" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_transactions_tenant_id_idx" ON "loyalty_transactions"("tenant_id");
CREATE INDEX "loyalty_transactions_loyalty_account_id_idx" ON "loyalty_transactions"("loyalty_account_id");
CREATE INDEX "loyalty_transactions_occurred_at_idx" ON "loyalty_transactions"("occurred_at");

-- Discount approvals
CREATE TABLE "discount_approvals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "reference_type" VARCHAR(50) NOT NULL,
    "reference_id" UUID NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "requested_value" DECIMAL(18,4) NOT NULL,
    "approved_value" DECIMAL(18,4),
    "status" "InventoryApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID,
    "approved_by_id" UUID,
    "reason" TEXT,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "discount_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "discount_approvals_tenant_id_idx" ON "discount_approvals"("tenant_id");
CREATE INDEX "discount_approvals_branch_id_idx" ON "discount_approvals"("branch_id");
CREATE INDEX "discount_approvals_reference_type_reference_id_idx" ON "discount_approvals"("reference_type", "reference_id");
CREATE INDEX "discount_approvals_status_idx" ON "discount_approvals"("status");

-- Invoice templates
CREATE TABLE "invoice_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoice_templates_tenant_id_code_key" ON "invoice_templates"("tenant_id", "code");
CREATE INDEX "invoice_templates_tenant_id_idx" ON "invoice_templates"("tenant_id");

-- Foreign keys
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_pos_session_id_fkey"
    FOREIGN KEY ("pos_session_id") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_cash_register_id_fkey"
    FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_document_sequences" ADD CONSTRAINT "sales_document_sequences_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_document_sequences" ADD CONSTRAINT "sales_document_sequences_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_returns" ADD CONSTRAINT "sales_returns_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_sales_return_id_fkey"
    FOREIGN KEY ("sales_return_id") REFERENCES "sales_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_invoice_item_id_fkey"
    FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_return_lines" ADD CONSTRAINT "sales_return_lines_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_original_invoice_id_fkey"
    FOREIGN KEY ("original_invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_new_invoice_id_fkey"
    FOREIGN KEY ("new_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_exchanges" ADD CONSTRAINT "sales_exchanges_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "buyback_transactions" ADD CONSTRAINT "buyback_transactions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyback_transactions" ADD CONSTRAINT "buyback_transactions_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyback_transactions" ADD CONSTRAINT "buyback_transactions_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "buyback_transactions" ADD CONSTRAINT "buyback_transactions_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "buyback_transactions" ADD CONSTRAINT "buyback_transactions_inventory_item_id_fkey"
    FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "buyback_transactions" ADD CONSTRAINT "buyback_transactions_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_loyalty_account_id_fkey"
    FOREIGN KEY ("loyalty_account_id") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "discount_approvals" ADD CONSTRAINT "discount_approvals_approved_by_id_fkey"
    FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_templates" ADD CONSTRAINT "invoice_templates_branch_id_fkey"
    FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
