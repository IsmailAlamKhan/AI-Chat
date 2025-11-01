-- Add summary fields to chats table
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS summary_up_to_message_id UUID,
ADD COLUMN IF NOT EXISTS messages_summarized INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_summarized_at TIMESTAMPTZ;

-- Add comment explaining the fields
COMMENT ON COLUMN chats.summary IS 'Condensed summary of conversation history up to a certain point';
COMMENT ON COLUMN chats.summary_up_to_message_id IS 'ID of the last message included in the summary';
COMMENT ON COLUMN chats.messages_summarized IS 'Number of messages that have been summarized';
COMMENT ON COLUMN chats.last_summarized_at IS 'Timestamp when the summary was last updated';

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_chats_summary_message ON chats(summary_up_to_message_id);

