-- Migration: Tenant Stats Pre-aggregation
-- Friday, April 24, 2026

CREATE TABLE IF NOT EXISTS tenant_stats (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  conversations_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  customers_count INTEGER DEFAULT 0,
  tickets_count INTEGER DEFAULT 0,
  deals_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 0,
  active_users_count INTEGER DEFAULT 0,
  channels_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Population
INSERT INTO tenant_stats (
  tenant_id,
  conversations_count,
  messages_count,
  customers_count,
  tickets_count,
  deals_count,
  users_count,
  channels_count,
  last_activity_at
)
SELECT
  t.id,
  COALESCE(conv.count, 0),
  COALESCE(msg.count, 0),
  COALESCE(cust.count, 0),
  COALESCE(tick.count, 0),
  COALESCE(deal.count, 0),
  COALESCE(usr.count, 0),
  COALESCE(chan.count, 0),
  conv.last_seen
FROM tenants t
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count, MAX(updated_at) AS last_seen FROM conversations WHERE tenant_id = t.id) AS conv ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM messages WHERE tenant_id = t.id) AS msg ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM customers WHERE tenant_id = t.id AND COALESCE(preferences->>'deleted_at', '') = '') AS cust ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM tickets WHERE tenant_id = t.id AND deleted_at IS NULL) AS tick ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM deals WHERE tenant_id = t.id) AS deal ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM users WHERE tenant_id = t.id) AS usr ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*)::int AS count FROM channel_connections WHERE tenant_id = t.id AND status = 'active') AS chan ON TRUE
ON CONFLICT (tenant_id) DO UPDATE
SET
  conversations_count = EXCLUDED.conversations_count,
  messages_count = EXCLUDED.messages_count,
  customers_count = EXCLUDED.customers_count,
  tickets_count = EXCLUDED.tickets_count,
  deals_count = EXCLUDED.deals_count,
  users_count = EXCLUDED.users_count,
  channels_count = EXCLUDED.channels_count,
  last_activity_at = EXCLUDED.last_activity_at,
  updated_at = NOW();
