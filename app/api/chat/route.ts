import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Message } from '@/lib/store'

export const runtime = 'edge'

interface ChatRequest {
  messages: Message[]
  model: string
  chatId: string
  settings: {
    ollamaHost: string
    googleApiKey: string
    temperature: number
    safetySettings: any
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, model, chatId, settings } = body

    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Load user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, bio')
      .eq('user_id', user.id)
      .single()

    // Build user context
    let userContext = ''
    if (profile?.display_name) {
      userContext = `You are chatting with ${profile.display_name}.`
      if (profile.bio) {
        userContext += ` About them: ${profile.bio}`
      }
    }

    // Save user message to database
    const userMessage = messages[messages.length - 1]
    if (userMessage.role === 'user') {
      await supabase.from('messages').insert([{
        chat_id: chatId,
        user_id: user.id,
        role: userMessage.role,
        content: userMessage.content,
        attachments: userMessage.attachments || null,
      }])
    }

    // Determine which provider to use
    if (model.startsWith('ollama/')) {
      return await handleOllamaChat(messages, model.replace('ollama/', ''), settings, userContext)
    } else if (model.startsWith('google/')) {
      return await handleGoogleChat(messages, model.replace('google/', ''), settings, userContext)
    } else {
      return new Response('Invalid model provider', { status: 400 })
    }
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

async function handleOllamaChat(messages: Message[], modelName: string, settings: any, userContext?: string) {
  const ollamaMessages = messages.map(msg => {
    const content: any = { role: msg.role, content: msg.content }
    
    // Handle images for vision models
    if (msg.attachments && msg.attachments.length > 0) {
      content.images = msg.attachments
        .filter(att => att.type.startsWith('image/'))
        .map(att => att.data.split(',')[1]) // Extract base64 part
    }
    
    return content
  })

  // Add system message with user context if available
  if (userContext) {
    ollamaMessages.unshift({
      role: 'system',
      content: userContext
    })
  }

  const response = await fetch(`${settings.ollamaHost}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: ollamaMessages,
      stream: true,
      options: {
        temperature: settings.temperature,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`)
  }

  // Stream the response
  const encoder = new TextEncoder()
  let stopReason = 'unknown'
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = new TextDecoder().decode(value)
          const lines = text.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const json = JSON.parse(line)
              if (json.message?.content) {
                controller.enqueue(encoder.encode(json.message.content))
              }
              // Capture stop reason
              if (json.done && json.done_reason) {
                stopReason = json.done_reason
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      } finally {
        console.log('[OLLAMA] Stop reason:', stopReason)
        
        // Send stop reason info to client if unusual
        if (stopReason === 'length') {
          const warningMsg = '\n\n⚠️ *Response truncated: Maximum length reached. Try reducing the conversation length or increasing the token limit.*'
          controller.enqueue(encoder.encode(warningMsg))
        } else if (stopReason !== 'stop' && stopReason !== 'unknown') {
          const warningMsg = `\n\n⚠️ *Response stopped: ${stopReason}*`
          controller.enqueue(encoder.encode(warningMsg))
        }
        
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

async function handleGoogleChat(messages: Message[], modelName: string, settings: any, userContext?: string) {
  if (!settings.googleApiKey) {
    return new Response('Google API key not provided', { status: 400 })
  }

  // Convert messages to Google format
  const contents = messages.map(msg => {
    const parts: any[] = []
    
    // Add text content
    if (msg.content) {
      parts.push({ text: msg.content })
    }
    
    // Add images for vision models
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments
        .filter(att => att.type.startsWith('image/'))
        .forEach(att => {
          const [mimeType, base64Data] = att.data.includes(',') 
            ? [att.type, att.data.split(',')[1]]
            : [att.type, att.data]
          
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          })
        })
    }
    
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    }
  })

  // Add user context to the first user message if available
  if (userContext && contents.length > 0) {
    // Find the first user message and prepend context
    const firstUserIndex = contents.findIndex(c => c.role === 'user')
    if (firstUserIndex !== -1 && contents[firstUserIndex].parts.length > 0) {
      const firstPart = contents[firstUserIndex].parts[0]
      if (firstPart.text) {
        contents[firstUserIndex].parts[0] = {
          text: `${userContext}\n\n${firstPart.text}`
        }
      }
    }
  }

  const requestBody = {
    contents,
    generationConfig: {
      temperature: settings.temperature,
      maxOutputTokens: 8192,
    },
    safetySettings: Object.entries(settings.safetySettings).map(([category, threshold]) => ({
      category: `HARM_CATEGORY_${category.replace(/([A-Z])/g, '_$1').toUpperCase()}`,
      threshold,
    })),
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${settings.googleApiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google API error:', errorText)
    return new Response(`Google API error: ${response.statusText}`, { status: response.status })
  }

  // Stream the response
  const encoder = new TextEncoder()
  let stopReason = 'unknown'
  let totalTokens = 0
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }

      try {
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += new TextDecoder().decode(value)
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6))
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text
                if (text) {
                  controller.enqueue(encoder.encode(text))
                }
                
                // Capture stop reason and metadata
                const candidate = json.candidates?.[0]
                if (candidate?.finishReason) {
                  stopReason = candidate.finishReason
                }
                if (json.usageMetadata?.totalTokenCount) {
                  totalTokens = json.usageMetadata.totalTokenCount
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        console.log('[GOOGLE AI] Stop reason:', stopReason)
        console.log('[GOOGLE AI] Total tokens:', totalTokens)
        
        // Send stop reason info to client if unusual
        if (stopReason === 'MAX_TOKENS') {
          const warningMsg = '\n\n⚠️ *Response truncated: Maximum token limit reached.*'
          controller.enqueue(encoder.encode(warningMsg))
        } else if (stopReason === 'SAFETY') {
          const warningMsg = '\n\n⚠️ *Response blocked: Content filtered by safety settings. Try adjusting safety settings or rephrasing your request.*'
          controller.enqueue(encoder.encode(warningMsg))
        } else if (stopReason === 'RECITATION') {
          const warningMsg = '\n\n⚠️ *Response blocked: Potential copyrighted content detected.*'
          controller.enqueue(encoder.encode(warningMsg))
        } else if (stopReason === 'OTHER') {
          const warningMsg = '\n\n⚠️ *Response stopped: An error occurred.*'
          controller.enqueue(encoder.encode(warningMsg))
        } else if (stopReason !== 'STOP' && stopReason !== 'unknown') {
          console.warn('[GOOGLE AI] Unusual stop reason detected:', stopReason)
          const warningMsg = `\n\n⚠️ *Response stopped: ${stopReason}*`
          controller.enqueue(encoder.encode(warningMsg))
        }
        
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
