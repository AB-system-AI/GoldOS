-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "InvitationSource" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvitationAuditAction" AS ENUM ('CREATED', 'SENT', 'RESENT', 'ACCEPTED', 'CANCELLED', 'EXPIRED', 'FAILED', 'TOKEN_USED');

-- CreateEnum
CREATE TYPE "VerificationTokenStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "LoginAttemptResult" AS ENUM ('SUCCESS', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AccountLockReason" AS ENUM ('FAILED_ATTEMPTS', 'ADMIN', 'SECURITY', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "ProviderHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PriceSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "AiAgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiActionType" AS ENUM ('TOOL_CALL', 'QUERY', 'UPDATE', 'CREATE', 'DELETE', 'ANALYSIS');

-- CreateEnum
CREATE TYPE "AiFeedbackRating" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "SearchIndexStatus" AS ENUM ('ACTIVE', 'STALE', 'REINDEXING');

-- CreateEnum
CREATE TYPE "BarcodeScanResult" AS ENUM ('FOUND', 'NOT_FOUND', 'ERROR', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "PrintJobStatus" AS ENUM ('QUEUED', 'PRINTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'TENANT', 'PLAN');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('COMMENT', 'STATUS_CHANGE', 'ASSIGNMENT', 'SYSTEM', 'ATTACHMENT', 'MENTION');

-- CreateEnum
CREATE TYPE "RestoreJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeletedRecordStatus" AS ENUM ('DELETED', 'RESTORING', 'RESTORED', 'PURGED');

-- CreateEnum
CREATE TYPE "UsageMetricType" AS ENUM ('STORAGE', 'EMPLOYEES', 'BRANCHES', 'API', 'AI_CREDITS', 'WHATSAPP', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "GoldPriceOverrideType" AS ENUM ('MANUAL', 'FORMULA', 'SPREAD');

-- AlterTable
ALTER TABLE "ai_conversations" ADD COLUMN     "agent_id" UUID;

-- AlterTable
ALTER TABLE "exchange_rates" ADD COLUMN     "provider_id" UUID;

-- AlterTable
ALTER TABLE "gold_price_history" ADD COLUMN     "provider_id" UUID,
ADD COLUMN     "source_id" UUID;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "browser" VARCHAR(100),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "correlation_id" VARCHAR(50),
ADD COLUMN     "country_code" CHAR(2),
ADD COLUMN     "device_type" VARCHAR(50),
ADD COLUMN     "geo" JSONB,
ADD COLUMN     "operating_system" VARCHAR(100);

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "browser" VARCHAR(100),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "correlation_id" VARCHAR(50),
ADD COLUMN     "country_code" CHAR(2),
ADD COLUMN     "device_type" VARCHAR(50),
ADD COLUMN     "geo" JSONB,
ADD COLUMN     "ip_address" VARCHAR(45),
ADD COLUMN     "operating_system" VARCHAR(100),
ADD COLUMN     "request_id" VARCHAR(50),
ADD COLUMN     "user_agent" TEXT;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "max_ai_credits" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "max_api_calls" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN     "max_employees" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "max_push_credits" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "max_sms_credits" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN     "max_whatsapp_credits" DECIMAL(12,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ai_agents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "model" VARCHAR(100) NOT NULL,
    "status" "AiAgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "system_prompt" TEXT,
    "tools" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "agent_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_context" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_context_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_actions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "conversation_id" UUID,
    "user_id" UUID,
    "action_type" "AiActionType" NOT NULL,
    "tool_name" VARCHAR(100),
    "input" JSONB,
    "output" JSONB,
    "status" "AiJobStatus" NOT NULL DEFAULT 'COMPLETED',
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "user_id" UUID,
    "model" VARCHAR(100) NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "credits_used" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,6),
    "currency" CHAR(3),
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tokens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "conversation_id" UUID,
    "token_type" VARCHAR(20) NOT NULL,
    "count" INTEGER NOT NULL,
    "model" VARCHAR(100),
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "conversation_id" UUID,
    "user_id" UUID,
    "rating" "AiFeedbackRating" NOT NULL,
    "comment" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "job_type" VARCHAR(50) NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error_message" TEXT,
    "scheduled_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "status" "VerificationTokenStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "status" "VerificationTokenStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "status" "VerificationTokenStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "phone_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID,
    "fingerprint" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "trusted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "trusted_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "email" VARCHAR(255),
    "result" "LoginAttemptResult" NOT NULL,
    "failure_reason" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "country_code" CHAR(2),
    "city" VARCHAR(100),
    "browser" VARCHAR(100),
    "operating_system" VARCHAR(100),
    "device_type" VARCHAR(50),
    "request_id" VARCHAR(50),
    "correlation_id" VARCHAR(50),
    "geo" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "failed_login_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "user_id" UUID,
    "email" VARCHAR(255),
    "failure_reason" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "country_code" CHAR(2),
    "city" VARCHAR(100),
    "browser" VARCHAR(100),
    "operating_system" VARCHAR(100),
    "device_type" VARCHAR(50),
    "request_id" VARCHAR(50),
    "correlation_id" VARCHAR(50),
    "geo" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "failed_login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_locks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reason" "AccountLockReason" NOT NULL,
    "locked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMPTZ(6),
    "unlocked_at" TIMESTAMPTZ(6),
    "locked_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "account_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remembered_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_token_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "remembered_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "format" VARCHAR(30) NOT NULL,
    "entity_type" VARCHAR(50),
    "template" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "barcode_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barcode_scans" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID,
    "branch_id" UUID,
    "user_id" UUID,
    "barcode_value" VARCHAR(255) NOT NULL,
    "result" "BarcodeScanResult" NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "device_id" UUID,
    "scanned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "barcode_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "scan_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_providers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "base_url" VARCHAR(500),
    "api_key_required" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "health_status" "ProviderHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "last_health_check" TIMESTAMPTZ(6),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "exchange_rate_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_cache" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "provider_id" UUID NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "base_currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "rate" DECIMAL(18,8) NOT NULL,
    "fetched_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "exchange_rate_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_sync_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "provider_id" UUID NOT NULL,
    "status" "PriceSyncStatus" NOT NULL DEFAULT 'PENDING',
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_details" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "exchange_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_layouts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "layout_id" UUID NOT NULL,
    "widget_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "position" JSONB NOT NULL DEFAULT '{}',
    "size" JSONB NOT NULL DEFAULT '{}',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_preferences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "dashboard_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "scope" "FeatureFlagScope" NOT NULL DEFAULT 'GLOBAL',
    "default_value" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_features" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "flag_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "value" JSONB,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_configuration" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "module_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_price_providers" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "base_url" VARCHAR(500),
    "api_key_required" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "health_status" "ProviderHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "last_health_check" TIMESTAMPTZ(6),
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gold_price_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_price_sources" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "provider_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gold_price_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_price_sync_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "provider_id" UUID NOT NULL,
    "source_id" UUID,
    "status" "PriceSyncStatus" NOT NULL DEFAULT 'PENDING',
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_details" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gold_price_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_price_cache" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source_id" UUID,
    "karat" "GoldKarat" NOT NULL,
    "price_per_gram" DECIMAL(12,4) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "fetched_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "is_stale" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gold_price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_price_overrides" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "source_id" UUID,
    "karat" "GoldKarat" NOT NULL,
    "override_type" "GoldPriceOverrideType" NOT NULL DEFAULT 'MANUAL',
    "price_per_gram" DECIMAL(12,4),
    "spread_bps" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'SAR',
    "reason" TEXT,
    "effective_from" TIMESTAMPTZ(6) NOT NULL,
    "effective_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gold_price_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_pricing_formulas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "formula" JSONB NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gold_pricing_formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_invitations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "role_id" UUID,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "job_title" VARCHAR(100),
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "source" "InvitationSource" NOT NULL DEFAULT 'EMAIL',
    "created_by_id" UUID NOT NULL,
    "accepted_by_id" UUID,
    "cancelled_by_id" UUID,
    "employee_id" UUID,
    "user_id" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "last_sent_at" TIMESTAMPTZ(6),
    "resend_count" INTEGER NOT NULL DEFAULT 0,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "employee_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_tokens" (
    "id" UUID NOT NULL,
    "invitation_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invitation_id" UUID NOT NULL,
    "action" "InvitationAuditAction" NOT NULL,
    "channel" "InvitationSource",
    "performed_by_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "invitation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thermal_printers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100),
    "connection" VARCHAR(50) NOT NULL,
    "address" VARCHAR(255),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "paper_width_mm" INTEGER NOT NULL DEFAULT 80,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "thermal_printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "printer_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "printer_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "printer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "printer_id" UUID,
    "profile_id" UUID,
    "template_id" UUID,
    "user_id" UUID,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "status" "PrintJobStatus" NOT NULL DEFAULT 'QUEUED',
    "copies" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "queued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "print_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50),
    "format" VARCHAR(30) NOT NULL DEFAULT 'THERMAL',
    "template" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "print_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deleted_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "status" "DeletedRecordStatus" NOT NULL DEFAULT 'DELETED',
    "snapshot" JSONB NOT NULL,
    "deleted_by_id" UUID,
    "deleted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restored_at" TIMESTAMPTZ(6),
    "purged_at" TIMESTAMPTZ(6),
    "retention_until" TIMESTAMPTZ(6),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deleted_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restore_jobs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "deleted_record_id" UUID NOT NULL,
    "requested_by_id" UUID,
    "status" "RestoreJobStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "restore_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_searches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" VARCHAR(50),
    "query" TEXT NOT NULL,
    "result_count" INTEGER,
    "searched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "recent_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_search_index" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(255),
    "content" TEXT NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SearchIndexStatus" NOT NULL DEFAULT 'ACTIVE',
    "indexed_at" TIMESTAMPTZ(6) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "global_search_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "storage_used_gb" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "branch_count" INTEGER NOT NULL DEFAULT 0,
    "api_calls" INTEGER NOT NULL DEFAULT 0,
    "ai_credits_used" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "whatsapp_credits_used" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "sms_credits_used" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "push_credits_used" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "subscription_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_overages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "usage_id" UUID NOT NULL,
    "metric" "UsageMetricType" NOT NULL,
    "limit_value" DECIMAL(18,4) NOT NULL,
    "used_value" DECIMAL(18,4) NOT NULL,
    "overage_amount" DECIMAL(18,4) NOT NULL,
    "unit_price" DECIMAL(12,6),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "billed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "subscription_overages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_timeline" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" "TimelineEventType" NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "activity_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_comments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "timeline_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "timeline_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_attachments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "timeline_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "label" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "timeline_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_agents_tenant_id_idx" ON "ai_agents"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_agents_status_idx" ON "ai_agents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agents_tenant_id_code_key" ON "ai_agents"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "ai_prompts_tenant_id_idx" ON "ai_prompts"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_prompts_agent_id_idx" ON "ai_prompts"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompts_tenant_id_code_version_key" ON "ai_prompts"("tenant_id", "code", "version");

-- CreateIndex
CREATE INDEX "ai_context_tenant_id_idx" ON "ai_context"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_context_agent_id_idx" ON "ai_context"("agent_id");

-- CreateIndex
CREATE INDEX "ai_context_entity_type_entity_id_idx" ON "ai_context"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_context_tenant_id_key_entity_type_entity_id_key" ON "ai_context"("tenant_id", "key", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "ai_actions_tenant_id_idx" ON "ai_actions"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_actions_agent_id_idx" ON "ai_actions"("agent_id");

-- CreateIndex
CREATE INDEX "ai_actions_conversation_id_idx" ON "ai_actions"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_actions_action_type_idx" ON "ai_actions"("action_type");

-- CreateIndex
CREATE INDEX "ai_usage_tenant_id_idx" ON "ai_usage"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_usage_agent_id_idx" ON "ai_usage"("agent_id");

-- CreateIndex
CREATE INDEX "ai_usage_period_start_period_end_idx" ON "ai_usage"("period_start", "period_end");

-- CreateIndex
CREATE INDEX "ai_tokens_tenant_id_idx" ON "ai_tokens"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_tokens_conversation_id_idx" ON "ai_tokens"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_tokens_recorded_at_idx" ON "ai_tokens"("recorded_at");

-- CreateIndex
CREATE INDEX "ai_feedback_tenant_id_idx" ON "ai_feedback"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_feedback_agent_id_idx" ON "ai_feedback"("agent_id");

-- CreateIndex
CREATE INDEX "ai_feedback_rating_idx" ON "ai_feedback"("rating");

-- CreateIndex
CREATE INDEX "ai_jobs_tenant_id_idx" ON "ai_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_jobs_agent_id_idx" ON "ai_jobs"("agent_id");

-- CreateIndex
CREATE INDEX "ai_jobs_status_idx" ON "ai_jobs"("status");

-- CreateIndex
CREATE INDEX "ai_jobs_scheduled_at_idx" ON "ai_jobs"("scheduled_at");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_hash_idx" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "email_verification_tokens_user_id_idx" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_hash_idx" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "phone_verification_tokens_user_id_idx" ON "phone_verification_tokens"("user_id");

-- CreateIndex
CREATE INDEX "phone_verification_tokens_phone_idx" ON "phone_verification_tokens"("phone");

-- CreateIndex
CREATE INDEX "phone_verification_tokens_expires_at_idx" ON "phone_verification_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_user_id_idx" ON "mfa_recovery_codes"("user_id");

-- CreateIndex
CREATE INDEX "trusted_devices_user_id_idx" ON "trusted_devices"("user_id");

-- CreateIndex
CREATE INDEX "trusted_devices_device_id_idx" ON "trusted_devices"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_devices_user_id_fingerprint_key" ON "trusted_devices"("user_id", "fingerprint");

-- CreateIndex
CREATE INDEX "login_attempts_tenant_id_idx" ON "login_attempts"("tenant_id");

-- CreateIndex
CREATE INDEX "login_attempts_user_id_idx" ON "login_attempts"("user_id");

-- CreateIndex
CREATE INDEX "login_attempts_email_idx" ON "login_attempts"("email");

-- CreateIndex
CREATE INDEX "login_attempts_result_idx" ON "login_attempts"("result");

-- CreateIndex
CREATE INDEX "login_attempts_created_at_idx" ON "login_attempts"("created_at");

-- CreateIndex
CREATE INDEX "failed_login_history_tenant_id_idx" ON "failed_login_history"("tenant_id");

-- CreateIndex
CREATE INDEX "failed_login_history_user_id_idx" ON "failed_login_history"("user_id");

-- CreateIndex
CREATE INDEX "failed_login_history_email_idx" ON "failed_login_history"("email");

-- CreateIndex
CREATE INDEX "failed_login_history_created_at_idx" ON "failed_login_history"("created_at");

-- CreateIndex
CREATE INDEX "account_locks_user_id_idx" ON "account_locks"("user_id");

-- CreateIndex
CREATE INDEX "account_locks_locked_at_idx" ON "account_locks"("locked_at");

-- CreateIndex
CREATE INDEX "password_history_user_id_idx" ON "password_history"("user_id");

-- CreateIndex
CREATE INDEX "password_history_created_at_idx" ON "password_history"("created_at");

-- CreateIndex
CREATE INDEX "remembered_devices_user_id_idx" ON "remembered_devices"("user_id");

-- CreateIndex
CREATE INDEX "remembered_devices_device_token_hash_idx" ON "remembered_devices"("device_token_hash");

-- CreateIndex
CREATE INDEX "remembered_devices_expires_at_idx" ON "remembered_devices"("expires_at");

-- CreateIndex
CREATE INDEX "barcode_templates_tenant_id_idx" ON "barcode_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "barcode_templates_tenant_id_code_key" ON "barcode_templates"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "barcode_scans_tenant_id_idx" ON "barcode_scans"("tenant_id");

-- CreateIndex
CREATE INDEX "barcode_scans_barcode_value_idx" ON "barcode_scans"("barcode_value");

-- CreateIndex
CREATE INDEX "barcode_scans_scanned_at_idx" ON "barcode_scans"("scanned_at");

-- CreateIndex
CREATE INDEX "qr_codes_tenant_id_idx" ON "qr_codes"("tenant_id");

-- CreateIndex
CREATE INDEX "qr_codes_entity_type_entity_id_idx" ON "qr_codes"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_tenant_id_code_key" ON "qr_codes"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_providers_code_key" ON "exchange_rate_providers"("code");

-- CreateIndex
CREATE INDEX "exchange_rate_providers_is_active_idx" ON "exchange_rate_providers"("is_active");

-- CreateIndex
CREATE INDEX "exchange_rate_providers_priority_idx" ON "exchange_rate_providers"("priority");

-- CreateIndex
CREATE INDEX "exchange_rate_providers_health_status_idx" ON "exchange_rate_providers"("health_status");

-- CreateIndex
CREATE INDEX "exchange_rate_cache_tenant_id_idx" ON "exchange_rate_cache"("tenant_id");

-- CreateIndex
CREATE INDEX "exchange_rate_cache_provider_id_idx" ON "exchange_rate_cache"("provider_id");

-- CreateIndex
CREATE INDEX "exchange_rate_cache_fetched_at_idx" ON "exchange_rate_cache"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_cache_tenant_id_provider_id_currency_code_bas_key" ON "exchange_rate_cache"("tenant_id", "provider_id", "currency_code", "base_currency");

-- CreateIndex
CREATE INDEX "exchange_sync_logs_tenant_id_idx" ON "exchange_sync_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "exchange_sync_logs_provider_id_idx" ON "exchange_sync_logs"("provider_id");

-- CreateIndex
CREATE INDEX "exchange_sync_logs_status_idx" ON "exchange_sync_logs"("status");

-- CreateIndex
CREATE INDEX "exchange_sync_logs_started_at_idx" ON "exchange_sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "dashboard_layouts_tenant_id_idx" ON "dashboard_layouts"("tenant_id");

-- CreateIndex
CREATE INDEX "dashboard_layouts_user_id_idx" ON "dashboard_layouts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_tenant_id_user_id_code_key" ON "dashboard_layouts"("tenant_id", "user_id", "code");

-- CreateIndex
CREATE INDEX "dashboard_widgets_tenant_id_idx" ON "dashboard_widgets"("tenant_id");

-- CreateIndex
CREATE INDEX "dashboard_widgets_layout_id_idx" ON "dashboard_widgets"("layout_id");

-- CreateIndex
CREATE INDEX "dashboard_preferences_tenant_id_idx" ON "dashboard_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "dashboard_preferences_user_id_idx" ON "dashboard_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_preferences_tenant_id_user_id_key_key" ON "dashboard_preferences"("tenant_id", "user_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_code_key" ON "feature_flags"("code");

-- CreateIndex
CREATE INDEX "feature_flags_is_active_idx" ON "feature_flags"("is_active");

-- CreateIndex
CREATE INDEX "tenant_features_tenant_id_idx" ON "tenant_features"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_features_flag_id_idx" ON "tenant_features"("flag_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_features_tenant_id_flag_id_key" ON "tenant_features"("tenant_id", "flag_id");

-- CreateIndex
CREATE INDEX "module_configuration_tenant_id_idx" ON "module_configuration"("tenant_id");

-- CreateIndex
CREATE INDEX "module_configuration_module_idx" ON "module_configuration"("module");

-- CreateIndex
CREATE UNIQUE INDEX "module_configuration_tenant_id_module_key_key" ON "module_configuration"("tenant_id", "module", "key");

-- CreateIndex
CREATE UNIQUE INDEX "gold_price_providers_code_key" ON "gold_price_providers"("code");

-- CreateIndex
CREATE INDEX "gold_price_providers_is_active_idx" ON "gold_price_providers"("is_active");

-- CreateIndex
CREATE INDEX "gold_price_providers_priority_idx" ON "gold_price_providers"("priority");

-- CreateIndex
CREATE INDEX "gold_price_providers_health_status_idx" ON "gold_price_providers"("health_status");

-- CreateIndex
CREATE INDEX "gold_price_sources_tenant_id_idx" ON "gold_price_sources"("tenant_id");

-- CreateIndex
CREATE INDEX "gold_price_sources_provider_id_idx" ON "gold_price_sources"("provider_id");

-- CreateIndex
CREATE INDEX "gold_price_sources_is_primary_idx" ON "gold_price_sources"("is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "gold_price_sources_tenant_id_provider_id_key" ON "gold_price_sources"("tenant_id", "provider_id");

-- CreateIndex
CREATE INDEX "gold_price_sync_logs_tenant_id_idx" ON "gold_price_sync_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "gold_price_sync_logs_provider_id_idx" ON "gold_price_sync_logs"("provider_id");

-- CreateIndex
CREATE INDEX "gold_price_sync_logs_status_idx" ON "gold_price_sync_logs"("status");

-- CreateIndex
CREATE INDEX "gold_price_sync_logs_started_at_idx" ON "gold_price_sync_logs"("started_at");

-- CreateIndex
CREATE INDEX "gold_price_cache_tenant_id_idx" ON "gold_price_cache"("tenant_id");

-- CreateIndex
CREATE INDEX "gold_price_cache_fetched_at_idx" ON "gold_price_cache"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "gold_price_cache_tenant_id_karat_currency_key" ON "gold_price_cache"("tenant_id", "karat", "currency");

-- CreateIndex
CREATE INDEX "gold_price_overrides_tenant_id_karat_is_active_idx" ON "gold_price_overrides"("tenant_id", "karat", "is_active");

-- CreateIndex
CREATE INDEX "gold_price_overrides_effective_from_idx" ON "gold_price_overrides"("effective_from");

-- CreateIndex
CREATE INDEX "gold_pricing_formulas_tenant_id_idx" ON "gold_pricing_formulas"("tenant_id");

-- CreateIndex
CREATE INDEX "gold_pricing_formulas_is_active_idx" ON "gold_pricing_formulas"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "gold_pricing_formulas_tenant_id_code_key" ON "gold_pricing_formulas"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "employee_invitations_tenant_id_idx" ON "employee_invitations"("tenant_id");

-- CreateIndex
CREATE INDEX "employee_invitations_email_idx" ON "employee_invitations"("email");

-- CreateIndex
CREATE INDEX "employee_invitations_status_idx" ON "employee_invitations"("status");

-- CreateIndex
CREATE INDEX "employee_invitations_expires_at_idx" ON "employee_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "employee_invitations_tenant_id_deleted_at_idx" ON "employee_invitations"("tenant_id", "deleted_at");

-- CreateIndex
CREATE INDEX "invitation_tokens_invitation_id_idx" ON "invitation_tokens"("invitation_id");

-- CreateIndex
CREATE INDEX "invitation_tokens_token_hash_idx" ON "invitation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "invitation_tokens_expires_at_idx" ON "invitation_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "invitation_audit_logs_tenant_id_idx" ON "invitation_audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "invitation_audit_logs_invitation_id_idx" ON "invitation_audit_logs"("invitation_id");

-- CreateIndex
CREATE INDEX "invitation_audit_logs_action_idx" ON "invitation_audit_logs"("action");

-- CreateIndex
CREATE INDEX "invitation_audit_logs_created_at_idx" ON "invitation_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "thermal_printers_tenant_id_idx" ON "thermal_printers"("tenant_id");

-- CreateIndex
CREATE INDEX "thermal_printers_branch_id_idx" ON "thermal_printers"("branch_id");

-- CreateIndex
CREATE INDEX "printer_profiles_tenant_id_idx" ON "printer_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "printer_profiles_printer_id_idx" ON "printer_profiles"("printer_id");

-- CreateIndex
CREATE UNIQUE INDEX "printer_profiles_tenant_id_code_key" ON "printer_profiles"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "print_jobs_tenant_id_idx" ON "print_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "print_jobs_status_idx" ON "print_jobs"("status");

-- CreateIndex
CREATE INDEX "print_jobs_queued_at_idx" ON "print_jobs"("queued_at");

-- CreateIndex
CREATE INDEX "print_templates_tenant_id_idx" ON "print_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "print_templates_tenant_id_code_key" ON "print_templates"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "deleted_records_tenant_id_idx" ON "deleted_records"("tenant_id");

-- CreateIndex
CREATE INDEX "deleted_records_status_idx" ON "deleted_records"("status");

-- CreateIndex
CREATE INDEX "deleted_records_deleted_at_idx" ON "deleted_records"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "deleted_records_tenant_id_entity_type_entity_id_key" ON "deleted_records"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "restore_jobs_tenant_id_idx" ON "restore_jobs"("tenant_id");

-- CreateIndex
CREATE INDEX "restore_jobs_deleted_record_id_idx" ON "restore_jobs"("deleted_record_id");

-- CreateIndex
CREATE INDEX "restore_jobs_status_idx" ON "restore_jobs"("status");

-- CreateIndex
CREATE INDEX "saved_searches_tenant_id_idx" ON "saved_searches"("tenant_id");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

-- CreateIndex
CREATE INDEX "saved_searches_entity_type_idx" ON "saved_searches"("entity_type");

-- CreateIndex
CREATE INDEX "recent_searches_tenant_id_idx" ON "recent_searches"("tenant_id");

-- CreateIndex
CREATE INDEX "recent_searches_user_id_idx" ON "recent_searches"("user_id");

-- CreateIndex
CREATE INDEX "recent_searches_searched_at_idx" ON "recent_searches"("searched_at");

-- CreateIndex
CREATE INDEX "global_search_index_tenant_id_idx" ON "global_search_index"("tenant_id");

-- CreateIndex
CREATE INDEX "global_search_index_entity_type_idx" ON "global_search_index"("entity_type");

-- CreateIndex
CREATE INDEX "global_search_index_status_idx" ON "global_search_index"("status");

-- CreateIndex
CREATE UNIQUE INDEX "global_search_index_tenant_id_entity_type_entity_id_key" ON "global_search_index"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "subscription_usages_tenant_id_idx" ON "subscription_usages"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_usages_period_start_period_end_idx" ON "subscription_usages"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usages_subscription_id_period_start_key" ON "subscription_usages"("subscription_id", "period_start");

-- CreateIndex
CREATE INDEX "subscription_overages_tenant_id_idx" ON "subscription_overages"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_overages_usage_id_idx" ON "subscription_overages"("usage_id");

-- CreateIndex
CREATE INDEX "subscription_overages_metric_idx" ON "subscription_overages"("metric");

-- CreateIndex
CREATE INDEX "activity_timeline_tenant_id_idx" ON "activity_timeline"("tenant_id");

-- CreateIndex
CREATE INDEX "activity_timeline_entity_type_entity_id_idx" ON "activity_timeline"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "activity_timeline_occurred_at_idx" ON "activity_timeline"("occurred_at");

-- CreateIndex
CREATE INDEX "timeline_comments_tenant_id_idx" ON "timeline_comments"("tenant_id");

-- CreateIndex
CREATE INDEX "timeline_comments_timeline_id_idx" ON "timeline_comments"("timeline_id");

-- CreateIndex
CREATE INDEX "timeline_attachments_tenant_id_idx" ON "timeline_attachments"("tenant_id");

-- CreateIndex
CREATE INDEX "timeline_attachments_timeline_id_idx" ON "timeline_attachments"("timeline_id");

-- CreateIndex
CREATE INDEX "timeline_attachments_file_id_idx" ON "timeline_attachments"("file_id");

-- CreateIndex
CREATE INDEX "ai_conversations_agent_id_idx" ON "ai_conversations"("agent_id");

-- CreateIndex
CREATE INDEX "exchange_rates_provider_id_idx" ON "exchange_rates"("provider_id");

-- CreateIndex
CREATE INDEX "gold_price_history_provider_id_idx" ON "gold_price_history"("provider_id");

-- CreateIndex
CREATE INDEX "gold_price_history_source_id_idx" ON "gold_price_history"("source_id");

-- AddForeignKey
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_prompts" ADD CONSTRAINT "ai_prompts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_context" ADD CONSTRAINT "ai_context_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_context" ADD CONSTRAINT "ai_context_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_actions" ADD CONSTRAINT "ai_actions_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tokens" ADD CONSTRAINT "ai_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_tokens" ADD CONSTRAINT "ai_tokens_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_verification_tokens" ADD CONSTRAINT "phone_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_login_history" ADD CONSTRAINT "failed_login_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "failed_login_history" ADD CONSTRAINT "failed_login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_locks" ADD CONSTRAINT "account_locks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_locks" ADD CONSTRAINT "account_locks_locked_by_id_fkey" FOREIGN KEY ("locked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remembered_devices" ADD CONSTRAINT "remembered_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_templates" ADD CONSTRAINT "barcode_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "barcode_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_scans" ADD CONSTRAINT "barcode_scans_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rate_cache" ADD CONSTRAINT "exchange_rate_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rate_cache" ADD CONSTRAINT "exchange_rate_cache_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "exchange_rate_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_sync_logs" ADD CONSTRAINT "exchange_sync_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_sync_logs" ADD CONSTRAINT "exchange_sync_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "exchange_rate_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "dashboard_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_preferences" ADD CONSTRAINT "dashboard_preferences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_features" ADD CONSTRAINT "tenant_features_flag_id_fkey" FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_configuration" ADD CONSTRAINT "module_configuration_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "exchange_rate_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_history" ADD CONSTRAINT "gold_price_history_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "gold_price_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_history" ADD CONSTRAINT "gold_price_history_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "gold_price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_sources" ADD CONSTRAINT "gold_price_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_sources" ADD CONSTRAINT "gold_price_sources_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "gold_price_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_sync_logs" ADD CONSTRAINT "gold_price_sync_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_sync_logs" ADD CONSTRAINT "gold_price_sync_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "gold_price_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_sync_logs" ADD CONSTRAINT "gold_price_sync_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "gold_price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_cache" ADD CONSTRAINT "gold_price_cache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_cache" ADD CONSTRAINT "gold_price_cache_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "gold_price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_overrides" ADD CONSTRAINT "gold_price_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_overrides" ADD CONSTRAINT "gold_price_overrides_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "gold_price_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_price_overrides" ADD CONSTRAINT "gold_price_overrides_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_pricing_formulas" ADD CONSTRAINT "gold_pricing_formulas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_tokens" ADD CONSTRAINT "invitation_tokens_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "employee_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_audit_logs" ADD CONSTRAINT "invitation_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_audit_logs" ADD CONSTRAINT "invitation_audit_logs_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "employee_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_audit_logs" ADD CONSTRAINT "invitation_audit_logs_performed_by_id_fkey" FOREIGN KEY ("performed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_printers" ADD CONSTRAINT "thermal_printers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thermal_printers" ADD CONSTRAINT "thermal_printers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_profiles" ADD CONSTRAINT "printer_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printer_profiles" ADD CONSTRAINT "printer_profiles_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "thermal_printers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_printer_id_fkey" FOREIGN KEY ("printer_id") REFERENCES "thermal_printers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "printer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "print_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deleted_records" ADD CONSTRAINT "deleted_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restore_jobs" ADD CONSTRAINT "restore_jobs_deleted_record_id_fkey" FOREIGN KEY ("deleted_record_id") REFERENCES "deleted_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_searches" ADD CONSTRAINT "recent_searches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_search_index" ADD CONSTRAINT "global_search_index_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_overages" ADD CONSTRAINT "subscription_overages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_overages" ADD CONSTRAINT "subscription_overages_usage_id_fkey" FOREIGN KEY ("usage_id") REFERENCES "subscription_usages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_timeline" ADD CONSTRAINT "activity_timeline_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_comments" ADD CONSTRAINT "timeline_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_comments" ADD CONSTRAINT "timeline_comments_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "activity_timeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_attachments" ADD CONSTRAINT "timeline_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_attachments" ADD CONSTRAINT "timeline_attachments_timeline_id_fkey" FOREIGN KEY ("timeline_id") REFERENCES "activity_timeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
