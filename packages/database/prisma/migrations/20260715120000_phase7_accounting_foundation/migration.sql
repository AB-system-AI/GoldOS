-- Phase 7: Enterprise Accounting & Finance Foundation

-- Enums
DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FiscalYearStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AccountingReferenceType" AS ENUM (
    'SALES_INVOICE', 'PURCHASE_ORDER', 'PAYMENT', 'EXPENSE', 'BUYBACK',
    'SALES_RETURN', 'SALES_EXCHANGE', 'INVENTORY_ADJUSTMENT', 'GOLD_PRICE_ADJUSTMENT',
    'CASH_MOVEMENT', 'BANK_TRANSACTION', 'MANUAL', 'PERIOD_CLOSE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerEntryType" AS ENUM (
    'INVOICE', 'PAYMENT', 'REFUND', 'CREDIT_NOTE', 'DEBIT_NOTE',
    'PURCHASE', 'SUPPLIER_PAYMENT', 'ADJUSTMENT', 'OPENING_BALANCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategoryType" AS ENUM (
    'RENT', 'SALARIES', 'ELECTRICITY', 'MARKETING', 'TRANSPORT', 'MAINTENANCE', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CashMovementType" AS ENUM (
    'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'ADJUSTMENT', 'SHORTAGE', 'OVERAGE', 'OPENING', 'CLOSING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CashRegisterShiftStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BankTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BankReconciliationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'RECONCILED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Partner extensions
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(18,4);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(18,4) NOT NULL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(18,4) NOT NULL DEFAULT 0;

-- Expense extensions
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method "PaymentMethod";
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS journal_entry_id UUID;

-- Invoice accounting link
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS journal_entry_id UUID;

-- Core accounting tables
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,
  account_type "AccountType" NOT NULL,
  normal_balance "NormalBalance" NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_branch ON chart_of_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);

CREATE TABLE IF NOT EXISTS fiscal_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id) ON DELETE RESTRICT,
  name VARCHAR(50) NOT NULL,
  period_no INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
  closed_at TIMESTAMPTZ,
  closed_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(fiscal_year_id, period_no)
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  period_id UUID REFERENCES accounting_periods(id) ON DELETE SET NULL,
  journal_no VARCHAR(30) NOT NULL,
  entry_date DATE NOT NULL,
  status "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  reference_type "AccountingReferenceType",
  reference_id UUID,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  description TEXT NOT NULL,
  total_debit DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_credit DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  posted_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  reversed_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  reversed_at TIMESTAMPTZ,
  reversal_of_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, journal_no)
);

CREATE INDEX IF NOT EXISTS idx_journal_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_ref ON journal_entries(reference_type, reference_id);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_no INT NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit DECIMAL(18,4) NOT NULL DEFAULT 0,
  credit DECIMAL(18,4) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  description TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(journal_entry_id, line_no)
);

CREATE TABLE IF NOT EXISTS accounting_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  transaction_type "AccountingReferenceType" NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  journal_entry_id UUID NOT NULL UNIQUE REFERENCES journal_entries(id) ON DELETE RESTRICT,
  status "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  period_id UUID REFERENCES accounting_periods(id) ON DELETE SET NULL,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  debit_total DECIMAL(18,4) NOT NULL DEFAULT 0,
  credit_total DECIMAL(18,4) NOT NULL DEFAULT 0,
  balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  as_of_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, account_id, branch_id, period_id, currency)
);

CREATE TABLE IF NOT EXISTS cash_register_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  status "CashRegisterShiftStatus" NOT NULL DEFAULT 'OPEN',
  opening_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(18,4),
  expected_balance DECIMAL(18,4),
  shortage_overage DECIMAL(18,4),
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  shift_id UUID REFERENCES cash_register_shifts(id) ON DELETE SET NULL,
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE RESTRICT,
  movement_type "CashMovementType" NOT NULL,
  amount DECIMAL(18,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  description TEXT NOT NULL,
  from_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  to_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  transaction_no VARCHAR(30) NOT NULL,
  transaction_type "BankTransactionType" NOT NULL,
  status "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  amount DECIMAL(18,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  description TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, transaction_no)
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  bank_id UUID NOT NULL REFERENCES banks(id) ON DELETE RESTRICT,
  period_end DATE NOT NULL,
  statement_balance DECIMAL(18,4) NOT NULL,
  book_balance DECIMAL(18,4) NOT NULL,
  difference DECIMAL(18,4) NOT NULL DEFAULT 0,
  status "BankReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  reconciled_at TIMESTAMPTZ,
  reconciled_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS customer_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  entry_type "LedgerEntryType" NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  debit DECIMAL(18,4) NOT NULL DEFAULT 0,
  credit DECIMAL(18,4) NOT NULL DEFAULT 0,
  running_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  description TEXT,
  entry_date DATE NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger_entries(customer_id);

CREATE TABLE IF NOT EXISTS supplier_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  entry_type "LedgerEntryType" NOT NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  debit DECIMAL(18,4) NOT NULL DEFAULT 0,
  credit DECIMAL(18,4) NOT NULL DEFAULT 0,
  running_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  description TEXT,
  entry_date DATE NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier ON supplier_ledger_entries(supplier_id);

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  category_type "ExpenseCategoryType" NOT NULL,
  default_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS gold_cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  weight_grams DECIMAL(12,4) NOT NULL,
  karat "GoldKarat" NOT NULL,
  purity DECIMAL(8,4),
  purchase_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  making_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  stone_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  labor_cost DECIMAL(18,4) NOT NULL DEFAULT 0,
  total_cost DECIMAL(18,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'SAR',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gold_cost_ref ON gold_cost_records(reference_type, reference_id);
