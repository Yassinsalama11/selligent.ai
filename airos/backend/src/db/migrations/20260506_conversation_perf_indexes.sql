-- Composite index for message fetch: conversation_id + created_at for ORDER BY + LIMIT
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conv_created
  ON messages(conversation_id, created_at DESC);

-- Composite index for tenant-scoped message fetch
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_tenant_conv_created
  ON messages(tenant_id, conversation_id, created_at DESC);

-- Composite index for conversation list: tenant + status + updated_at for sorted list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_status_updated
  ON conversations(tenant_id, status, updated_at DESC);

-- Composite index for assigned_to filter (agents see their own conversations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_assigned
  ON conversations(tenant_id, assigned_to, updated_at DESC);

-- Composite index for channel filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tenant_channel
  ON conversations(tenant_id, channel, updated_at DESC);
