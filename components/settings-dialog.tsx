'use client'

import { useState, useEffect } from 'react'
import { Settings, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { Separator } from '@/components/ui/separator'

const SAFETY_OPTIONS = [
  { value: 'BLOCK_NONE', label: 'Block None' },
  { value: 'BLOCK_ONLY_HIGH', label: 'Block Only High' },
  { value: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Block Medium and Above' },
  { value: 'BLOCK_LOW_AND_ABOVE', label: 'Block Low and Above' },
]

export function SettingsDialog() {
  const { settings, setSettings, saveUserPreferences } = useStore()
  const [open, setOpen] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [ollamaHostError, setOllamaHostError] = useState('')

  // Sync localSettings with store settings when dialog opens or settings change
  useEffect(() => {
    if (open) {
      setLocalSettings(settings)
    }
  }, [open, settings])

  const validateOllamaHost = (url: string) => {
    // Empty is valid - Ollama is optional
    if (!url) {
      return ''
    }
    try {
      new URL(url)
      return ''
    } catch {
      return 'Please enter a valid URL'
    }
  }

  const handleSave = async () => {
    // Validate URL format first (only if provided)
    const ollamaErr = validateOllamaHost(localSettings.ollamaHost)
    
    if (ollamaErr) {
      setOllamaHostError(ollamaErr)
      return
    }

    // Check if at least one API is configured
    if (!localSettings.ollamaHost && !localSettings.googleApiKey) {
      toast.error('Please configure at least one API (Ollama or Google AI)')
      return
    }

    // Test connections before saving
    const toastId = toast.loading('Validating API connections...')
    
    try {
      // Test Ollama if URL is provided
      if (localSettings.ollamaHost) {
        try {
          const ollamaRes = await fetch(`${localSettings.ollamaHost}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // 5 second timeout
          })
          if (!ollamaRes.ok) {
            toast.error('Failed to connect to Ollama. Please check the host URL.', { id: toastId })
            return
          }
        } catch (err) {
          toast.error('Failed to connect to Ollama. Please check the host URL and ensure Ollama is running.', { id: toastId })
          return
        }
      }

      // Test Google AI if API key is provided
      if (localSettings.googleApiKey) {
        try {
          const googleRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${localSettings.googleApiKey}`,
            {
              method: 'GET',
              signal: AbortSignal.timeout(5000), // 5 second timeout
            }
          )
          if (!googleRes.ok) {
            toast.error('Invalid Google AI API key. Please check your key.', { id: toastId })
            return
          }
        } catch (err) {
          toast.error('Failed to validate Google AI API key. Please check your key.', { id: toastId })
          return
        }
      }

      // If validation passed, save settings
      setSettings(localSettings)
      
      // Save to database
      try {
        const { createClient } = await import('@/lib/supabase')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await saveUserPreferences(user.id)
        }
      } catch (saveError) {
        console.error('Error saving preferences to DB:', saveError)
      }
      
      toast.success('Settings validated and saved successfully!', { id: toastId })
      setOpen(false)
    } catch (error) {
      toast.error('Failed to validate settings', { id: toastId })
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset to saved settings if closing without saving
      setLocalSettings(settings)
      setOllamaHostError('')
    }
    setOpen(newOpen)
  }

  const handleOllamaHostChange = (value: string) => {
    setLocalSettings({ ...localSettings, ollamaHost: value })
    if (ollamaHostError) {
      setOllamaHostError(validateOllamaHost(value))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your API keys and generation parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* API Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">API Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="ollama-host">Ollama Host URL (Optional)</Label>
              <Input
                id="ollama-host"
                type="url"
                placeholder="http://localhost:11434"
                value={localSettings.ollamaHost}
                onChange={(e) => handleOllamaHostChange(e.target.value)}
                className={ollamaHostError ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {ollamaHostError ? (
                <p className="text-sm text-destructive">{ollamaHostError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The URL where your Ollama instance is running. Leave empty if not using Ollama.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="google-api-key">Google AI API Key (Optional)</Label>
              <div className="relative">
                <Input
                  id="google-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Enter your API key"
                  value={localSettings.googleApiKey}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, googleApiKey: e.target.value })
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Google AI Studio
                </a>
                . Leave empty if not using Google AI.
              </p>
            </div>
          </div>

          <Separator />

          {/* Generation Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generation Parameters</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="temperature">Temperature</Label>
                <span className="text-sm text-muted-foreground">
                  {localSettings.temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                value={[localSettings.temperature]}
                onValueChange={([value]) =>
                  setLocalSettings({ ...localSettings, temperature: value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher values make output more random, lower values more deterministic
              </p>
            </div>
          </div>

          <Separator />

          {/* Google AI Safety Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Google AI Safety Settings</h3>
            
            <div className="space-y-2">
              <Label htmlFor="safety-harassment">Harassment</Label>
              <Select
                value={localSettings.safetySettings.harassment}
                onValueChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    safetySettings: {
                      ...localSettings.safetySettings,
                      harassment: value,
                    },
                  })
                }
              >
                <SelectTrigger id="safety-harassment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAFETY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety-hate-speech">Hate Speech</Label>
              <Select
                value={localSettings.safetySettings.hateSpeech}
                onValueChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    safetySettings: {
                      ...localSettings.safetySettings,
                      hateSpeech: value,
                    },
                  })
                }
              >
                <SelectTrigger id="safety-hate-speech">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAFETY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety-sexually-explicit">Sexually Explicit</Label>
              <Select
                value={localSettings.safetySettings.sexuallyExplicit}
                onValueChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    safetySettings: {
                      ...localSettings.safetySettings,
                      sexuallyExplicit: value,
                    },
                  })
                }
              >
                <SelectTrigger id="safety-sexually-explicit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAFETY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="safety-dangerous-content">Dangerous Content</Label>
              <Select
                value={localSettings.safetySettings.dangerousContent}
                onValueChange={(value) =>
                  setLocalSettings({
                    ...localSettings,
                    safetySettings: {
                      ...localSettings.safetySettings,
                      dangerousContent: value,
                    },
                  })
                }
              >
                <SelectTrigger id="safety-dangerous-content">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAFETY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
