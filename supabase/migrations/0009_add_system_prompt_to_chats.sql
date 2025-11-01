-- Add system_prompt column to chats table
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

COMMENT ON COLUMN chats.system_prompt IS 'Custom system prompt/instructions for this conversation. Takes precedence over default user context.';

