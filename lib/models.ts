export interface Model {
  id: string
  name: string
  provider: 'ollama' | 'google'
  vision: boolean
}
