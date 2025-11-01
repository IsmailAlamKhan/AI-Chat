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
import { Pencil, Check, X } from 'lucide-react'
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
  const { loadMessages, chats, isTitleGenerating, updateChatTitle } = useStore()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')

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
              >
                <Pencil className="h-3 w-3" />
              </Button>
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

