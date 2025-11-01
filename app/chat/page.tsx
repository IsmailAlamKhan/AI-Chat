'use client'

import { useEffect } from 'react'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { ModelSelector } from '@/components/chat/model-selector'
import { SettingsDialog } from '@/components/settings-dialog'
import { ProfileDialog } from '@/components/profile-dialog'
import { useStore } from '@/lib/store'

export default function NewChatPage() {
  const { setCurrentChatId, setMessages, loadChats } = useStore()

  useEffect(() => {
    // Reset state for new chat
    setCurrentChatId(null)
    setMessages([])
    
    // Reload chats to ensure sidebar is up to date
    const loadUserChats = async () => {
      const { createClient } = await import('@/lib/supabase')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await loadChats(user.id)
      }
    }
    
    loadUserChats()
  }, [setCurrentChatId, setMessages, loadChats])

  return (
    <div className="flex h-screen flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <h1 className="text-xl font-semibold">New Chat</h1>
        <div className="flex items-center gap-2">
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

