-- Add department field to users for operator team management
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255);
