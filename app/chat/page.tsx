'use client'

import { useEffect } from 'react'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { ModelSelector } from '@/components/chat/model-selector'
import { SettingsDialog } from '@/components/settings-dialog'
import { ProfileDialog } from '@/components/profile-dialog'
import { useStore } from '@/lib/store'

export default function NewChatPage() {
  const { setCurrentChatId, setMessages } = useStore()

  useEffect(() => {
    // Reset state for new chat (chats already loaded in layout)
    setCurrentChatId(null)
    setMessages([])
  }, [setCurrentChatId, setMessages])

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

