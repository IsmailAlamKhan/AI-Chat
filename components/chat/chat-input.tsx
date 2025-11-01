'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Paperclip, X, StopCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase'

export function ChatInput() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Array<{ type: string; data: string }>>([])
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const {
    currentChatId,
    messages,
    selectedModel,
    settings,
    isLoading,
    setIsLoading,
    setIsSummarizing,
    setCurrentChatId,
    addMessage,
    appendStreamToLastMessage,
    setIsTitleGenerating,
    updateChatTitle,
    updateChatModel,
  } = useStore()

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string
          setAttachments((prev) => [...prev, { type: file.type, data: dataUrl }])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setIsLoading(false)
      toast.info('Message cancelled')
      
      // Remove the last (empty) assistant message
      const store = useStore.getState()
      const msgs = store.messages
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && !msgs[msgs.length - 1].content) {
        store.setMessages(msgs.slice(0, -1))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading || !selectedModel) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('Please sign in to chat')
      return
    }

    // Create abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)
    setIsLoading(true)
    const userMessageContent = input
    
    try {
      let chatId = currentChatId

      // Track if this is a new chat
      const isNewChat = !chatId
      
      // Create new chat if needed
      if (!chatId) {
        const store = useStore.getState()
        
        // Create chat with placeholder title and model
        chatId = await store.createChat(user.id, 'New Conversation', selectedModel)
        
        if (!chatId) {
          throw new Error('Failed to create chat')
        }
      } else {
        // Update model if it changed mid-conversation
        updateChatModel(chatId, selectedModel)
        
        // Also update in database
        await supabase
          .from('chats')
          .update({ model: selectedModel })
          .eq('id', chatId)
      }

      // Generate title only for new chats (on first message)
      const generateTitle = async () => {
        try {
          // Get the current chat to check its title
          const { data: chatData } = await supabase
            .from('chats')
            .select('title')
            .eq('id', chatId)
            .single()

          // Only generate if it's still "New Conversation"
          if (!chatData || chatData.title !== 'New Conversation') {
            console.log('Skipping title generation - chat already has a title')
            return
          }

          // Set loading state for title generation
          setIsTitleGenerating(true)
          
          console.log('Generating title for new chat:', chatId, 'with model:', selectedModel)
          
          const titleResponse = await fetch('/api/generate-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userMessageContent,
              model: selectedModel,
              settings,
            }),
          })

          if (titleResponse.ok) {
            const { title } = await titleResponse.json()
            console.log('Generated title:', title)
            
            // Update local state instantly
            updateChatTitle(chatId, title)
            
            // Then update DB in background
            const { error } = await supabase
              .from('chats')
              .update({ title })
              .eq('id', chatId)
            
            if (error) {
              console.error('Error updating title in DB:', error)
            } else {
              console.log('Title updated in DB')
            }
          } else {
            console.error('Title generation response not OK:', titleResponse.status, await titleResponse.text())
          }
        } catch (err) {
          console.error('Failed to generate title:', err)
          // Not critical, don't show error to user
        } finally {
          // Clear loading state
          setIsTitleGenerating(false)
        }
      }

      // Generate title in background (only for new chats)
      generateTitle()

      // Add user message
      const userMessage = {
        role: 'user' as const,
        content: input,
        attachments: attachments.length > 0 ? attachments : undefined,
      }
      
      addMessage(userMessage)

      // Clear input
      setInput('')
      setAttachments([])

      // Add empty assistant message
      addMessage({ role: 'assistant', content: '' })

      // Build message history
      const messageHistory = [...messages, userMessage]

      // Check if summarization will be triggered (threshold: 20 messages, re-summarize every 20)
      const SUMMARIZATION_THRESHOLD = 20
      const { data: chatData } = await supabase
        .from('chats')
        .select('messages_summarized')
        .eq('id', chatId)
        .single()
      
      const messagesSummarized = chatData?.messages_summarized || 0
      const willSummarize = messageHistory.length >= SUMMARIZATION_THRESHOLD && 
                           messageHistory.length > messagesSummarized + SUMMARIZATION_THRESHOLD
      
      if (willSummarize) {
        console.log('[CHAT INPUT] Summarization will be triggered')
        setIsSummarizing(true)
      }

      // Stream response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messageHistory,
          model: selectedModel,
          chatId,
          settings,
        }),
        signal: controller.signal,
      })
      
      // Clear summarization state after API responds
      if (willSummarize) {
        setIsSummarizing(false)
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `API error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullResponse += chunk
        appendStreamToLastMessage(chunk)
      }

      // Save assistant message to database
      const store = useStore.getState()
      await store.saveMessage({
        chat_id: chatId,
        user_id: user.id,
        role: 'assistant',
        content: fullResponse,
      })
      
      // Navigate to chat page after message is sent (for new chats)
      if (isNewChat && chatId) {
        router.push(`/chat/${chatId}`)
      }

    } catch (error: any) {
      console.error('Error sending message:', error)
      
      // Handle abort
      if (error.name === 'AbortError') {
        return // Already handled in handleCancel
      }
      
      // Show error in toast
      const errorMsg = error.message || 'Failed to send message. Please try again.'
      toast.error(errorMsg)
      
      // Show error in chat
      const store = useStore.getState()
      const lastMessage = store.messages[store.messages.length - 1]
      if (lastMessage && lastMessage.role === 'assistant') {
        // Update the last message with error
        const updatedMessages = [...store.messages]
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: `❌ **Error**: ${errorMsg}\n\nPlease check your settings and try again.`,
        }
        store.setMessages(updatedMessages)
      }
    } finally {
      setAbortController(null)
      setIsLoading(false)
      setIsSummarizing(false)  // Ensure it's cleared even on error
    }
  }

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-[11px]">
      <form onSubmit={handleSubmit} className="space-y-3">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, idx) => (
              <div key={idx} className="relative">
                <img
                  src={attachment.data}
                  alt="Attachment"
                  className="h-16 w-16 rounded-lg border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-5 w-5"
                  onClick={() => removeAttachment(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[0px] flex-1 resize-none"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />

          {isLoading ? (
            <Button type="button" size="icon" variant="destructive" onClick={handleCancel}>
              <StopCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim() || !selectedModel}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
