'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'

interface SystemPromptDialogProps {
  chatId: string
}

export function SystemPromptDialog({ chatId }: SystemPromptDialogProps) {
  const [open, setOpen] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { chats, updateChatSystemPrompt } = useStore()

  const currentChat = chats.find((c) => c.id === chatId)

  // Load system prompt when dialog opens
  useEffect(() => {
    if (open && currentChat) {
      setSystemPrompt(currentChat.system_prompt || '')
    }
  }, [open, currentChat])

  const handleSave = async () => {
    if (!chatId) return

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('chats')
        .update({ system_prompt: systemPrompt.trim() || null })
        .eq('id', chatId)

      if (error) throw error

      // Update local state
      updateChatSystemPrompt(chatId, systemPrompt.trim())
      setOpen(false)
      toast.success('System prompt updated')
    } catch (error) {
      console.error('Error updating system prompt:', error)
      toast.error('Failed to update system prompt')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Edit system prompt"
        >
          <Sparkles className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>System Prompt</DialogTitle>
          <DialogDescription>
            Custom instructions for this conversation. This prompt will be sent to the AI at the start of every message.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Instructions</Label>
            <Textarea
              id="system-prompt"
              placeholder="You are a helpful assistant. Be concise and friendly..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use default behavior. The system prompt takes priority over other context.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

