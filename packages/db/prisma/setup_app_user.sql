-- One-time setup: create the restricted application DB role.
-- Run this manually in the Railway Postgres console (or via railway run psql) ONCE.
-- Prerequisites: connected as superuser (postgres).
--
-- After running this script:
-- 1. Set the password interactively: \password app_user
-- 2. Update DATABASE_URL in Railway to: postgresql://app_user:<password>@<host>/<db>
-- 3. Set DATABASE_URL_ADMIN in Railway to the current superuser DATABASE_URL value.
-- 4. Deploy the application. RLS is now enforced.

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
    RAISE NOTICE 'Role app_user created. Set password with: \password app_user';
  ELSE
    RAISE NOTICE 'Role app_user already exists. Skipping CREATE ROLE.';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- Verify: this must return false for both columns.
SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'app_user';
