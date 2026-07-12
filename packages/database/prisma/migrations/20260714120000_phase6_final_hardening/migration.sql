-- Phase 6 Final: Customer identity fields + exchange permissions foundation

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "national_id" VARCHAR(50);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "passport_number" VARCHAR(50);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "commercial_registration" VARCHAR(50);

-- Backfill national_id from legacy id_number when missing
UPDATE "customers"
SET "national_id" = "id_number"
WHERE "national_id" IS NULL AND "id_number" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_national_id_key"
  ON "customers"("tenant_id", "national_id")
  WHERE "national_id" IS NOT NULL AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "customers_tenant_id_passport_number_key"
  ON "customers"("tenant_id", "passport_number")
  WHERE "passport_number" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "customers_national_id_idx" ON "customers"("national_id");
CREATE INDEX IF NOT EXISTS "customers_passport_number_idx" ON "customers"("passport_number");
CREATE INDEX IF NOT EXISTS "customers_tax_number_idx" ON "customers"("tax_number");
CREATE INDEX IF NOT EXISTS "customers_commercial_registration_idx" ON "customers"("commercial_registration");
CREATE INDEX IF NOT EXISTS "customers_id_number_idx" ON "customers"("id_number");

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "exchange_rate_snapshot" JSONB;

ALTER TYPE "InventoryLockType" ADD VALUE IF NOT EXISTS 'SALE';
ALTER TYPE "InventoryLockType" ADD VALUE IF NOT EXISTS 'RESERVATION';
