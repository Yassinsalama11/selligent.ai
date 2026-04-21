CREATE TABLE IF NOT EXISTS platform_admin_security (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lockout_key TEXT NOT NULL UNIQUE,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  totp_secret_enc TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  totp_enrolled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_admin_security_user
  ON platform_admin_security(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_admin_security_locked
  ON platform_admin_security(lockout_key, locked_until);
