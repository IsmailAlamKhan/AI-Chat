-- Add model column to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS model TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_model ON chats(model);

