import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { chatId, messages, ollamaHost, googleApiKey, model } = await req.json();

    if (!chatId || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare conversation text for summarization
    const conversationText = messages
      .map((msg: Message) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const summaryPrompt = `Please provide a concise summary of the following conversation. Focus on:
1. Main topics discussed
2. Key questions asked and answers provided
3. Important decisions or conclusions
4. Technical details that might be relevant for future messages

Keep the summary factual and comprehensive but concise.

Conversation:
${conversationText}

Summary:`;

    let summary = '';

    // Try Ollama first if available
    if (ollamaHost) {
      try {
        const ollamaResponse = await fetch(`${ollamaHost}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model?.replace('ollama/', '') || 'llama3.2:3b',
            prompt: summaryPrompt,
            stream: false,
            options: {
              temperature: 0.3, // Lower temperature for more focused summaries
              num_predict: 500, // Limit summary length
            },
          }),
        });

        if (ollamaResponse.ok) {
          const data = await ollamaResponse.json();
          summary = data.response;
        }
      } catch (ollamaError) {
        console.error('Ollama summarization failed:', ollamaError);
      }
    }

    // Fallback: Create a simple extractive summary if Ollama unavailable/failed
    if (!summary) {
      const userMessages = messages.filter((m: Message) => m.role === 'user');
      const topics = userMessages.slice(0, 5).map((m: Message) => m.content.slice(0, 100));
      summary = `Conversation covering: ${topics.join('; ')}. (${messages.length} messages total)`;
    }

    // Update the chat with the summary
    const lastMessageId = messages[messages.length - 1].id;
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        summary,
        summary_up_to_message_id: lastMessageId,
        messages_summarized: messages.length,
        last_summarized_at: new Date().toISOString(),
      })
      .eq('id', chatId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating summary:', updateError);
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary, messagesSummarized: messages.length });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

