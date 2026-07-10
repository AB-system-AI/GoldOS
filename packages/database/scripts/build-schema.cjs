/**
 * Writes the complete GoldOS Prisma schema (multi-file).
 * Run: node scripts/build-schema.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const PRISMA_DIR = path.join(__dirname, '..', 'prisma');

const files = {
  'schema.prisma': `// GoldOS — Production Database Schema (Phase 2)
// Multi-tenant enterprise SaaS for jewelry and gold retail

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
`,

  'enums.prisma': `// ─── Enums ───────────────────────────────────────────────────────────────────

enum TenantStatus {
  PROVISIONING
  TRIAL
  ACTIVE
  SUSPENDED
  CANCELLED
  ARCHIVED
}

enum OrganizationStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}

enum PlanInterval {
  MONTHLY
  QUARTERLY
  YEARLY
}

enum BranchType {
  SHOWROOM
  WORKSHOP
  WAREHOUSE
  VAULT
  OFFICE
  HEADQUARTERS
}

enum UserStatus {
  ACTIVE
  INACTIVE
  LOCKED
  PENDING_VERIFICATION
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
}

enum WorkshopStatus {
  ACTIVE
  INACTIVE
  MAINTENANCE
}

enum PartnerStatus {
  ACTIVE
  INACTIVE
  BLOCKED
}

enum ProductType {
  GOLD
  DIAMOND
  GEMSTONE
  WATCH
  SILVER
  ACCESSORY
  OTHER
}

enum ProductStatus {
  ACTIVE
  INACTIVE
  DISCONTINUED
}

enum InventoryStatus {
  AVAILABLE
  RESERVED
  SOLD
  IN_TRANSIT
  DAMAGED
  QUARANTINE
  RETURNED
}

enum StockMovementType {
  RECEIPT
  SALE
  TRANSFER_IN
  TRANSFER_OUT
  ADJUSTMENT
  RETURN
  RESERVATION
  RELEASE
  MANUFACTURING
  REPAIR
}

enum TransferStatus {
  DRAFT
  PENDING
  IN_TRANSIT
  RECEIVED
  CANCELLED
}

enum ReservationStatus {
  ACTIVE
  FULFILLED
  EXPIRED
  CANCELLED
}

enum PurchaseOrderStatus {
  DRAFT
  SUBMITTED
  APPROVED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
  CLOSED
}

enum SalesOrderStatus {
  DRAFT
  CONFIRMED
  PARTIALLY_FULFILLED
  FULFILLED
  INVOICED
  CANCELLED
  CLOSED
}

enum InvoiceType {
  SALE
  RETURN
  CREDIT_NOTE
  DEBIT_NOTE
  PROFORMA
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  COMPLETED
  VOIDED
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
  REFUNDED
  VOIDED
}

enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  CHEQUE
  MOBILE_WALLET
  GOLD_EXCHANGE
  STORE_CREDIT
  OTHER
}

enum ExpenseStatus {
  DRAFT
  APPROVED
  PAID
  REJECTED
  VOIDED
}

enum TransactionType {
  DEBIT
  CREDIT
  TRANSFER
  ADJUSTMENT
  FEE
  INTEREST
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
  REVERSED
}

enum CashRegisterStatus {
  OPEN
  CLOSED
  SUSPENDED
}

enum BankAccountType {
  CHECKING
  SAVINGS
  MERCHANT
  ESCROW
}

enum MakingChargeType {
  PER_GRAM
  FIXED
  PERCENTAGE
}

enum GoldKarat {
  K8
  K9
  K14
  K18
  K21
  K22
  K24
}

enum DiamondCut {
  ROUND
  PRINCESS
  CUSHION
  OVAL
  EMERALD
  PEAR
  MARQUISE
  RADIANT
  ASSCHER
  HEART
  OTHER
}

enum DiamondColor {
  D
  E
  F
  G
  H
  I
  J
  K
  L
  M
  FANCY
  OTHER
}

enum DiamondClarity {
  FL
  IF
  VVS1
  VVS2
  VS1
  VS2
  SI1
  SI2
  I1
  I2
  I3
  OTHER
}

enum GemstoneType {
  RUBY
  SAPPHIRE
  EMERALD
  PEARL
  TURQUOISE
  OPAL
  AMETHYST
  TOPAZ
  GARNET
  OTHER
}

enum ManufacturingOrderStatus {
  DRAFT
  SCHEDULED
  IN_PROGRESS
  QUALITY_CHECK
  COMPLETED
  CANCELLED
}

enum RepairOrderStatus {
  DRAFT
  RECEIVED
  DIAGNOSING
  IN_PROGRESS
  AWAITING_PARTS
  COMPLETED
  DELIVERED
  CANCELLED
}

enum CertificateType {
  GIA
  IGI
  HRD
  AGS
  LOCAL
  CUSTOM
  OTHER
}

enum CertificateStatus {
  ACTIVE
  EXPIRED
  REVOKED
  PENDING
}

enum AddressableType {
  ORGANIZATION
  BRANCH
  CUSTOMER
  SUPPLIER
  MANUFACTURER
  EMPLOYEE
  USER
}

enum NotificationChannel {
  IN_APP
  EMAIL
  SMS
  PUSH
  WEBHOOK
}

enum NotificationStatus {
  PENDING
  SENT
  DELIVERED
  FAILED
  READ
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  EXPORT
  IMPORT
  APPROVE
  VOID
  TRANSFER
  PAYMENT
  OTHER
}

enum WebhookStatus {
  ACTIVE
  INACTIVE
  FAILED
}

enum IntegrationProvider {
  ZATCA
  STRIPE
  QUICKBOOKS
  XERO
  SHOPIFY
  WHATSAPP
  SMS_GATEWAY
  GOLD_FEED
  CUSTOM
}

enum IntegrationStatus {
  ACTIVE
  INACTIVE
  ERROR
  PENDING_SETUP
}

enum FileStatus {
  UPLOADING
  ACTIVE
  ARCHIVED
  DELETED
}

enum MediaType {
  IMAGE
  VIDEO
  DOCUMENT
  AUDIO
  OTHER
}

enum BackupStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  EXPIRED
}

enum BackupType {
  FULL
  INCREMENTAL
  SCHEMA_ONLY
  DATA_ONLY
}

enum SettingScope {
  TENANT
  ORGANIZATION
  BRANCH
  USER
}

enum AiConversationStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum AiReportStatus {
  PENDING
  GENERATING
  COMPLETED
  FAILED
}

enum ApiKeyStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

enum DeviceType {
  POS
  TABLET
  MOBILE
  DESKTOP
  PRINTER
  SCANNER
  OTHER
}

enum SessionStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

enum PricingRuleType {
  GOLD_RATE
  MAKING_CHARGE
  DISCOUNT
  MARKUP
  BUNDLE
  CUSTOM
}

enum TaxRuleType {
  VAT
  SALES_TAX
  WITHHOLDING
  EXEMPT
  CUSTOM
}
`,

  'tenancy.prisma': `// ─── Tenancy & Subscriptions ─────────────────────────────────────────────────

model Tenant {
  id        String       @id @default(uuid()) @db.Uuid
  slug      String       @unique @db.VarChar(100)
  name      String       @db.VarChar(255)
  status    TenantStatus @default(PROVISIONING)
  timezone  String       @default("Asia/Riyadh") @db.VarChar(50)
  locale    String       @default("ar") @db.VarChar(10)
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime?    @map("deleted_at") @db.Timestamptz(6)

  organizations      Organization[]
  subscriptions      Subscription[]
  tenantSettings     TenantSetting[]
  users              User[]
  roles              Role[]
  branches           Branch[]
  employees          Employee[]
  workshops          Workshop[]
  customers          Customer[]
  suppliers          Supplier[]
  manufacturers      Manufacturer[]
  categories         Category[]
  brands             Brand[]
  products           Product[]
  inventoryItems     InventoryItem[]
  inventoryLots      InventoryLot[]
  stockMovements     StockMovement[]
  transfers          Transfer[]
  reservations       Reservation[]
  purchaseOrders     PurchaseOrder[]
  salesOrders        SalesOrder[]
  invoices           Invoice[]
  payments           Payment[]
  expenses           Expense[]
  cashRegisters      CashRegister[]
  banks              Bank[]
  transactions       Transaction[]
  exchangeRates      ExchangeRate[]
  goldPriceHistories GoldPriceHistory[]
  pricingRules       PricingRule[]
  taxRules           TaxRule[]
  manufacturingOrders ManufacturingOrder[]
  repairOrders       RepairOrder[]
  certificates       Certificate[]
  attachments        Attachment[]
  notifications      Notification[]
  auditLogs          AuditLog[]
  activityLogs       ActivityLog[]
  devices            Device[]
  sessions           Session[]
  apiKeys            ApiKey[]
  webhooks           Webhook[]
  integrations       Integration[]
  files              File[]
  media              Media[]
  backups            Backup[]
  settings           Setting[]
  addresses          Address[]
  aiConversations    AiConversation[]
  aiReports          AiReport[]

  @@index([status])
  @@index([deletedAt])
  @@map("tenants")
}

model Organization {
  id               String             @id @default(uuid()) @db.Uuid
  tenantId         String             @map("tenant_id") @db.Uuid
  name             String             @db.VarChar(255)
  legalName        String?            @map("legal_name") @db.VarChar(255)
  code             String             @db.VarChar(50)
  status           OrganizationStatus @default(ACTIVE)
  taxId            String?            @map("tax_id") @db.VarChar(50)
  commercialRegNo  String?            @map("commercial_reg_no") @db.VarChar(50)
  email            String?            @db.VarChar(255)
  phone            String?            @db.VarChar(30)
  website          String?            @db.VarChar(255)
  defaultCurrency  String             @default("SAR") @map("default_currency") @db.Char(3)
  logoFileId       String?            @map("logo_file_id") @db.Uuid
  metadata         Json               @default("{}")
  createdAt        DateTime           @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime           @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt        DateTime?          @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  logoFile File?  @relation(fields: [logoFileId], references: [id], onDelete: SetNull)
  branches Branch[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@index([status])
  @@map("organizations")
}

model Plan {
  id           String       @id @default(uuid()) @db.Uuid
  code         String       @unique @db.VarChar(50)
  name         String       @db.VarChar(100)
  description  String?      @db.Text
  interval     PlanInterval @default(MONTHLY)
  price        Decimal      @db.Decimal(18, 4)
  currency     String       @default("USD") @db.Char(3)
  maxUsers     Int          @default(5) @map("max_users")
  maxBranches  Int          @default(1) @map("max_branches")
  maxStorageGb Int          @default(10) @map("max_storage_gb")
  features     Json         @default("[]")
  isActive     Boolean      @default(true) @map("is_active")
  sortOrder    Int          @default(0) @map("sort_order")
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?    @map("deleted_at") @db.Timestamptz(6)

  subscriptions Subscription[]

  @@index([isActive])
  @@index([deletedAt])
  @@map("plans")
}

model Subscription {
  id                 String             @id @default(uuid()) @db.Uuid
  tenantId           String             @map("tenant_id") @db.Uuid
  planId             String             @map("plan_id") @db.Uuid
  status             SubscriptionStatus @default(TRIALING)
  currentPeriodStart DateTime           @map("current_period_start") @db.Timestamptz(6)
  currentPeriodEnd   DateTime           @map("current_period_end") @db.Timestamptz(6)
  trialEndsAt        DateTime?          @map("trial_ends_at") @db.Timestamptz(6)
  cancelledAt        DateTime?          @map("cancelled_at") @db.Timestamptz(6)
  externalId         String?            @map("external_id") @db.VarChar(255)
  metadata           Json               @default("{}")
  createdAt          DateTime           @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime           @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt          DateTime?          @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([planId])
  @@index([status])
  @@index([tenantId, deletedAt])
  @@map("subscriptions")
}

model TenantSetting {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  key       String   @db.VarChar(100)
  value     Json
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, key])
  @@index([tenantId])
  @@index([tenantId, deletedAt])
  @@map("tenant_settings")
}

model SystemSetting {
  id          String   @id @default(uuid()) @db.Uuid
  key         String   @unique @db.VarChar(100)
  value       Json
  description String?  @db.Text
  isPublic    Boolean  @default(false) @map("is_public")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  @@index([deletedAt])
  @@map("system_settings")
}
`,
};

// Continue in part 2 - I'll append to the script file
fs.mkdirSync(PRISMA_DIR, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(PRISMA_DIR, name), content, 'utf8');
  console.log(`wrote ${name}`);
}
