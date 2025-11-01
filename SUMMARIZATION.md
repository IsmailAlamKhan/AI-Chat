# Conversation Summarization Feature

## Overview

The conversation summarization feature automatically condenses long conversations to optimize performance and reduce token usage while maintaining context quality.

## How It Works

### Automatic Triggering

- **Threshold**: Summarization triggers automatically after **20 messages**
- **Frequency**: Re-summarizes every additional **20 messages**
- **Blocking**: AI waits for summarization to complete before responding (ensures optimal context)

### Smart Context Management

When a conversation has been summarized:
1. **Summary**: Earlier messages are condensed into a concise summary
2. **Recent Messages**: The last **10 messages** are kept in full for immediate context
3. **Combined Context**: AI receives both the summary and recent messages

### Example Flow

```
Messages 1-20:  [First 20 messages] → Summarized
Messages 21-30: [Summary of 1-20] + [Messages 21-30 in full]
Messages 31-40: [Summary of 1-20] + [Messages 21-40 in full]
Messages 41+:   [Summary of 1-40] + [Last 10 messages in full] → Re-summarize
```

## User Experience

### Visual Indicators

1. **Summarizing Indicator** (Purple, in message area)
   - Appears at the bottom of messages (like "AI Thinking..." indicator)
   - Shows "Summarizing conversation..." with animated sparkle icon
   - Blocks AI response until complete

2. **Summarized Banner** (Blue, sticky at top)
   - Appears after summarization completes
   - Shows count of summarized messages
   - Example: "Earlier messages have been summarized (20 messages)"
   - Persists across conversation for context awareness

### User Flow

1. User sends message that reaches threshold (e.g., 20th message)
2. "Summarizing conversation..." indicator appears immediately
3. Summarization completes (typically 2-5 seconds)
4. AI responds with full context from summary + recent messages
5. Blue banner shows summarization status at top

## Technical Implementation

### Database Schema

**New columns in `chats` table:**
```sql
- summary: TEXT                    -- The condensed summary text
- summary_up_to_message_id: UUID   -- Last message included in summary
- messages_summarized: INTEGER     -- Count of summarized messages
- last_summarized_at: TIMESTAMPTZ  -- Timestamp of last summarization
```

### API Endpoints

#### `/api/summarize` (POST)
Generates conversation summaries using available AI providers.

**Request:**
```json
{
  "chatId": "uuid",
  "messages": [{ ... }],
  "ollamaHost": "http://localhost:11434",
  "googleApiKey": "key",
  "model": "ollama/llama3.2:3b"
}
```

**Response:**
```json
{
  "summary": "Summary text...",
  "messagesSummarized": 20
}
```

**Provider Priority:**
1. **Ollama** (if configured) - Fast, local, free
2. **Google AI Gemini** (if API key provided) - Cloud-based
3. **Fallback** - Simple extractive summary

### Configuration

**Adjustable in `app/api/chat/route.ts`:**
```typescript
const SUMMARIZATION_THRESHOLD = 20     // Messages before first summary
const RECENT_MESSAGES_COUNT = 10       // Recent messages to keep in full
```

**Monitoring in `components/chat/summarization-monitor.tsx`:**
```typescript
const POLL_INTERVAL = 5000  // Check for completion every 5 seconds
```

## Benefits

### Performance
- **Reduced Token Usage**: Only sends summary + recent messages
- **Faster Responses**: Less context to process
- **Lower Costs**: Fewer tokens = lower API costs (for Google AI)

### Context Quality
- **Preserved Information**: Key topics and decisions remain accessible
- **Fresh Context**: Recent messages always in full detail
- **Scalability**: Conversations can grow indefinitely

### User Experience
- **Transparent**: Clear indicators show when/what is summarized
- **Non-intrusive**: Background operation with minimal disruption
- **Informative**: Notifications keep users informed

## Summary Quality

Summaries focus on:
1. **Main Topics**: What was discussed
2. **Key Questions**: User queries and AI answers
3. **Important Decisions**: Conclusions or action items
4. **Technical Details**: Relevant for future messages

**Example Summary:**
```
"Conversation covering Docker setup for Next.js app with Supabase. 
User requested simplified configuration using npx supabase start 
instead of docker-compose services. Implemented single Dockerfile 
with multi-stage build and updated documentation."
```

## Monitoring & Debugging

### Console Logs

**Chat Input:**
```
[CHAT INPUT] Summarization will be triggered
```

**Chat API:**
```
[SUMMARIZATION] Summarizing conversation before response (40 messages)
[SUMMARIZATION] Complete: 30 messages summarized
[SUMMARIZATION] Using summary + last 10 messages (45 total)
```

**Summarize API:**
```
Ollama summarization: Success
Google AI summarization: Fallback to extractive summary
```

### Database Queries

Check summarization status:
```sql
SELECT 
  id, 
  title, 
  messages_summarized, 
  LENGTH(summary) as summary_length,
  last_summarized_at
FROM chats
WHERE summary IS NOT NULL
ORDER BY last_summarized_at DESC;
```

## Edge Cases

### No AI Provider Available
- Falls back to extractive summary
- Still updates database and shows UI
- Summary quality reduced but functional

### Summarization Fails
- Error logged to console
- Conversation continues without summary
- AI still responds (just without summary optimization)

### Blocking Behavior
- Summarization completes before AI response starts
- Ensures AI always has optimal context
- Typical delay: 2-5 seconds (transparent to user)
- User sees clear "Summarizing..." indicator

## Future Enhancements

### Potential Improvements
- [ ] User-triggered manual summarization
- [ ] Adjustable thresholds in settings
- [ ] Summary preview/editing
- [ ] Multi-level summaries (summary of summaries)
- [ ] Export summaries as standalone documents
- [ ] Summary-based search across conversations

### Advanced Features
- [ ] Semantic chunking (by topic instead of count)
- [ ] Smart context selection (relevant messages vs. recent)
- [ ] Summary versioning and history
- [ ] Cross-conversation summaries

## Testing

### Manual Testing Checklist

1. **Start a new chat**
2. **Send 19 messages** (just below threshold)
3. **Send the 20th message** (trigger first summarization)
4. **Verify indicators:**
   - [ ] Purple "Summarizing conversation..." appears at bottom
   - [ ] Indicator shows BEFORE AI starts thinking
   - [ ] Indicator disappears when summarization completes
   - [ ] AI then shows "Thinking..." and responds
   - [ ] Blue "summarized" banner appears at top
5. **Check database:**
   - [ ] `summary` field populated
   - [ ] `messages_summarized` = ~10-19 (recent messages excluded)
6. **Continue conversation:**
   - [ ] AI responses still contextually relevant
   - [ ] No loss of conversation flow
   - [ ] Blue banner persists showing summarization info
7. **Send 20 more messages** (trigger re-summarization)
8. **Verify updates:**
   - [ ] Purple indicator appears again
   - [ ] Summary re-generated
   - [ ] `messages_summarized` increased
   - [ ] Blue banner updates with new count

## Migration

**Apply migration:**
```bash
npx supabase db reset  # Development
# or
npx supabase db push   # Production
```

**Migration file:** `supabase/migrations/0006_add_conversation_summaries.sql`

## Support

For issues or questions:
- Check console logs for `[SUMMARIZATION]` entries
- Verify AI provider (Ollama/Google) is configured
- Ensure database migration applied successfully
- Check network tab for `/api/summarize` requests

