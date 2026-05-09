-- Add per-user preferences column so profile data is isolated per user
-- (not shared across all users of a tenant via tenants.settings JSONB)
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
