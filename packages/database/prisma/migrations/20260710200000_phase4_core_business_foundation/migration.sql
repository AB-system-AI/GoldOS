-- Phase 4: Core Business Foundation

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'VIP', 'WALK_IN');
CREATE TYPE "SupplierType" AS ENUM ('LOCAL', 'INTERNATIONAL', 'MANUFACTURER', 'WORKSHOP');
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED');
CREATE TYPE "EmploymentEventType" AS ENUM ('HIRED', 'PROMOTED', 'TRANSFERRED', 'LEAVE', 'RETURN', 'TERMINATED', 'RESIGNED', 'OTHER');

-- AlterTable branches
ALTER TABLE "branches" ADD COLUMN "branch_status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "branches" ADD COLUMN "manager_id" UUID;
ALTER TABLE "branches" ADD COLUMN "default_currency_code" CHAR(3);
ALTER TABLE "branches" ADD COLUMN "default_warehouse_branch_id" UUID;
ALTER TABLE "branches" ADD COLUMN "working_hours" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "branches" ADD COLUMN "tax_configuration" JSONB NOT NULL DEFAULT '{}';

-- AlterTable employees
ALTER TABLE "employees" ADD COLUMN "manager_id" UUID;
ALTER TABLE "employees" ADD COLUMN "department_id" UUID;
ALTER TABLE "employees" ADD COLUMN "job_title_id" UUID;
ALTER TABLE "employees" ADD COLUMN "photo_file_id" UUID;
ALTER TABLE "employees" ADD COLUMN "notes" TEXT;

-- AlterTable customers
ALTER TABLE "customers" ADD COLUMN "customer_group_id" UUID;
ALTER TABLE "customers" ADD COLUMN "customer_type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "customers" ADD COLUMN "tax_number" VARCHAR(50);
ALTER TABLE "customers" ADD COLUMN "is_walk_in" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable suppliers
ALTER TABLE "suppliers" ADD COLUMN "category_id" UUID;
ALTER TABLE "suppliers" ADD COLUMN "supplier_type" "SupplierType" NOT NULL DEFAULT 'LOCAL';

-- CreateTable departments
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable job_titles
CREATE TABLE "job_titles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable employee_branches
CREATE TABLE "employee_branches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "employee_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable employment_history
CREATE TABLE "employment_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "event_type" "EmploymentEventType" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "branch_id" UUID,
    "department" VARCHAR(100),
    "job_title" VARCHAR(100),
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "employment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable employee_emergency_contacts
CREATE TABLE "employee_emergency_contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "employee_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable customer_groups
CREATE TABLE "customer_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "discount_bps" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable customer_phones
CREATE TABLE "customer_phones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "label" VARCHAR(50),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "customer_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable customer_buyback_history
CREATE TABLE "customer_buyback_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reference_no" VARCHAR(30) NOT NULL,
    "karat" "GoldKarat" NOT NULL,
    "weight_grams" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "customer_buyback_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable customer_trade_in_history
CREATE TABLE "customer_trade_in_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "reference_no" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "credit_value" DECIMAL(18,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "customer_trade_in_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable supplier_categories
CREATE TABLE "supplier_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable supplier_contacts
CREATE TABLE "supplier_contacts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "title" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable branch_currencies
CREATE TABLE "branch_currencies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "branch_currencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");
CREATE INDEX "departments_tenant_id_deleted_at_idx" ON "departments"("tenant_id", "deleted_at");

CREATE UNIQUE INDEX "job_titles_tenant_id_code_key" ON "job_titles"("tenant_id", "code");
CREATE INDEX "job_titles_tenant_id_idx" ON "job_titles"("tenant_id");
CREATE INDEX "job_titles_tenant_id_deleted_at_idx" ON "job_titles"("tenant_id", "deleted_at");

CREATE UNIQUE INDEX "employee_branches_employee_id_branch_id_key" ON "employee_branches"("employee_id", "branch_id");
CREATE INDEX "employee_branches_tenant_id_idx" ON "employee_branches"("tenant_id");
CREATE INDEX "employee_branches_employee_id_idx" ON "employee_branches"("employee_id");
CREATE INDEX "employee_branches_branch_id_idx" ON "employee_branches"("branch_id");

CREATE INDEX "employment_history_tenant_id_idx" ON "employment_history"("tenant_id");
CREATE INDEX "employment_history_employee_id_idx" ON "employment_history"("employee_id");
CREATE INDEX "employment_history_effective_at_idx" ON "employment_history"("effective_at");

CREATE INDEX "employee_emergency_contacts_tenant_id_idx" ON "employee_emergency_contacts"("tenant_id");
CREATE INDEX "employee_emergency_contacts_employee_id_idx" ON "employee_emergency_contacts"("employee_id");

CREATE UNIQUE INDEX "customer_groups_tenant_id_code_key" ON "customer_groups"("tenant_id", "code");
CREATE INDEX "customer_groups_tenant_id_idx" ON "customer_groups"("tenant_id");
CREATE INDEX "customer_groups_tenant_id_deleted_at_idx" ON "customer_groups"("tenant_id", "deleted_at");

CREATE INDEX "customer_phones_tenant_id_idx" ON "customer_phones"("tenant_id");
CREATE INDEX "customer_phones_customer_id_idx" ON "customer_phones"("customer_id");
CREATE INDEX "customer_phones_phone_idx" ON "customer_phones"("phone");

CREATE UNIQUE INDEX "customer_buyback_history_tenant_id_reference_no_key" ON "customer_buyback_history"("tenant_id", "reference_no");
CREATE INDEX "customer_buyback_history_tenant_id_idx" ON "customer_buyback_history"("tenant_id");
CREATE INDEX "customer_buyback_history_customer_id_idx" ON "customer_buyback_history"("customer_id");
CREATE INDEX "customer_buyback_history_occurred_at_idx" ON "customer_buyback_history"("occurred_at");

CREATE UNIQUE INDEX "customer_trade_in_history_tenant_id_reference_no_key" ON "customer_trade_in_history"("tenant_id", "reference_no");
CREATE INDEX "customer_trade_in_history_tenant_id_idx" ON "customer_trade_in_history"("tenant_id");
CREATE INDEX "customer_trade_in_history_customer_id_idx" ON "customer_trade_in_history"("customer_id");
CREATE INDEX "customer_trade_in_history_occurred_at_idx" ON "customer_trade_in_history"("occurred_at");

CREATE UNIQUE INDEX "supplier_categories_tenant_id_code_key" ON "supplier_categories"("tenant_id", "code");
CREATE INDEX "supplier_categories_tenant_id_idx" ON "supplier_categories"("tenant_id");

CREATE INDEX "supplier_contacts_tenant_id_idx" ON "supplier_contacts"("tenant_id");
CREATE INDEX "supplier_contacts_supplier_id_idx" ON "supplier_contacts"("supplier_id");

CREATE UNIQUE INDEX "branch_currencies_branch_id_currency_code_key" ON "branch_currencies"("branch_id", "currency_code");
CREATE INDEX "branch_currencies_tenant_id_idx" ON "branch_currencies"("tenant_id");
CREATE INDEX "branch_currencies_branch_id_idx" ON "branch_currencies"("branch_id");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_default_warehouse_branch_id_fkey" FOREIGN KEY ("default_warehouse_branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_photo_file_id_fkey" FOREIGN KEY ("photo_file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_group_id_fkey" FOREIGN KEY ("customer_group_id") REFERENCES "customer_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "supplier_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_branches" ADD CONSTRAINT "employee_branches_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_emergency_contacts" ADD CONSTRAINT "employee_emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_groups" ADD CONSTRAINT "customer_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_phones" ADD CONSTRAINT "customer_phones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_phones" ADD CONSTRAINT "customer_phones_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_buyback_history" ADD CONSTRAINT "customer_buyback_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_buyback_history" ADD CONSTRAINT "customer_buyback_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_trade_in_history" ADD CONSTRAINT "customer_trade_in_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_trade_in_history" ADD CONSTRAINT "customer_trade_in_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_categories" ADD CONSTRAINT "supplier_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "branch_currencies" ADD CONSTRAINT "branch_currencies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_currencies" ADD CONSTRAINT "branch_currencies_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
