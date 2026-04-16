CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  pages_seen INTEGER DEFAULT 0,
  chunks_stored INTEGER DEFAULT 0,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  heading TEXT,
  content_hash VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  embedding JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, content_hash)
);

CREATE TABLE IF NOT EXISTS tenant_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  source_job_id UUID REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
  profile JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'queued',
  external_account TEXT,
  imported_counts JSONB DEFAULT '{}',
  error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_tenant_created
  ON ingestion_jobs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant
  ON knowledge_chunks(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_migration_jobs_tenant_created
  ON migration_jobs(tenant_id, created_at DESC);
