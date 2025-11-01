import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { ollamaHost, googleApiKey } = await request.json()

    const results = {
      ollama: { success: false, error: '' },
      google: { success: false, error: '' },
    }

    // Test Ollama if URL is provided
    if (ollamaHost) {
      try {
        // Remove trailing slash to avoid double slashes
        const cleanHost = ollamaHost.replace(/\/$/, '')
        const ollamaRes = await fetch(`${cleanHost}/api/tags`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })
        
        if (ollamaRes.ok) {
          results.ollama.success = true
        } else {
          results.ollama.error = `HTTP ${ollamaRes.status}: ${ollamaRes.statusText}`
        }
      } catch (err: any) {
        results.ollama.error = err.message || 'Connection failed'
      }
    }

    // Test Google AI if API key is provided
    if (googleApiKey) {
      try {
        const googleRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${googleApiKey}`,
          {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // 5 second timeout
          }
        )
        
        if (googleRes.ok) {
          results.google.success = true
        } else {
          results.google.error = `HTTP ${googleRes.status}: Invalid API key`
        }
      } catch (err: any) {
        results.google.error = err.message || 'Connection failed'
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to test connections' },
      { status: 500 }
    )
  }
}

