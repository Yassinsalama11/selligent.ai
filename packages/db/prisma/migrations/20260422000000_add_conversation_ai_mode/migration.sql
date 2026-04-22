ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_mode VARCHAR(20) DEFAULT 'manual';

UPDATE conversations
SET ai_mode = 'manual'
WHERE ai_mode IS NULL;

ALTER TABLE conversations
  ALTER COLUMN ai_mode SET NOT NULL;
