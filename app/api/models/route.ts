import { NextRequest, NextResponse } from 'next/server'
import { Model } from '@/lib/models'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ollamaHost = searchParams.get('ollamaHost')
  const googleApiKey = searchParams.get('googleApiKey')

  const models: Model[] = []

  // Fetch Ollama models only if host is provided
  if (ollamaHost) {
    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        const ollamaModels: Model[] = data.models?.map((model: any) => ({
          id: `ollama/${model.name}`,
          name: model.name,
          provider: 'ollama' as const,
          vision: model.name.toLowerCase().includes('vision') || 
                 model.name.toLowerCase().includes('llava') ||
                 model.name.toLowerCase().includes('minicpm'),
        })) || []
        models.push(...ollamaModels)
      }
    } catch (error) {
      console.error('Error fetching Ollama models:', error)
    }
  }

  // Fetch Google models dynamically if API key is provided
  if (googleApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${googleApiKey}`,
        {
          method: 'GET',
        }
      )

      if (response.ok) {
        const data = await response.json()
        const googleModels: Model[] = data.models
          ?.filter((model: any) => 
            model.supportedGenerationMethods?.includes('generateContent')
          )
          .map((model: any) => {
            const modelId = model.name.replace('models/', '')
            return {
              id: `google/${modelId}`,
              name: modelId
                .split('-')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
              provider: 'google' as const,
              vision: model.supportedGenerationMethods?.includes('generateContent'),
            }
          }) || []
        models.push(...googleModels)
      }
    } catch (error) {
      console.error('Error fetching Google models:', error)
    }
  }

  return NextResponse.json({ models })
}
