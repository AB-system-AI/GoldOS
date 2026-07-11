-- Phase 5: Enterprise Inventory & Gold Operations Foundation

-- Extend enums
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'BUYBACK';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'TRADE_IN';
ALTER TYPE "StockMovementType" ADD VALUE IF NOT EXISTS 'MANUAL_CORRECTION';

ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';
ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "TransferStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TYPE "InventoryLifecycleStage" AS ENUM (
  'RECEIVED', 'AVAILABLE', 'RESERVED', 'WITH_SALES', 'PENDING_PAYMENT', 'SOLD',
  'RETURNED', 'TRANSFERRED', 'IN_TRANSIT', 'IN_WORKSHOP', 'REPAIR', 'MANUFACTURING',
  'BUYBACK', 'TRADE_IN', 'DAMAGED', 'LOST', 'ARCHIVED'
);

CREATE TYPE "InventoryLockType" AS ENUM ('STOCK_COUNT', 'TRANSFER', 'REPAIR', 'INVESTIGATION', 'MANUAL');
CREATE TYPE "InventoryApprovalType" AS ENUM ('ADJUSTMENT', 'WEIGHT_CHANGE', 'PRICE_CHANGE', 'TRANSFER', 'BUYBACK', 'TRADE_IN');
CREATE TYPE "InventoryApprovalStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "StockCountStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AdjustmentReasonCode" AS ENUM ('DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'SHRINKAGE', 'THEFT', 'OTHER');
CREATE TYPE "InventoryPriceType" AS ENUM ('PURCHASE_COST', 'GOLD_COST', 'MAKING_COST', 'STONE_COST', 'SELLING_PRICE', 'MANUAL_ADJUSTMENT');
CREATE TYPE "DiamondShape" AS ENUM ('ROUND', 'PRINCESS', 'CUSHION', 'OVAL', 'EMERALD', 'PEAR', 'MARQUISE', 'RADIANT', 'ASSCHER', 'HEART', 'OTHER');

-- Catalog extensions
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "collection_id" UUID;
CREATE INDEX IF NOT EXISTS "products_collection_id_idx" ON "products"("collection_id");
CREATE INDEX IF NOT EXISTS "products_barcode_idx" ON "products"("barcode");

ALTER TABLE "gold_items" ADD COLUMN IF NOT EXISTS "stone_weight" DECIMAL(12,4);
ALTER TABLE "gold_items" ADD COLUMN IF NOT EXISTS "gold_weight" DECIMAL(12,4);
ALTER TABLE "gold_items" ADD COLUMN IF NOT EXISTS "making_cost" DECIMAL(18,4);
ALTER TABLE "gold_items" ADD COLUMN IF NOT EXISTS "stone_cost" DECIMAL(18,4);
ALTER TABLE "gold_items" ADD COLUMN IF NOT EXISTS "labor_cost" DECIMAL(18,4);

ALTER TABLE "diamond_items" ADD COLUMN IF NOT EXISTS "shape" "DiamondShape";
ALTER TABLE "diamond_items" ADD COLUMN IF NOT EXISTS "lab" VARCHAR(50);
CREATE INDEX IF NOT EXISTS "diamond_items_certificate_number_idx" ON "diamond_items"("certificate_number");

-- Inventory item extensions
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "warehouse_zone_id" UUID;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "asset_id" VARCHAR(50);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "qr_code" VARCHAR(100);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "rfid_tag" VARCHAR(100);
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "lifecycle_stage" "InventoryLifecycleStage" NOT NULL DEFAULT 'RECEIVED';
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "supplier_id" UUID;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN NOT NULL DEFAULT false;

UPDATE "inventory_items" SET "asset_id" = "serial_number" WHERE "asset_id" IS NULL;
ALTER TABLE "inventory_items" ALTER COLUMN "asset_id" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_tenant_id_asset_id_key" ON "inventory_items"("tenant_id", "asset_id");
CREATE INDEX IF NOT EXISTS "inventory_items_warehouse_zone_id_idx" ON "inventory_items"("warehouse_zone_id");
CREATE INDEX IF NOT EXISTS "inventory_items_lifecycle_stage_idx" ON "inventory_items"("lifecycle_stage");
CREATE INDEX IF NOT EXISTS "inventory_items_qr_code_idx" ON "inventory_items"("qr_code");
CREATE INDEX IF NOT EXISTS "inventory_items_rfid_tag_idx" ON "inventory_items"("rfid_tag");

-- Stock movement extensions
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "branch_id" UUID;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "performed_by_id" UUID;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "device_id" UUID;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "previous_state" JSONB;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "new_state" JSONB;

UPDATE "stock_movements" sm SET "branch_id" = ii."branch_id"
FROM "inventory_items" ii WHERE sm."inventory_item_id" = ii."id" AND sm."branch_id" IS NULL;
ALTER TABLE "stock_movements" ALTER COLUMN "branch_id" SET NOT NULL;
CREATE INDEX IF NOT EXISTS "stock_movements_branch_id_idx" ON "stock_movements"("branch_id");

-- Transfer approval workflow
ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "requested_by_id" UUID;
ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "approved_by_id" UUID;
ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "rejected_by_id" UUID;
ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(6);
ALTER TABLE "transfers" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ(6);

-- Phase 5 tables
CREATE TABLE "collections" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "season" VARCHAR(50),
  "year" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_tags" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "color" VARCHAR(20),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_tag_assignments" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "product_tag_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_attributes" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "data_type" VARCHAR(20) NOT NULL DEFAULT 'STRING',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_attribute_values" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "attribute_id" UUID NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sku_sequences" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "prefix" VARCHAR(20) NOT NULL,
  "product_type" VARCHAR(30),
  "current_value" INTEGER NOT NULL DEFAULT 0,
  "pad_length" INTEGER NOT NULL DEFAULT 6,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "sku_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "warehouse_zones" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "aisle" VARCHAR(20),
  "rack" VARCHAR(20),
  "shelf" VARCHAR(20),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "warehouse_zones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_lifecycle_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "from_stage" "InventoryLifecycleStage" NOT NULL,
  "to_stage" "InventoryLifecycleStage" NOT NULL,
  "from_status" "InventoryStatus",
  "to_status" "InventoryStatus",
  "reason" TEXT,
  "performed_by_id" UUID,
  "branch_id" UUID,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "custody_events" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "employee_id" UUID,
  "action" VARCHAR(50) NOT NULL,
  "reason" TEXT,
  "previous_state" "InventoryLifecycleStage" NOT NULL,
  "new_state" "InventoryLifecycleStage" NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custody_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_locks" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "lock_type" "InventoryLockType" NOT NULL,
  "reason" TEXT,
  "reference_type" VARCHAR(50),
  "reference_id" UUID,
  "locked_by_id" UUID,
  "expires_at" TIMESTAMPTZ(6),
  "released_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "inventory_locks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_price_history" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "price_type" "InventoryPriceType" NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
  "reason" TEXT,
  "changed_by_id" UUID,
  "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_price_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_weight_history" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "gross_weight" DECIMAL(12,4),
  "net_weight" DECIMAL(12,4),
  "stone_weight" DECIMAL(12,4),
  "gold_weight" DECIMAL(12,4),
  "karat" "GoldKarat",
  "reason" TEXT,
  "measured_by_id" UUID,
  "measured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_weight_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_adjustments" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "adjustment_no" VARCHAR(30) NOT NULL,
  "reason_code" "AdjustmentReasonCode" NOT NULL,
  "status" "InventoryApprovalStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "requested_by_id" UUID,
  "approved_by_id" UUID,
  "approved_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_adjustment_lines" (
  "id" UUID NOT NULL,
  "adjustment_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "quantity_delta" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "inventory_adjustment_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_counts" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID NOT NULL,
  "count_no" VARCHAR(30) NOT NULL,
  "status" "StockCountStatus" NOT NULL DEFAULT 'DRAFT',
  "is_cycle_count" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_count_lines" (
  "id" UUID NOT NULL,
  "stock_count_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "expected_qty" INTEGER NOT NULL DEFAULT 1,
  "counted_qty" INTEGER,
  "variance" INTEGER,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "stock_count_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_approvals" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "approval_type" "InventoryApprovalType" NOT NULL,
  "status" "InventoryApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" UUID NOT NULL,
  "transfer_id" UUID,
  "adjustment_id" UUID,
  "requested_by_id" UUID,
  "approved_by_id" UUID,
  "rejected_by_id" UUID,
  "reason" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "inventory_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hardware_device_profiles" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "branch_id" UUID,
  "device_type" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "config" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "hardware_device_profiles_pkey" PRIMARY KEY ("id")
);

-- Unique constraints and indexes
CREATE UNIQUE INDEX "collections_tenant_id_code_key" ON "collections"("tenant_id", "code");
CREATE UNIQUE INDEX "product_tags_tenant_id_name_key" ON "product_tags"("tenant_id", "name");
CREATE UNIQUE INDEX "product_tag_assignments_product_id_tag_id_key" ON "product_tag_assignments"("product_id", "tag_id");
CREATE UNIQUE INDEX "product_attributes_tenant_id_code_key" ON "product_attributes"("tenant_id", "code");
CREATE UNIQUE INDEX "product_attribute_values_product_id_attribute_id_key" ON "product_attribute_values"("product_id", "attribute_id");
CREATE UNIQUE INDEX "sku_sequences_tenant_id_prefix_product_type_key" ON "sku_sequences"("tenant_id", "prefix", "product_type");
CREATE UNIQUE INDEX "warehouse_zones_tenant_id_branch_id_code_key" ON "warehouse_zones"("tenant_id", "branch_id", "code");
CREATE UNIQUE INDEX "inventory_adjustments_tenant_id_adjustment_no_key" ON "inventory_adjustments"("tenant_id", "adjustment_no");
CREATE UNIQUE INDEX "stock_counts_tenant_id_count_no_key" ON "stock_counts"("tenant_id", "count_no");
CREATE UNIQUE INDEX "hardware_device_profiles_tenant_id_name_key" ON "hardware_device_profiles"("tenant_id", "name");

-- Foreign keys (abbreviated - core relations)
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "collections" ADD CONSTRAINT "collections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_tag_assignments" ADD CONSTRAINT "product_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "product_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attributes" ADD CONSTRAINT "product_attributes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sku_sequences" ADD CONSTRAINT "sku_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_zone_id_fkey" FOREIGN KEY ("warehouse_zone_id") REFERENCES "warehouse_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "asset_lifecycle_events" ADD CONSTRAINT "asset_lifecycle_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset_lifecycle_events" ADD CONSTRAINT "asset_lifecycle_events_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_locks" ADD CONSTRAINT "inventory_locks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_locks" ADD CONSTRAINT "inventory_locks_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_price_history" ADD CONSTRAINT "inventory_price_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_price_history" ADD CONSTRAINT "inventory_price_history_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_weight_history" ADD CONSTRAINT "inventory_weight_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_weight_history" ADD CONSTRAINT "inventory_weight_history_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustment_lines" ADD CONSTRAINT "inventory_adjustment_lines_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "inventory_adjustments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustment_lines" ADD CONSTRAINT "inventory_adjustment_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_counts" ADD CONSTRAINT "stock_counts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "stock_count_lines_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_approvals" ADD CONSTRAINT "inventory_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_approvals" ADD CONSTRAINT "inventory_approvals_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inventory_approvals" ADD CONSTRAINT "inventory_approvals_adjustment_id_fkey" FOREIGN KEY ("adjustment_id") REFERENCES "inventory_adjustments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hardware_device_profiles" ADD CONSTRAINT "hardware_device_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hardware_device_profiles" ADD CONSTRAINT "hardware_device_profiles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
