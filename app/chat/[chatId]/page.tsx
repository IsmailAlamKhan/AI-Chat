'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { ModelSelector } from '@/components/chat/model-selector'
import { SettingsDialog } from '@/components/settings-dialog'
import { ProfileDialog } from '@/components/profile-dialog'
import { ModelBadge } from '@/components/chat/model-badge'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SystemPromptDialog } from '@/components/chat/system-prompt-dialog'

export default function ChatPage() {
  const params = useParams()
  const chatId = params.chatId as string
  const { loadMessages, chats, isTitleGenerating, updateChatTitle, messages, selectedModel, settings } = useStore()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false)

  useEffect(() => {
    if (chatId) {
      loadMessages(chatId)
    }
  }, [chatId, loadMessages])

  const currentChat = chats.find((c) => c.id === chatId)

  const handleEditTitle = () => {
    setEditedTitle(currentChat?.title || '')
    setIsEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || !chatId) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('chats')
        .update({ title: editedTitle.trim() })
        .eq('id', chatId)

      if (error) throw error

      // Update local state
      updateChatTitle(chatId, editedTitle.trim())
      setIsEditingTitle(false)
      toast.success('Title updated')
    } catch (error) {
      console.error('Error updating title:', error)
      toast.error('Failed to update title')
    }
  }

  const handleCancelEdit = () => {
    setIsEditingTitle(false)
    setEditedTitle('')
  }

  const handleRegenerateTitle = async () => {
    if (!chatId || !selectedModel || messages.length === 0) {
      toast.error('Need messages to generate title')
      return
    }

    setIsRegeneratingTitle(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Please sign in')
        return
      }

      const titleResponse = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: messages.slice(0, 10), // Use first 10 messages for context
          model: selectedModel,
          settings,
        }),
      })

      if (!titleResponse.ok) {
        throw new Error('Failed to generate title')
      }

      const { title } = await titleResponse.json()
      
      // Update in database
      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId)

      if (error) throw error

      // Update local state
      updateChatTitle(chatId, title)
      toast.success('Title regenerated')
    } catch (error) {
      console.error('Error regenerating title:', error)
      toast.error('Failed to regenerate title')
    } finally {
      setIsRegeneratingTitle(false)
    }
  }

  return (
    <div className="flex h-screen flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 mr-4">
          {isTitleGenerating && currentChat?.title === 'New Conversation' ? (
            <div className="h-7 w-48 bg-muted animate-pulse rounded" />
          ) : isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                className="h-8 text-lg font-semibold"
                autoFocus
              />
              <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="text-xl font-semibold truncate cursor-default">
                      {currentChat?.title || 'Chat'}
                    </h1>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{currentChat?.title || 'Chat'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleEditTitle}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit title"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleRegenerateTitle}
                      disabled={isRegeneratingTitle || messages.length === 0}
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Regenerate title with AI"
                    >
                      <Sparkles className={`h-3 w-3 ${isRegeneratingTitle ? 'animate-pulse' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Regenerate title with AI</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SystemPromptDialog chatId={chatId} />
            </div>
          )}
          {currentChat?.model && (
            <div className="self-start">
              <ModelBadge model={currentChat.model} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ModelSelector />
          <SettingsDialog />
          <ProfileDialog />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden bg-muted/20 w-full max-w-full">
        <ChatMessages />
      </div>

      {/* Input Area */}
      <ChatInput />
    </div>
  )
}

