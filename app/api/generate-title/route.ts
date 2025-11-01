import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface TitleRequest {
  message: string
  model: string
  settings: {
    ollamaHost: string
    googleApiKey: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TitleRequest = await request.json()
    const { message, model, settings } = body

    console.log('[TITLE GEN] Starting title generation')
    console.log('[TITLE GEN] Original model:', model)
    console.log('[TITLE GEN] Message preview:', message.slice(0, 100))

    const prompt = `Generate a short, concise title (max 6 words) for this conversation. Only respond with the title, no quotes or explanations.`

    // Only use Ollama for title generation (Google models with thinking mode are unreliable)
    if (settings.ollamaHost && model.startsWith('ollama/')) {
      console.log('[TITLE GEN] Using Ollama')
      return await generateOllamaTitle(prompt, model.replace('ollama/', ''), settings.ollamaHost)
    }

    // Smart fallback: extract meaningful title from conversation (no AI needed)
    console.log('[TITLE GEN] Using smart text extraction (no AI)')
    const firstUserMessage = message.split('\n').find(line => line.startsWith('user:'))?.replace('user:', '').trim() || message
    const title = generateSmartTitle(firstUserMessage)
    console.log('[TITLE GEN] Generated title:', title)
    
    return NextResponse.json({ title })
  } catch (error) {
    console.error('[TITLE GEN] Error:', error)
    // Return fallback title
    return NextResponse.json({ 
      title: 'New Conversation'
    })
  }
}

async function generateOllamaTitle(prompt: string, modelName: string, ollamaHost: string) {
  try {
    console.log('[OLLAMA TITLE] Model name:', modelName)
    console.log('[OLLAMA TITLE] Host:', ollamaHost)
    
    if (!ollamaHost) {
      throw new Error('Ollama host not configured')
    }
    
    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        options: {
          temperature: 0.5,
          num_predict: 50, // Allow up to 50 tokens for title
          stop: ['\n', '.', '!', '?'], // Stop at punctuation
        },
      }),
    })

    console.log('[OLLAMA TITLE] Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OLLAMA TITLE] API error:', response.status, errorText)
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('[OLLAMA TITLE] Response data:', JSON.stringify(data, null, 2))
    
    const title = data.response?.trim().replace(/['"]/g, '') || 'New Conversation'
    console.log('[OLLAMA TITLE] Final title:', title)
    
    return NextResponse.json({ title: title.slice(0, 60) })
  } catch (error) {
    console.error('[OLLAMA TITLE] Error:', error)
    throw error
  }
}

function generateSmartTitle(text: string): string {
  // Clean the text
  let clean = text
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\n/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()

  // If it's a code block or very technical, extract meaningful parts
  if (clean.includes('```') || clean.includes('{') || clean.includes('(')) {
    // Look for keywords that indicate the topic
    const keywords = clean.match(/\b(?:create|build|make|generate|write|code|implement|fix|debug|help|how|what|why|explain)\b/gi)
    if (keywords) {
      // Extract a few words around the first keyword
      const keywordIndex = clean.toLowerCase().indexOf(keywords[0].toLowerCase())
      const start = Math.max(0, keywordIndex - 10)
      const snippet = clean.slice(start, keywordIndex + 50)
      clean = snippet.replace(/^\W+/, '').trim()
    }
  }

  // Take first meaningful sentence or up to 50 chars
  const sentences = clean.split(/[.!?]+/)
  let title = sentences[0].trim()

  // If too long, take first 50 chars and add ellipsis
  if (title.length > 50) {
    title = title.slice(0, 50).trim()
    // Try to cut at word boundary
    const lastSpace = title.lastIndexOf(' ')
    if (lastSpace > 30) {
      title = title.slice(0, lastSpace)
    }
    title += '...'
  }

  // Capitalize first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  return title || 'New Conversation'
}
