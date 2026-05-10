-- Meta webhook event audit log for Meta App Review evidence
CREATE TABLE IF NOT EXISTS meta_webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel         VARCHAR(50)  NOT NULL,           -- messenger | instagram | whatsapp
  asset_type      VARCHAR(50)  NOT NULL,           -- page | ig_account | whatsapp_number
  asset_id        VARCHAR(255),                    -- page_id / ig_account_id / phone_number_id
  asset_name      VARCHAR(255),
  event_type      VARCHAR(100) NOT NULL,           -- message | message_status | postback | mention
  provider_event_id VARCHAR(255),                  -- fb_message_id / wa_message_id / ig_message_id
  summary         TEXT,                            -- human-readable, no PII
  raw_payload_redacted JSONB,                      -- sanitised snapshot (no tokens, no full bodies)
  processed_status VARCHAR(50) DEFAULT 'received', -- received | processed | failed
  received_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_tenant    ON meta_webhook_events (tenant_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_channel   ON meta_webhook_events (channel, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_webhook_events_asset     ON meta_webhook_events (asset_id, received_at DESC);
