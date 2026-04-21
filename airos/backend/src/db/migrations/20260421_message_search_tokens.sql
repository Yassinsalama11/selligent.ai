ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS search_tokens JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_messages_search_tokens
  ON messages USING GIN (search_tokens);
