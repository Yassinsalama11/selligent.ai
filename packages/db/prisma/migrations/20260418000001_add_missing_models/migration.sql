/*
  Add missing Prisma models and additive columns on top of the raw SQL baseline.
  This migration intentionally avoids destructive DDL on legacy tables.
*/

-- AlterTable
ALTER TABLE "channel_connections"
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "conversations"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "customers"
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ADD COLUMN "email" VARCHAR(255),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "deals"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "messages"
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "products"
  ADD COLUMN "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "tenants"
  ADD COLUMN "data_residency" VARCHAR(10) NOT NULL DEFAULT 'us',
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "deleted_at" TIMESTAMPTZ,
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "tenant_token_budgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "daily_cap" INTEGER NOT NULL,
  "monthly_cap" INTEGER NOT NULL,
  "daily_used" INTEGER NOT NULL DEFAULT 0,
  "monthly_used" INTEGER NOT NULL DEFAULT 0,
  "last_reset_day" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_reset_month" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_token_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "prompt_hash" VARCHAR(64) NOT NULL,
  "tokens_in" INTEGER NOT NULL,
  "tokens_out" INTEGER NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "conversation_id" UUID,
  "status" VARCHAR(20) NOT NULL DEFAULT 'success',
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_encryption_keys" (
  "tenant_id" UUID NOT NULL,
  "enc_dek" TEXT NOT NULL,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_encryption_keys_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
  "tenant_id" UUID NOT NULL,
  "messages_days" INTEGER NOT NULL DEFAULT 365,
  "conversations_days" INTEGER NOT NULL DEFAULT 730,
  "audit_log_days" INTEGER NOT NULL DEFAULT 2555,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "privacy_jobs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "type" VARCHAR(20) NOT NULL,
  "subject_id" VARCHAR(255),
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "requested_by" UUID,
  "result_url" TEXT,
  "expires_at" TIMESTAMPTZ,
  "error" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "privacy_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_audits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "action_id" VARCHAR(120) NOT NULL,
  "idempotency_key" VARCHAR(255) NOT NULL,
  "input" JSONB NOT NULL DEFAULT '{}',
  "output" JSONB NOT NULL DEFAULT '{}',
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "requires_approval" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" UUID,
  "approved_at" TIMESTAMPTZ,
  "error" TEXT,
  "executed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "action_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_eval_scores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "message_id" UUID,
  "tenant_id" UUID NOT NULL,
  "score" INTEGER NOT NULL,
  "pass" BOOLEAN NOT NULL,
  "reasoning" TEXT,
  "model" VARCHAR(100) NOT NULL,
  "latency_ms" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "message_eval_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reply_corrections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "message_id" UUID,
  "suggestion_id" UUID,
  "edit_type" VARCHAR(20) NOT NULL,
  "original_reply" TEXT NOT NULL,
  "corrected_reply" TEXT,
  "corrected_by" UUID NOT NULL,
  "exported_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "reply_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_signals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "signal_type" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "model_version" VARCHAR(100),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "agent_id" UUID NOT NULL,
  "conversation_id" UUID,
  "command" VARCHAR(50) NOT NULL,
  "suggestion" TEXT NOT NULL,
  "outcome" VARCHAR(20) NOT NULL DEFAULT 'ignored',
  "edited_text" TEXT,
  "latency_ms" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "copilot_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "predicate" VARCHAR(255) NOT NULL,
  "object" TEXT NOT NULL,
  "source" VARCHAR(50) NOT NULL DEFAULT 'inferred',
  "confidence" DECIMAL(4,3) NOT NULL DEFAULT 1.0,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_token_budgets_tenant_id_key" ON "tenant_token_budgets"("tenant_id");

-- CreateIndex
CREATE INDEX "ai_call_logs_tenant_id_created_at_idx" ON "ai_call_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "privacy_jobs_tenant_id_created_at_idx" ON "privacy_jobs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "action_audits_tenant_id_created_at_idx" ON "action_audits"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "action_audits_tenant_id_idempotency_key_key" ON "action_audits"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "message_eval_scores_tenant_id_created_at_idx" ON "message_eval_scores"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reply_corrections_tenant_id_created_at_idx" ON "reply_corrections"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reply_corrections_exported_at_idx" ON "reply_corrections"("exported_at");

-- CreateIndex
CREATE INDEX "platform_signals_signal_type_created_at_idx" ON "platform_signals"("signal_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "copilot_logs_tenant_id_created_at_idx" ON "copilot_logs"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tenant_memory_tenant_id_subject_idx" ON "tenant_memory"("tenant_id", "subject");

-- CreateIndex
CREATE INDEX "tenant_memory_tenant_id_expires_at_idx" ON "tenant_memory"("tenant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memory_tenant_id_subject_predicate_key" ON "tenant_memory"("tenant_id", "subject", "predicate");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_profiles_source_job_id_key" ON "tenant_profiles"("source_job_id");

-- AddForeignKey
ALTER TABLE "tenant_token_budgets"
  ADD CONSTRAINT "tenant_token_budgets_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs"
  ADD CONSTRAINT "ai_call_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_encryption_keys"
  ADD CONSTRAINT "tenant_encryption_keys_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retention_policies"
  ADD CONSTRAINT "retention_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_jobs"
  ADD CONSTRAINT "privacy_jobs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_audits"
  ADD CONSTRAINT "action_audits_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_eval_scores"
  ADD CONSTRAINT "message_eval_scores_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_eval_scores"
  ADD CONSTRAINT "message_eval_scores_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_corrections"
  ADD CONSTRAINT "reply_corrections_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_corrections"
  ADD CONSTRAINT "reply_corrections_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_corrections"
  ADD CONSTRAINT "reply_corrections_suggestion_id_fkey"
  FOREIGN KEY ("suggestion_id") REFERENCES "ai_suggestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "copilot_logs"
  ADD CONSTRAINT "copilot_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memory"
  ADD CONSTRAINT "tenant_memory_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
