/**
 * GoldOS Phase 2 Enterprise Schema Extensions
 * Run: node packages/database/scripts/build-enterprise-schema.cjs
 */
const fs = require('node:fs');
const path = require('node:path');

const PRISMA_DIR = path.join(__dirname, '..', 'prisma');

function write(name, content) {
  fs.writeFileSync(path.join(PRISMA_DIR, name), content, 'utf8');
  console.log(`wrote ${name}`);
}

// ─── Enterprise Enums ────────────────────────────────────────────────────────

write(
  'enums-enterprise.prisma',
  `// ─── Enterprise Enums (Phase 2 Extension) ───────────────────────────────────

enum InvitationStatus {
  PENDING
  SENT
  DELIVERED
  OPENED
  ACCEPTED
  EXPIRED
  CANCELLED
  FAILED
}

enum InvitationSource {
  EMAIL
  SMS
  WHATSAPP
  MANUAL
}

enum InvitationAuditAction {
  CREATED
  SENT
  RESENT
  ACCEPTED
  CANCELLED
  EXPIRED
  FAILED
  TOKEN_USED
}

enum VerificationTokenStatus {
  PENDING
  VERIFIED
  EXPIRED
  REVOKED
}

enum LoginAttemptResult {
  SUCCESS
  FAILED
  BLOCKED
}

enum AccountLockReason {
  FAILED_ATTEMPTS
  ADMIN
  SECURITY
  SUBSCRIPTION
}

enum ProviderHealthStatus {
  HEALTHY
  DEGRADED
  UNHEALTHY
  OFFLINE
}

enum PriceSyncStatus {
  PENDING
  SUCCESS
  FAILED
  PARTIAL
}

enum AiAgentStatus {
  ACTIVE
  INACTIVE
  DEPRECATED
}

enum AiJobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum AiActionType {
  TOOL_CALL
  QUERY
  UPDATE
  CREATE
  DELETE
  ANALYSIS
}

enum AiFeedbackRating {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

enum SearchIndexStatus {
  ACTIVE
  STALE
  REINDEXING
}

enum BarcodeScanResult {
  FOUND
  NOT_FOUND
  ERROR
  DUPLICATE
}

enum PrintJobStatus {
  QUEUED
  PRINTING
  COMPLETED
  FAILED
  CANCELLED
}

enum FeatureFlagScope {
  GLOBAL
  TENANT
  PLAN
}

enum TimelineEventType {
  COMMENT
  STATUS_CHANGE
  ASSIGNMENT
  SYSTEM
  ATTACHMENT
  MENTION
}

enum RestoreJobStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

enum DeletedRecordStatus {
  DELETED
  RESTORING
  RESTORED
  PURGED
}

enum UsageMetricType {
  STORAGE
  EMPLOYEES
  BRANCHES
  API
  AI_CREDITS
  WHATSAPP
  SMS
  PUSH
}

enum GoldPriceOverrideType {
  MANUAL
  FORMULA
  SPREAD
}
`,
);

// ─── 1. Employee Invitations ─────────────────────────────────────────────────

write(
  'invitations.prisma',
  `// ─── Employee Invitation System ──────────────────────────────────────────────

model EmployeeInvitation {
  id            String           @id @default(uuid()) @db.Uuid
  tenantId      String           @map("tenant_id") @db.Uuid
  branchId      String?          @map("branch_id") @db.Uuid
  roleId        String?          @map("role_id") @db.Uuid
  email         String           @db.VarChar(255)
  phone         String?          @db.VarChar(30)
  firstName     String           @map("first_name") @db.VarChar(100)
  lastName      String           @map("last_name") @db.VarChar(100)
  jobTitle      String?          @map("job_title") @db.VarChar(100)
  status        InvitationStatus @default(PENDING)
  source        InvitationSource @default(EMAIL)
  createdById   String           @map("created_by_id") @db.Uuid
  acceptedById  String?          @map("accepted_by_id") @db.Uuid
  cancelledById String?          @map("cancelled_by_id") @db.Uuid
  employeeId    String?          @map("employee_id") @db.Uuid
  userId        String?          @map("user_id") @db.Uuid
  expiresAt     DateTime         @map("expires_at") @db.Timestamptz(6)
  acceptedAt    DateTime?        @map("accepted_at") @db.Timestamptz(6)
  cancelledAt   DateTime?        @map("cancelled_at") @db.Timestamptz(6)
  lastSentAt    DateTime?        @map("last_sent_at") @db.Timestamptz(6)
  resendCount   Int              @default(0) @map("resend_count")
  attemptCount  Int              @default(0) @map("attempt_count")
  maxAttempts   Int              @default(5) @map("max_attempts")
  metadata      Json             @default("{}")
  createdAt     DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?        @map("deleted_at") @db.Timestamptz(6)

  tenant      Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  branch      Branch?             @relation(fields: [branchId], references: [id], onDelete: SetNull)
  role        Role?               @relation(fields: [roleId], references: [id], onDelete: SetNull)
  createdBy   User                @relation("InvitationCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  acceptedBy  User?               @relation("InvitationAcceptedBy", fields: [acceptedById], references: [id], onDelete: SetNull)
  cancelledBy User?               @relation("InvitationCancelledBy", fields: [cancelledById], references: [id], onDelete: SetNull)
  employee    Employee?           @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  tokens      InvitationToken[]
  auditLogs   InvitationAuditLog[]

  @@index([tenantId])
  @@index([email])
  @@index([status])
  @@index([expiresAt])
  @@index([tenantId, deletedAt])
  @@map("employee_invitations")
}

model InvitationToken {
  id           String    @id @default(uuid()) @db.Uuid
  invitationId String    @map("invitation_id") @db.Uuid
  tokenHash    String    @map("token_hash") @db.VarChar(255)
  expiresAt    DateTime  @map("expires_at") @db.Timestamptz(6)
  usedAt       DateTime? @map("used_at") @db.Timestamptz(6)
  ipAddress    String?   @map("ip_address") @db.VarChar(45)
  userAgent    String?   @map("user_agent") @db.Text
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  invitation EmployeeInvitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  @@index([invitationId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("invitation_tokens")
}

model InvitationAuditLog {
  id            String                @id @default(uuid()) @db.Uuid
  tenantId      String                @map("tenant_id") @db.Uuid
  invitationId  String                @map("invitation_id") @db.Uuid
  action        InvitationAuditAction
  channel       InvitationSource?
  performedById String?               @map("performed_by_id") @db.Uuid
  ipAddress     String?               @map("ip_address") @db.VarChar(45)
  userAgent     String?               @map("user_agent") @db.Text
  metadata      Json                  @default("{}")
  createdAt     DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime              @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?             @map("deleted_at") @db.Timestamptz(6)

  tenant      Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  invitation  EmployeeInvitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)
  performedBy User?              @relation("InvitationAuditPerformer", fields: [performedById], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([invitationId])
  @@index([action])
  @@index([createdAt])
  @@map("invitation_audit_logs")
}
`,
);

// ─── 2. Authentication Preparation ─────────────────────────────────────────────

write(
  'auth-security.prisma',
  `// ─── Authentication & Security Preparation ─────────────────────────────────────

model PasswordResetToken {
  id        String                  @id @default(uuid()) @db.Uuid
  userId    String                  @map("user_id") @db.Uuid
  tokenHash String                  @map("token_hash") @db.VarChar(255)
  status    VerificationTokenStatus @default(PENDING)
  expiresAt DateTime                @map("expires_at") @db.Timestamptz(6)
  usedAt    DateTime?               @map("used_at") @db.Timestamptz(6)
  ipAddress String?                 @map("ip_address") @db.VarChar(45)
  createdAt DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime?               @map("deleted_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("password_reset_tokens")
}

model EmailVerificationToken {
  id        String                  @id @default(uuid()) @db.Uuid
  userId    String                  @map("user_id") @db.Uuid
  email     String                  @db.VarChar(255)
  tokenHash String                  @map("token_hash") @db.VarChar(255)
  status    VerificationTokenStatus @default(PENDING)
  expiresAt DateTime                @map("expires_at") @db.Timestamptz(6)
  verifiedAt DateTime?              @map("verified_at") @db.Timestamptz(6)
  createdAt DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime?               @map("deleted_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
  @@map("email_verification_tokens")
}

model PhoneVerificationToken {
  id         String                  @id @default(uuid()) @db.Uuid
  userId     String                  @map("user_id") @db.Uuid
  phone      String                  @db.VarChar(30)
  codeHash   String                  @map("code_hash") @db.VarChar(255)
  status     VerificationTokenStatus @default(PENDING)
  expiresAt  DateTime                @map("expires_at") @db.Timestamptz(6)
  verifiedAt DateTime?               @map("verified_at") @db.Timestamptz(6)
  attempts   Int                     @default(0)
  maxAttempts Int                    @default(5) @map("max_attempts")
  createdAt  DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime?               @map("deleted_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([phone])
  @@index([expiresAt])
  @@map("phone_verification_tokens")
}

model MfaRecoveryCode {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  codeHash  String    @map("code_hash") @db.VarChar(255)
  usedAt    DateTime? @map("used_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("mfa_recovery_codes")
}

model TrustedDevice {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  deviceId    String?   @map("device_id") @db.Uuid
  fingerprint String    @db.VarChar(255)
  name        String?   @db.VarChar(100)
  ipAddress   String?   @map("ip_address") @db.VarChar(45)
  userAgent   String?   @map("user_agent") @db.Text
  trustedAt   DateTime  @default(now()) @map("trusted_at") @db.Timestamptz(6)
  expiresAt   DateTime? @map("expires_at") @db.Timestamptz(6)
  lastUsedAt  DateTime? @map("last_used_at") @db.Timestamptz(6)
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  device Device? @relation(fields: [deviceId], references: [id], onDelete: SetNull)

  @@unique([userId, fingerprint])
  @@index([userId])
  @@index([deviceId])
  @@map("trusted_devices")
}

model LoginAttempt {
  id            String             @id @default(uuid()) @db.Uuid
  tenantId      String?            @map("tenant_id") @db.Uuid
  userId        String?            @map("user_id") @db.Uuid
  email         String?            @db.VarChar(255)
  result        LoginAttemptResult
  failureReason String?            @map("failure_reason") @db.VarChar(100)
  ipAddress     String?            @map("ip_address") @db.VarChar(45)
  userAgent     String?            @map("user_agent") @db.Text
  countryCode   String?            @map("country_code") @db.Char(2)
  city          String?            @db.VarChar(100)
  browser       String?            @db.VarChar(100)
  operatingSystem String?          @map("operating_system") @db.VarChar(100)
  deviceType    String?            @map("device_type") @db.VarChar(50)
  requestId     String?            @map("request_id") @db.VarChar(50)
  correlationId String?            @map("correlation_id") @db.VarChar(50)
  geo           Json?
  createdAt     DateTime           @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime           @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?          @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([userId])
  @@index([email])
  @@index([result])
  @@index([createdAt])
  @@map("login_attempts")
}

model FailedLoginHistory {
  id            String   @id @default(uuid()) @db.Uuid
  tenantId      String?  @map("tenant_id") @db.Uuid
  userId        String?  @map("user_id") @db.Uuid
  email         String?  @db.VarChar(255)
  failureReason String   @map("failure_reason") @db.VarChar(100)
  ipAddress     String?  @map("ip_address") @db.VarChar(45)
  userAgent     String?  @map("user_agent") @db.Text
  countryCode   String?  @map("country_code") @db.Char(2)
  city          String?  @db.VarChar(100)
  browser       String?  @db.VarChar(100)
  operatingSystem String? @map("operating_system") @db.VarChar(100)
  deviceType    String?  @map("device_type") @db.VarChar(50)
  requestId     String?  @map("request_id") @db.VarChar(50)
  correlationId String?  @map("correlation_id") @db.VarChar(50)
  geo           Json?
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([userId])
  @@index([email])
  @@index([createdAt])
  @@map("failed_login_history")
}

model AccountLock {
  id          String            @id @default(uuid()) @db.Uuid
  userId      String            @map("user_id") @db.Uuid
  reason      AccountLockReason
  lockedAt    DateTime          @default(now()) @map("locked_at") @db.Timestamptz(6)
  lockedUntil DateTime?         @map("locked_until") @db.Timestamptz(6)
  unlockedAt  DateTime?         @map("unlocked_at") @db.Timestamptz(6)
  lockedById  String?           @map("locked_by_id") @db.Uuid
  notes       String?           @db.Text
  createdAt   DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?         @map("deleted_at") @db.Timestamptz(6)

  user     User  @relation("AccountLockUser", fields: [userId], references: [id], onDelete: Cascade)
  lockedBy User? @relation("AccountLockAdmin", fields: [lockedById], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([lockedAt])
  @@map("account_locks")
}

model PasswordHistory {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  passwordHash String   @map("password_hash") @db.VarChar(255)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([createdAt])
  @@map("password_history")
}

model RememberedDevice {
  id             String    @id @default(uuid()) @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  deviceTokenHash String   @map("device_token_hash") @db.VarChar(255)
  name           String?   @db.VarChar(100)
  ipAddress      String?   @map("ip_address") @db.VarChar(45)
  userAgent      String?   @map("user_agent") @db.Text
  expiresAt      DateTime  @map("expires_at") @db.Timestamptz(6)
  lastUsedAt     DateTime? @map("last_used_at") @db.Timestamptz(6)
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([deviceTokenHash])
  @@index([expiresAt])
  @@map("remembered_devices")
}
`,
);

// ─── 3. Gold Price Engine ────────────────────────────────────────────────────

write(
  'gold-engine.prisma',
  `// ─── Gold Price Engine ───────────────────────────────────────────────────────

model GoldPriceProvider {
  id              String               @id @default(uuid()) @db.Uuid
  code            String               @unique @db.VarChar(50)
  name            String               @db.VarChar(100)
  baseUrl         String?              @map("base_url") @db.VarChar(500)
  apiKeyRequired  Boolean              @default(false) @map("api_key_required")
  priority        Int                  @default(0)
  healthStatus    ProviderHealthStatus @default(HEALTHY) @map("health_status")
  lastHealthCheck DateTime?            @map("last_health_check") @db.Timestamptz(6)
  failureCount    Int                  @default(0) @map("failure_count")
  isActive        Boolean              @default(true) @map("is_active")
  config          Json                 @default("{}")
  createdAt       DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?            @map("deleted_at") @db.Timestamptz(6)

  sources   GoldPriceSource[]
  syncLogs  GoldPriceSyncLog[]
  histories GoldPriceHistory[]

  @@index([isActive])
  @@index([priority])
  @@index([healthStatus])
  @@map("gold_price_providers")
}

model GoldPriceSource {
  id         String               @id @default(uuid()) @db.Uuid
  tenantId   String               @map("tenant_id") @db.Uuid
  providerId String               @map("provider_id") @db.Uuid
  name       String               @db.VarChar(100)
  priority   Int                  @default(0)
  isPrimary  Boolean              @default(false) @map("is_primary")
  isActive   Boolean              @default(true) @map("is_active")
  credentials Json                @default("{}")
  settings   Json                 @default("{}")
  createdAt  DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime?            @map("deleted_at") @db.Timestamptz(6)

  tenant     Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  provider   GoldPriceProvider @relation(fields: [providerId], references: [id], onDelete: Restrict)
  syncLogs   GoldPriceSyncLog[]
  cache      GoldPriceCache[]
  overrides  GoldPriceOverride[]
  histories  GoldPriceHistory[]

  @@unique([tenantId, providerId])
  @@index([tenantId])
  @@index([providerId])
  @@index([isPrimary])
  @@map("gold_price_sources")
}

model GoldPriceSyncLog {
  id           String          @id @default(uuid()) @db.Uuid
  tenantId     String?         @map("tenant_id") @db.Uuid
  providerId   String          @map("provider_id") @db.Uuid
  sourceId     String?         @map("source_id") @db.Uuid
  status       PriceSyncStatus @default(PENDING)
  recordsSynced Int            @default(0) @map("records_synced")
  errorMessage String?         @map("error_message") @db.Text
  errorDetails Json?           @map("error_details")
  startedAt    DateTime        @default(now()) @map("started_at") @db.Timestamptz(6)
  completedAt  DateTime?       @map("completed_at") @db.Timestamptz(6)
  durationMs   Int?            @map("duration_ms")
  createdAt    DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?       @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant?           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  provider GoldPriceProvider @relation(fields: [providerId], references: [id], onDelete: Restrict)
  source   GoldPriceSource?  @relation(fields: [sourceId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([providerId])
  @@index([status])
  @@index([startedAt])
  @@map("gold_price_sync_logs")
}

model GoldPriceCache {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  sourceId     String?   @map("source_id") @db.Uuid
  karat        GoldKarat
  pricePerGram Decimal   @map("price_per_gram") @db.Decimal(12, 4)
  currency     String    @default("SAR") @db.Char(3)
  fetchedAt    DateTime  @map("fetched_at") @db.Timestamptz(6)
  expiresAt    DateTime? @map("expires_at") @db.Timestamptz(6)
  isStale      Boolean   @default(false) @map("is_stale")
  metadata     Json      @default("{}")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  source GoldPriceSource? @relation(fields: [sourceId], references: [id], onDelete: SetNull)

  @@unique([tenantId, karat, currency])
  @@index([tenantId])
  @@index([fetchedAt])
  @@map("gold_price_cache")
}

model GoldPriceOverride {
  id           String                @id @default(uuid()) @db.Uuid
  tenantId     String                @map("tenant_id") @db.Uuid
  sourceId     String?               @map("source_id") @db.Uuid
  karat        GoldKarat
  overrideType GoldPriceOverrideType @default(MANUAL) @map("override_type")
  pricePerGram Decimal?              @map("price_per_gram") @db.Decimal(12, 4)
  spreadBps    Int?                  @map("spread_bps")
  currency     String                @default("SAR") @db.Char(3)
  reason       String?               @db.Text
  effectiveFrom DateTime             @map("effective_from") @db.Timestamptz(6)
  effectiveTo   DateTime?            @map("effective_to") @db.Timestamptz(6)
  isActive     Boolean               @default(true) @map("is_active")
  createdById  String?               @map("created_by_id") @db.Uuid
  createdAt    DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime              @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?             @map("deleted_at") @db.Timestamptz(6)

  tenant    Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  source    GoldPriceSource? @relation(fields: [sourceId], references: [id], onDelete: SetNull)
  createdBy User?            @relation("GoldPriceOverrideCreator", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([tenantId, karat, isActive])
  @@index([effectiveFrom])
  @@map("gold_price_overrides")
}

model GoldPricingFormula {
  id          String    @id @default(uuid()) @db.Uuid
  tenantId    String    @map("tenant_id") @db.Uuid
  code        String    @db.VarChar(50)
  name        String    @db.VarChar(150)
  description String?   @db.Text
  formula     Json
  variables   Json      @default("{}")
  isDefault   Boolean   @default(false) @map("is_default")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([isActive])
  @@map("gold_pricing_formulas")
}
`,
);

write(
  'currency-engine.prisma',
  `// ─── Currency / Exchange Rate Engine ─────────────────────────────────────────

model ExchangeRateProvider {
  id              String               @id @default(uuid()) @db.Uuid
  code            String               @unique @db.VarChar(50)
  name            String               @db.VarChar(100)
  baseUrl         String?              @map("base_url") @db.VarChar(500)
  apiKeyRequired  Boolean              @default(false) @map("api_key_required")
  priority        Int                  @default(0)
  healthStatus    ProviderHealthStatus @default(HEALTHY) @map("health_status")
  lastHealthCheck DateTime?            @map("last_health_check") @db.Timestamptz(6)
  failureCount    Int                  @default(0) @map("failure_count")
  isActive        Boolean              @default(true) @map("is_active")
  config          Json                 @default("{}")
  createdAt       DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?            @map("deleted_at") @db.Timestamptz(6)

  cache    ExchangeRateCache[]
  syncLogs ExchangeSyncLog[]
  rates    ExchangeRate[]

  @@index([isActive])
  @@index([priority])
  @@index([healthStatus])
  @@map("exchange_rate_providers")
}

model ExchangeRateCache {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String?  @map("tenant_id") @db.Uuid
  providerId   String   @map("provider_id") @db.Uuid
  currencyCode String   @map("currency_code") @db.Char(3)
  baseCurrency String   @default("SAR") @map("base_currency") @db.Char(3)
  rate         Decimal  @db.Decimal(18, 8)
  fetchedAt    DateTime @map("fetched_at") @db.Timestamptz(6)
  expiresAt    DateTime? @map("expires_at") @db.Timestamptz(6)
  isStale      Boolean  @default(false) @map("is_stale")
  metadata     Json     @default("{}")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant?              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  provider ExchangeRateProvider @relation(fields: [providerId], references: [id], onDelete: Restrict)

  @@unique([tenantId, providerId, currencyCode, baseCurrency])
  @@index([tenantId])
  @@index([providerId])
  @@index([fetchedAt])
  @@map("exchange_rate_cache")
}

model ExchangeSyncLog {
  id            String          @id @default(uuid()) @db.Uuid
  tenantId      String?         @map("tenant_id") @db.Uuid
  providerId    String          @map("provider_id") @db.Uuid
  status        PriceSyncStatus @default(PENDING)
  recordsSynced Int             @default(0) @map("records_synced")
  errorMessage  String?         @map("error_message") @db.Text
  errorDetails  Json?           @map("error_details")
  startedAt     DateTime        @default(now()) @map("started_at") @db.Timestamptz(6)
  completedAt   DateTime?       @map("completed_at") @db.Timestamptz(6)
  durationMs    Int?            @map("duration_ms")
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?       @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant?              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  provider ExchangeRateProvider @relation(fields: [providerId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([providerId])
  @@index([status])
  @@index([startedAt])
  @@map("exchange_sync_logs")
}
`,
);

write(
  'ai-enterprise.prisma',
  `// ─── AI Engine (Enterprise Extension) ──────────────────────────────────────

model AiAgent {
  id          String        @id @default(uuid()) @db.Uuid
  tenantId    String?       @map("tenant_id") @db.Uuid
  code        String        @db.VarChar(50)
  name        String        @db.VarChar(100)
  description String?       @db.Text
  model       String        @db.VarChar(100)
  status      AiAgentStatus @default(ACTIVE)
  systemPrompt String?      @map("system_prompt") @db.Text
  tools       Json          @default("[]")
  config      Json          @default("{}")
  isSystem    Boolean       @default(false) @map("is_system")
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?     @map("deleted_at") @db.Timestamptz(6)

  tenant        Tenant?          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  prompts       AiPrompt[]
  contexts      AiContext[]
  actions       AiAction[]
  usages        AiUsage[]
  tokens        AiToken[]
  feedbacks     AiFeedback[]
  jobs          AiJob[]
  conversations AiConversation[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([status])
  @@map("ai_agents")
}

model AiPrompt {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String?   @map("tenant_id") @db.Uuid
  agentId   String?   @map("agent_id") @db.Uuid
  code      String    @db.VarChar(50)
  name      String    @db.VarChar(150)
  template  String    @db.Text
  variables Json      @default("[]")
  version   Int       @default(1)
  isActive  Boolean   @default(true) @map("is_active")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant?  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  AiAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@unique([tenantId, code, version])
  @@index([tenantId])
  @@index([agentId])
  @@map("ai_prompts")
}

model AiContext {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  agentId    String?   @map("agent_id") @db.Uuid
  entityType String?   @map("entity_type") @db.VarChar(50)
  entityId   String?   @map("entity_id") @db.Uuid
  key        String    @db.VarChar(100)
  value      Json
  expiresAt  DateTime? @map("expires_at") @db.Timestamptz(6)
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  AiAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@unique([tenantId, key, entityType, entityId])
  @@index([tenantId])
  @@index([agentId])
  @@index([entityType, entityId])
  @@map("ai_context")
}

model AiAction {
  id             String       @id @default(uuid()) @db.Uuid
  tenantId       String       @map("tenant_id") @db.Uuid
  agentId        String?      @map("agent_id") @db.Uuid
  conversationId String?      @map("conversation_id") @db.Uuid
  userId         String?      @map("user_id") @db.Uuid
  actionType     AiActionType @map("action_type")
  toolName       String?      @map("tool_name") @db.VarChar(100)
  input          Json?
  output         Json?
  status         AiJobStatus  @default(COMPLETED)
  durationMs     Int?         @map("duration_ms")
  createdAt      DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime     @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt      DateTime?    @map("deleted_at") @db.Timestamptz(6)

  tenant       Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent        AiAgent?        @relation(fields: [agentId], references: [id], onDelete: SetNull)
  conversation AiConversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([agentId])
  @@index([conversationId])
  @@index([actionType])
  @@map("ai_actions")
}

model AiUsage {
  id               String   @id @default(uuid()) @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid
  agentId          String?  @map("agent_id") @db.Uuid
  userId           String?  @map("user_id") @db.Uuid
  model            String   @db.VarChar(100)
  promptTokens     Int      @default(0) @map("prompt_tokens")
  completionTokens Int      @default(0) @map("completion_tokens")
  totalTokens      Int      @default(0) @map("total_tokens")
  creditsUsed      Decimal  @default(0) @map("credits_used") @db.Decimal(12, 4)
  cost             Decimal? @db.Decimal(12, 6)
  currency         String?  @db.Char(3)
  periodStart      DateTime @map("period_start") @db.Timestamptz(6)
  periodEnd        DateTime @map("period_end") @db.Timestamptz(6)
  metadata         Json     @default("{}")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt        DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  AiAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([agentId])
  @@index([periodStart, periodEnd])
  @@map("ai_usage")
}

model AiToken {
  id             String    @id @default(uuid()) @db.Uuid
  tenantId       String    @map("tenant_id") @db.Uuid
  agentId        String?   @map("agent_id") @db.Uuid
  conversationId String?   @map("conversation_id") @db.Uuid
  tokenType      String    @map("token_type") @db.VarChar(20)
  count          Int
  model          String?   @db.VarChar(100)
  recordedAt     DateTime  @default(now()) @map("recorded_at") @db.Timestamptz(6)
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  AiAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([conversationId])
  @@index([recordedAt])
  @@map("ai_tokens")
}

model AiFeedback {
  id             String           @id @default(uuid()) @db.Uuid
  tenantId       String           @map("tenant_id") @db.Uuid
  agentId        String?          @map("agent_id") @db.Uuid
  conversationId String?          @map("conversation_id") @db.Uuid
  userId         String?          @map("user_id") @db.Uuid
  rating         AiFeedbackRating
  comment        String?          @db.Text
  metadata       Json             @default("{}")
  createdAt      DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt      DateTime?        @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  AiAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([agentId])
  @@index([rating])
  @@map("ai_feedback")
}

model AiJob {
  id          String      @id @default(uuid()) @db.Uuid
  tenantId    String      @map("tenant_id") @db.Uuid
  agentId     String?     @map("agent_id") @db.Uuid
  jobType     String      @map("job_type") @db.VarChar(50)
  status      AiJobStatus @default(PENDING)
  priority    Int         @default(0)
  payload     Json        @default("{}")
  result      Json?
  errorMessage String?    @map("error_message") @db.Text
  scheduledAt DateTime?   @map("scheduled_at") @db.Timestamptz(6)
  startedAt   DateTime?   @map("started_at") @db.Timestamptz(6)
  completedAt DateTime?   @map("completed_at") @db.Timestamptz(6)
  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?   @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent  AiAgent? @relation(fields: [agentId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([agentId])
  @@index([status])
  @@index([scheduledAt])
  @@map("ai_jobs")
}
`,
);

// ─── 6-14: Dashboard, Search, Barcode, Printing, Features, Subscription, Timeline, Recycle ─

write(
  'dashboard.prisma',
  `// ─── Dashboard ───────────────────────────────────────────────────────────────

model DashboardLayout {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  userId    String?   @map("user_id") @db.Uuid
  code      String    @db.VarChar(50)
  name      String    @db.VarChar(100)
  layout    Json      @default("{}")
  isDefault Boolean   @default(false) @map("is_default")
  isShared  Boolean   @default(false) @map("is_shared")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant  Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  widgets DashboardWidget[]

  @@unique([tenantId, userId, code])
  @@index([tenantId])
  @@index([userId])
  @@map("dashboard_layouts")
}

model DashboardWidget {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  layoutId  String    @map("layout_id") @db.Uuid
  widgetType String   @map("widget_type") @db.VarChar(50)
  title     String    @db.VarChar(100)
  config    Json      @default("{}")
  position  Json      @default("{}")
  size      Json      @default("{}")
  isVisible Boolean   @default(true) @map("is_visible")
  sortOrder Int       @default(0) @map("sort_order")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  layout DashboardLayout @relation(fields: [layoutId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([layoutId])
  @@map("dashboard_widgets")
}

model DashboardPreference {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  key       String   @db.VarChar(100)
  value     Json
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, key])
  @@index([tenantId])
  @@index([userId])
  @@map("dashboard_preferences")
}
`,
);

write(
  'search.prisma',
  `// ─── Search Engine ───────────────────────────────────────────────────────────

model SavedSearch {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  name       String    @db.VarChar(100)
  entityType String    @map("entity_type") @db.VarChar(50)
  query      String    @db.Text
  filters    Json      @default("{}")
  isPinned   Boolean   @default(false) @map("is_pinned")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
  @@index([entityType])
  @@map("saved_searches")
}

model RecentSearch {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  entityType String?  @map("entity_type") @db.VarChar(50)
  query      String   @db.Text
  resultCount Int?    @map("result_count")
  searchedAt DateTime @default(now()) @map("searched_at") @db.Timestamptz(6)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
  @@index([searchedAt])
  @@map("recent_searches")
}

model GlobalSearchIndex {
  id          String            @id @default(uuid()) @db.Uuid
  tenantId    String            @map("tenant_id") @db.Uuid
  entityType  String            @map("entity_type") @db.VarChar(50)
  entityId    String            @map("entity_id") @db.Uuid
  title       String            @db.VarChar(255)
  subtitle    String?           @db.VarChar(255)
  content     String            @db.Text
  keywords    String[]          @default([])
  status      SearchIndexStatus @default(ACTIVE)
  indexedAt   DateTime          @map("indexed_at") @db.Timestamptz(6)
  metadata    Json              @default("{}")
  createdAt   DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?         @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, entityType, entityId])
  @@index([tenantId])
  @@index([entityType])
  @@index([status])
  @@map("global_search_index")
}
`,
);

write(
  'barcode.prisma',
  `// ─── Barcode / QR ────────────────────────────────────────────────────────────

model BarcodeTemplate {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  code       String    @db.VarChar(50)
  name       String    @db.VarChar(100)
  format     String    @db.VarChar(30)
  entityType String?   @map("entity_type") @db.VarChar(50)
  template   Json      @default("{}")
  isDefault  Boolean   @default(false) @map("is_default")
  isActive   Boolean   @default(true) @map("is_active")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  scans  BarcodeScan[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@map("barcode_templates")
}

model BarcodeScan {
  id           String           @id @default(uuid()) @db.Uuid
  tenantId     String           @map("tenant_id") @db.Uuid
  templateId   String?          @map("template_id") @db.Uuid
  branchId     String?          @map("branch_id") @db.Uuid
  userId       String?          @map("user_id") @db.Uuid
  barcodeValue String           @map("barcode_value") @db.VarChar(255)
  result       BarcodeScanResult
  entityType   String?          @map("entity_type") @db.VarChar(50)
  entityId     String?          @map("entity_id") @db.Uuid
  deviceId     String?          @map("device_id") @db.Uuid
  scannedAt    DateTime         @default(now()) @map("scanned_at") @db.Timestamptz(6)
  metadata     Json             @default("{}")
  createdAt    DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime?        @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  template BarcodeTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  branch   Branch?          @relation(fields: [branchId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([barcodeValue])
  @@index([scannedAt])
  @@map("barcode_scans")
}

model QrCode {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  code       String    @db.VarChar(100)
  entityType String    @map("entity_type") @db.VarChar(50)
  entityId   String    @map("entity_id") @db.Uuid
  payload    Json      @default("{}")
  imageUrl   String?   @map("image_url") @db.VarChar(500)
  isActive   Boolean   @default(true) @map("is_active")
  expiresAt  DateTime? @map("expires_at") @db.Timestamptz(6)
  scanCount  Int       @default(0) @map("scan_count")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([entityType, entityId])
  @@map("qr_codes")
}
`,
);

write(
  'printing.prisma',
  `// ─── Printing ────────────────────────────────────────────────────────────────

model ThermalPrinter {
  id           String    @id @default(uuid()) @db.Uuid
  tenantId     String    @map("tenant_id") @db.Uuid
  branchId     String?   @map("branch_id") @db.Uuid
  name         String    @db.VarChar(100)
  model        String?   @db.VarChar(100)
  connection   String    @db.VarChar(50)
  address      String?   @db.VarChar(255)
  isDefault    Boolean   @default(false) @map("is_default")
  isActive     Boolean   @default(true) @map("is_active")
  paperWidthMm Int       @default(80) @map("paper_width_mm")
  metadata     Json      @default("{}")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  branch   Branch?          @relation(fields: [branchId], references: [id], onDelete: SetNull)
  profiles PrinterProfile[]
  jobs     PrintJob[]

  @@index([tenantId])
  @@index([branchId])
  @@map("thermal_printers")
}

model PrinterProfile {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  printerId String    @map("printer_id") @db.Uuid
  code      String    @db.VarChar(50)
  name      String    @db.VarChar(100)
  settings  Json      @default("{}")
  isDefault Boolean   @default(false) @map("is_default")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant  Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  printer ThermalPrinter @relation(fields: [printerId], references: [id], onDelete: Cascade)
  jobs    PrintJob[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@index([printerId])
  @@map("printer_profiles")
}

model PrintJob {
  id          String         @id @default(uuid()) @db.Uuid
  tenantId    String         @map("tenant_id") @db.Uuid
  printerId   String?        @map("printer_id") @db.Uuid
  profileId   String?        @map("profile_id") @db.Uuid
  templateId  String?        @map("template_id") @db.Uuid
  userId      String?        @map("user_id") @db.Uuid
  entityType  String?        @map("entity_type") @db.VarChar(50)
  entityId    String?        @map("entity_id") @db.Uuid
  status      PrintJobStatus @default(QUEUED)
  copies      Int            @default(1)
  payload     Json           @default("{}")
  errorMessage String?       @map("error_message") @db.Text
  queuedAt    DateTime       @default(now()) @map("queued_at") @db.Timestamptz(6)
  printedAt   DateTime?      @map("printed_at") @db.Timestamptz(6)
  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?      @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  printer  ThermalPrinter? @relation(fields: [printerId], references: [id], onDelete: SetNull)
  profile  PrinterProfile? @relation(fields: [profileId], references: [id], onDelete: SetNull)
  template PrintTemplate?  @relation(fields: [templateId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([status])
  @@index([queuedAt])
  @@map("print_jobs")
}

model PrintTemplate {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  code       String    @db.VarChar(50)
  name       String    @db.VarChar(100)
  entityType String?   @map("entity_type") @db.VarChar(50)
  format     String    @default("THERMAL") @db.VarChar(30)
  template   Json      @default("{}")
  isDefault  Boolean   @default(false) @map("is_default")
  isActive   Boolean   @default(true) @map("is_active")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  jobs   PrintJob[]

  @@unique([tenantId, code])
  @@index([tenantId])
  @@map("print_templates")
}
`,
);

write(
  'feature-flags.prisma',
  `// ─── Feature Flags & Module Configuration ────────────────────────────────────

model FeatureFlag {
  id          String           @id @default(uuid()) @db.Uuid
  code        String           @unique @db.VarChar(100)
  name        String           @db.VarChar(150)
  description String?          @db.Text
  scope       FeatureFlagScope @default(GLOBAL)
  defaultValue Boolean         @default(false) @map("default_value")
  metadata    Json             @default("{}")
  isActive    Boolean          @default(true) @map("is_active")
  createdAt   DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?        @map("deleted_at") @db.Timestamptz(6)

  tenantFeatures TenantFeature[]

  @@index([isActive])
  @@map("feature_flags")
}

model TenantFeature {
  id        String    @id @default(uuid()) @db.Uuid
  tenantId  String    @map("tenant_id") @db.Uuid
  flagId    String    @map("flag_id") @db.Uuid
  enabled   Boolean   @default(false)
  value     Json?
  expiresAt DateTime? @map("expires_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  flag   FeatureFlag @relation(fields: [flagId], references: [id], onDelete: Cascade)

  @@unique([tenantId, flagId])
  @@index([tenantId])
  @@index([flagId])
  @@map("tenant_features")
}

model ModuleConfiguration {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  module    String   @db.VarChar(50)
  key       String   @db.VarChar(100)
  value     Json
  isEnabled Boolean  @default(true) @map("is_enabled")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, module, key])
  @@index([tenantId])
  @@index([module])
  @@map("module_configuration")
}
`,
);

write(
  'subscription-usage.prisma',
  `// ─── Subscription Usage & Overage ──────────────────────────────────────────────

model SubscriptionUsage {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @map("tenant_id") @db.Uuid
  subscriptionId      String   @map("subscription_id") @db.Uuid
  periodStart         DateTime @map("period_start") @db.Timestamptz(6)
  periodEnd           DateTime @map("period_end") @db.Timestamptz(6)
  storageUsedGb       Decimal  @default(0) @map("storage_used_gb") @db.Decimal(12, 4)
  employeeCount       Int      @default(0) @map("employee_count")
  branchCount         Int      @default(0) @map("branch_count")
  apiCalls            Int      @default(0) @map("api_calls")
  aiCreditsUsed       Decimal  @default(0) @map("ai_credits_used") @db.Decimal(12, 4)
  whatsappCreditsUsed Decimal  @default(0) @map("whatsapp_credits_used") @db.Decimal(12, 4)
  smsCreditsUsed      Decimal  @default(0) @map("sms_credits_used") @db.Decimal(12, 4)
  pushCreditsUsed     Decimal  @default(0) @map("push_credits_used") @db.Decimal(12, 4)
  metadata            Json     @default("{}")
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt           DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant       Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  subscription Subscription       @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  overages     SubscriptionOverage[]

  @@unique([subscriptionId, periodStart])
  @@index([tenantId])
  @@index([periodStart, periodEnd])
  @@map("subscription_usages")
}

model SubscriptionOverage {
  id            String          @id @default(uuid()) @db.Uuid
  tenantId      String          @map("tenant_id") @db.Uuid
  usageId       String          @map("usage_id") @db.Uuid
  metric        UsageMetricType
  limitValue    Decimal         @map("limit_value") @db.Decimal(18, 4)
  usedValue     Decimal         @map("used_value") @db.Decimal(18, 4)
  overageAmount Decimal         @map("overage_amount") @db.Decimal(18, 4)
  unitPrice     Decimal?        @map("unit_price") @db.Decimal(12, 6)
  currency      String          @default("USD") @db.Char(3)
  billedAt      DateTime?       @map("billed_at") @db.Timestamptz(6)
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt     DateTime?       @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  usage  SubscriptionUsage @relation(fields: [usageId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([usageId])
  @@index([metric])
  @@map("subscription_overages")
}
`,
);

write(
  'timeline.prisma',
  `// ─── Activity Timeline ───────────────────────────────────────────────────────

model ActivityTimeline {
  id          String            @id @default(uuid()) @db.Uuid
  tenantId    String            @map("tenant_id") @db.Uuid
  userId      String?           @map("user_id") @db.Uuid
  eventType   TimelineEventType @map("event_type")
  entityType  String            @map("entity_type") @db.VarChar(50)
  entityId    String            @map("entity_id") @db.Uuid
  title       String            @db.VarChar(255)
  description String?           @db.Text
  metadata    Json              @default("{}")
  occurredAt  DateTime          @default(now()) @map("occurred_at") @db.Timestamptz(6)
  createdAt   DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime?         @map("deleted_at") @db.Timestamptz(6)

  tenant      Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  comments    TimelineComment[]
  attachments TimelineAttachment[]

  @@index([tenantId])
  @@index([entityType, entityId])
  @@index([occurredAt])
  @@map("activity_timeline")
}

model TimelineComment {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  timelineId String    @map("timeline_id") @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  body       String    @db.Text
  isInternal Boolean   @default(false) @map("is_internal")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  timeline ActivityTimeline @relation(fields: [timelineId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([timelineId])
  @@map("timeline_comments")
}

model TimelineAttachment {
  id         String    @id @default(uuid()) @db.Uuid
  tenantId   String    @map("tenant_id") @db.Uuid
  timelineId String    @map("timeline_id") @db.Uuid
  fileId     String    @map("file_id") @db.Uuid
  label      String?   @db.VarChar(100)
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  timeline ActivityTimeline @relation(fields: [timelineId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([timelineId])
  @@index([fileId])
  @@map("timeline_attachments")
}
`,
);

write(
  'recycle-bin.prisma',
  `// ─── Recycle Bin ───────────────────────────────────────────────────────────────

model DeletedRecord {
  id             String              @id @default(uuid()) @db.Uuid
  tenantId       String              @map("tenant_id") @db.Uuid
  entityType     String              @map("entity_type") @db.VarChar(50)
  entityId       String              @map("entity_id") @db.Uuid
  status         DeletedRecordStatus @default(DELETED)
  snapshot       Json
  deletedById    String?             @map("deleted_by_id") @db.Uuid
  deletedAt      DateTime            @default(now()) @map("deleted_at") @db.Timestamptz(6)
  restoredAt     DateTime?           @map("restored_at") @db.Timestamptz(6)
  purgedAt       DateTime?           @map("purged_at") @db.Timestamptz(6)
  retentionUntil DateTime?           @map("retention_until") @db.Timestamptz(6)
  metadata       Json                @default("{}")
  createdAt      DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime            @updatedAt @map("updated_at") @db.Timestamptz(6)

  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  restoreJobs RestoreJob[]

  @@unique([tenantId, entityType, entityId])
  @@index([tenantId])
  @@index([status])
  @@index([deletedAt])
  @@map("deleted_records")
}

model RestoreJob {
  id              String            @id @default(uuid()) @db.Uuid
  tenantId        String            @map("tenant_id") @db.Uuid
  deletedRecordId String            @map("deleted_record_id") @db.Uuid
  requestedById   String?           @map("requested_by_id") @db.Uuid
  status          RestoreJobStatus  @default(PENDING)
  errorMessage    String?           @map("error_message") @db.Text
  startedAt       DateTime?         @map("started_at") @db.Timestamptz(6)
  completedAt     DateTime?         @map("completed_at") @db.Timestamptz(6)
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime?         @map("deleted_at") @db.Timestamptz(6)

  tenant        Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  deletedRecord DeletedRecord @relation(fields: [deletedRecordId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([deletedRecordId])
  @@index([status])
  @@map("restore_jobs")
}
`,
);

// ─── Patch existing models ───────────────────────────────────────────────────

function patchFile(filename, patches) {
  const filePath = path.join(PRISMA_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [search, replace] of patches) {
    if (!content.includes(search)) {
      console.warn(`WARN: patch anchor not found in ${filename}: ${search.slice(0, 60)}...`);
    } else {
      content = content.replace(search, replace);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`patched ${filename}`);
}

const TENANT_RELATIONS = `
  employeeInvitations   EmployeeInvitation[]
  invitationAuditLogs   InvitationAuditLog[]
  loginAttempts         LoginAttempt[]
  failedLoginHistory    FailedLoginHistory[]
  goldPriceSources      GoldPriceSource[]
  goldPriceSyncLogs     GoldPriceSyncLog[]
  goldPriceCache        GoldPriceCache[]
  goldPriceOverrides    GoldPriceOverride[]
  goldPricingFormulas   GoldPricingFormula[]
  exchangeRateCache     ExchangeRateCache[]
  exchangeSyncLogs      ExchangeSyncLog[]
  aiAgents              AiAgent[]
  aiPrompts             AiPrompt[]
  aiContexts            AiContext[]
  aiActions             AiAction[]
  aiUsages              AiUsage[]
  aiTokens              AiToken[]
  aiFeedbacks           AiFeedback[]
  aiJobs                AiJob[]
  dashboardLayouts      DashboardLayout[]
  dashboardWidgets      DashboardWidget[]
  dashboardPreferences  DashboardPreference[]
  savedSearches         SavedSearch[]
  recentSearches        RecentSearch[]
  globalSearchIndex     GlobalSearchIndex[]
  barcodeTemplates      BarcodeTemplate[]
  barcodeScans          BarcodeScan[]
  qrCodes               QrCode[]
  thermalPrinters       ThermalPrinter[]
  printerProfiles       PrinterProfile[]
  printJobs             PrintJob[]
  printTemplates        PrintTemplate[]
  tenantFeatures        TenantFeature[]
  moduleConfigurations  ModuleConfiguration[]
  subscriptionUsages    SubscriptionUsage[]
  subscriptionOverages  SubscriptionOverage[]
  activityTimelines     ActivityTimeline[]
  timelineComments      TimelineComment[]
  timelineAttachments   TimelineAttachment[]
  deletedRecords        DeletedRecord[]
  restoreJobs           RestoreJob[]`;

patchFile('tenancy.prisma', [
  [
    '  aiConversations    AiConversation[]\n  aiReports          AiReport[]',
    `  aiConversations    AiConversation[]\n  aiReports          AiReport[]${TENANT_RELATIONS}`,
  ],
  [
    `  maxStorageGb Int          @default(10) @map("max_storage_gb")
  features     Json         @default("[]")`,
    `  maxStorageGb Int          @default(10) @map("max_storage_gb")
  maxEmployees Int          @default(5) @map("max_employees")
  maxApiCalls  Int          @default(10000) @map("max_api_calls")
  maxAiCredits Decimal      @default(0) @map("max_ai_credits") @db.Decimal(12, 4)
  maxWhatsappCredits Decimal @default(0) @map("max_whatsapp_credits") @db.Decimal(12, 4)
  maxSmsCredits Decimal     @default(0) @map("max_sms_credits") @db.Decimal(12, 4)
  maxPushCredits Decimal    @default(0) @map("max_push_credits") @db.Decimal(12, 4)
  features     Json         @default("[]")`,
  ],
  [
    '  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)\n  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Restrict)\n\n  @@index([tenantId])',
    `  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Restrict)
  usages SubscriptionUsage[]

  @@index([tenantId])`,
  ],
]);

patchFile('auth.prisma', [
  [
    '  auditLogs    AuditLog[]\n  activityLogs ActivityLog[]',
    `  auditLogs    AuditLog[]
  activityLogs ActivityLog[]
  invitationsCreated    EmployeeInvitation[] @relation("InvitationCreatedBy")
  invitationsAccepted   EmployeeInvitation[] @relation("InvitationAcceptedBy")
  invitationsCancelled  EmployeeInvitation[] @relation("InvitationCancelledBy")
  invitationAudits      InvitationAuditLog[] @relation("InvitationAuditPerformer")
  passwordResetTokens   PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]
  phoneVerificationTokens PhoneVerificationToken[]
  mfaRecoveryCodes      MfaRecoveryCode[]
  trustedDevices        TrustedDevice[]
  loginAttempts         LoginAttempt[]
  failedLoginHistory    FailedLoginHistory[]
  accountLocks          AccountLock[] @relation("AccountLockUser")
  accountLocksAdmin     AccountLock[] @relation("AccountLockAdmin")
  passwordHistory       PasswordHistory[]
  rememberedDevices     RememberedDevice[]
  goldPriceOverrides    GoldPriceOverride[] @relation("GoldPriceOverrideCreator")`,
  ],
  [
    '  sessions Session[]\n\n  @@unique([tenantId, identifier])',
    `  sessions Session[]
  trustedDevices TrustedDevice[]

  @@unique([tenantId, identifier])`,
  ],
]);

patchFile('organization.prisma', [
  [
    '  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)\n\n  @@unique([tenantId, employeeNo])',
    `  user        User?                @relation(fields: [userId], references: [id], onDelete: SetNull)
  invitations EmployeeInvitation[]

  @@unique([tenantId, employeeNo])`,
  ],
  ['model Branch {', 'model Branch {'],
]);

// Patch Branch for barcode and printing relations - find Branch model end relations
patchFile('organization.prisma', [
  [
    '  devices      Device[]\n\n  @@index([tenantId])',
    `  devices         Device[]
  barcodeScans    BarcodeScan[]
  thermalPrinters ThermalPrinter[]

  @@index([tenantId])`,
  ],
]);

patchFile('auth.prisma', [
  [
    '  users           User[]\n  rolePermissions RolePermission[]',
    `  users           User[]
  rolePermissions RolePermission[]
  invitations     EmployeeInvitation[]`,
  ],
]);

patchFile('system.prisma', [
  [
    `  requestId  String?     @map("request_id") @db.VarChar(50)
  createdAt  DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)`,
    `  requestId     String?  @map("request_id") @db.VarChar(50)
  correlationId String?  @map("correlation_id") @db.VarChar(50)
  countryCode   String?  @map("country_code") @db.Char(2)
  city          String?  @db.VarChar(100)
  browser       String?  @db.VarChar(100)
  operatingSystem String? @map("operating_system") @db.VarChar(100)
  deviceType    String?  @map("device_type") @db.VarChar(50)
  geo           Json?
  createdAt  DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)`,
  ],
  [
    `  metadata   Json      @default("{}")
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([userId])
  @@index([createdAt])
  @@map("activity_logs")`,
    `  metadata        Json      @default("{}")
  ipAddress       String?   @map("ip_address") @db.VarChar(45)
  userAgent       String?   @map("user_agent") @db.Text
  requestId       String?   @map("request_id") @db.VarChar(50)
  correlationId   String?   @map("correlation_id") @db.VarChar(50)
  countryCode     String?   @map("country_code") @db.Char(2)
  city            String?   @db.VarChar(100)
  browser         String?   @db.VarChar(100)
  operatingSystem String?   @map("operating_system") @db.VarChar(100)
  deviceType      String?   @map("device_type") @db.VarChar(50)
  geo             Json?
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([userId])
  @@index([createdAt])
  @@map("activity_logs")`,
  ],
]);

patchFile('finance.prisma', [
  [
    `  source       String?  @db.VarChar(50)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant?  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  currency Currency @relation(fields: [currencyId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([currencyId])
  @@index([effectiveAt])
  @@map("exchange_rates")`,
    `  source       String?  @db.VarChar(50)
  providerId   String?  @map("provider_id") @db.Uuid
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant?              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  currency Currency             @relation(fields: [currencyId], references: [id], onDelete: Restrict)
  provider ExchangeRateProvider? @relation(fields: [providerId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([currencyId])
  @@index([providerId])
  @@index([effectiveAt])
  @@map("exchange_rates")`,
  ],
  [
    `  source      String    @db.VarChar(50)
  effectiveAt DateTime  @map("effective_at") @db.Timestamptz(6)
  isCurrent   Boolean   @default(false) @map("is_current")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, karat, isCurrent])
  @@index([effectiveAt])
  @@map("gold_price_history")`,
    `  source      String    @db.VarChar(50)
  providerId  String?   @map("provider_id") @db.Uuid
  sourceId    String?   @map("source_id") @db.Uuid
  effectiveAt DateTime  @map("effective_at") @db.Timestamptz(6)
  isCurrent   Boolean   @default(false) @map("is_current")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant   Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  provider GoldPriceProvider? @relation(fields: [providerId], references: [id], onDelete: SetNull)
  priceSource GoldPriceSource? @relation(fields: [sourceId], references: [id], onDelete: SetNull)

  @@index([tenantId, karat, isCurrent])
  @@index([providerId])
  @@index([sourceId])
  @@index([effectiveAt])
  @@map("gold_price_history")`,
  ],
]);

patchFile('ai.prisma', [
  [
    `  tenantId  String               @map("tenant_id") @db.Uuid
  userId    String?              @map("user_id") @db.Uuid
  title     String?              @db.VarChar(255)
  status    AiConversationStatus @default(ACTIVE)`,
    `  tenantId  String               @map("tenant_id") @db.Uuid
  userId    String?              @map("user_id") @db.Uuid
  agentId   String?              @map("agent_id") @db.Uuid
  title     String?              @db.VarChar(255)
  status    AiConversationStatus @default(ACTIVE)`,
  ],
  [
    `  tenant  Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  reports AiReport[]

  @@index([tenantId])
  @@index([userId])
  @@index([status])
  @@map("ai_conversations")`,
    `  tenant  Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  agent   AiAgent?   @relation(fields: [agentId], references: [id], onDelete: SetNull)
  reports AiReport[]
  actions AiAction[]

  @@index([tenantId])
  @@index([userId])
  @@index([agentId])
  @@index([status])
  @@map("ai_conversations")`,
  ],
]);

console.log('Enterprise schema extension complete.');
