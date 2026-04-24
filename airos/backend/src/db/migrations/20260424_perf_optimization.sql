-- Performance Optimization: Phase 1 (Indexes) & Phase 2 (Denormalization)
-- Friday, April 24, 2026

-- Phase 1: Safe Indexes
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_tenant_created ON ai_suggestions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_created ON conversations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status_perf ON campaigns(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_status_perf ON campaign_recipients(campaign_id, status);

-- Phase 2: Conversation Denormalization
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_sender TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_direction TEXT;

-- Initial Backfill
-- Populate from latest message per conversation
-- Note: previews will be generic "Message" or empty initially to avoid expensive decryption in migration
-- Future messages will update these correctly.
DO $$
BEGIN
    UPDATE conversations c
    SET
        last_message_at = m.created_at,
        last_message_sender = m.sent_by,
        last_message_direction = m.direction,
        last_message_preview = CASE
            WHEN m.type = 'image' THEN 'Image attachment'
            WHEN m.type = 'file' THEN 'File attachment'
            WHEN m.type = 'internal_note' THEN 'Internal note'
            ELSE 'Latest message'
        END
    FROM (
        SELECT DISTINCT ON (conversation_id) conversation_id, created_at, sent_by, direction, type
        FROM messages
        ORDER BY conversation_id, created_at DESC
    ) m
    WHERE c.id = m.conversation_id
      AND c.last_message_at IS NULL;
END $$;
