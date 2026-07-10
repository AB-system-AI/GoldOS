-- Phase 3 Auth Hardening: refresh token rotation, reuse detection, distributed rate limiting

CREATE TYPE "RevokedRefreshTokenReason" AS ENUM ('ROTATED', 'REUSE_DETECTED');

ALTER TABLE "sessions"
  ADD COLUMN "token_family_id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "pending_two_factor" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rotated_at" TIMESTAMPTZ(6);

CREATE INDEX "sessions_token_family_id_idx" ON "sessions"("token_family_id");
CREATE INDEX "sessions_user_id_status_idx" ON "sessions"("user_id", "status");

CREATE TABLE "revoked_refresh_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "token_hash" VARCHAR(255) NOT NULL,
  "reason" "RevokedRefreshTokenReason" NOT NULL,
  "revoked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revoked_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revoked_refresh_tokens_token_hash_key" ON "revoked_refresh_tokens"("token_hash");
CREATE INDEX "revoked_refresh_tokens_session_id_idx" ON "revoked_refresh_tokens"("session_id");
CREATE INDEX "revoked_refresh_tokens_revoked_at_idx" ON "revoked_refresh_tokens"("revoked_at");

ALTER TABLE "revoked_refresh_tokens"
  ADD CONSTRAINT "revoked_refresh_tokens_session_id_fkey"
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "rate_limit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bucket_key" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rate_limit_events_bucket_key_created_at_idx" ON "rate_limit_events"("bucket_key", "created_at");
