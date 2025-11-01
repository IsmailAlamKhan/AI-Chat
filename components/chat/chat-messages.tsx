'use client'

import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { ChatMessage } from './chat-message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowDown } from 'lucide-react'

export function ChatMessages() {
  const { messages, isLoading } = useStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isUserScrollingRef = useRef(false)
  const lastScrollHeightRef = useRef(0)

  // Check if user is near bottom
  const isNearBottom = () => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return true

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom < 100
  }

  // Handle manual scroll
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return

    let scrollTimeout: NodeJS.Timeout
    let lastScrollTop = scrollContainer.scrollTop

    const handleScroll = () => {
      const currentScrollTop = scrollContainer.scrollTop
      const { scrollHeight, clientHeight } = scrollContainer
      const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight
      
      // User is manually scrolling up
      if (currentScrollTop < lastScrollTop - 5) { // 5px threshold to avoid tiny fluctuations
        isUserScrollingRef.current = true
      }
      
      // User has scrolled back near bottom
      if (distanceFromBottom < 100) {
        isUserScrollingRef.current = false
      }
      
      lastScrollTop = currentScrollTop
      
      // Update scroll button visibility
      setShowScrollButton(distanceFromBottom > 100 && messages.length > 0)
      
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        // Reset after user stops scrolling
        const finalDistance = scrollHeight - scrollContainer.scrollTop - clientHeight
        if (finalDistance < 100) {
          isUserScrollingRef.current = false
        }
      }, 150)
    }

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [messages.length])

  // Auto-scroll when messages change (only if user hasn't scrolled up)
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return

    const currentScrollHeight = scrollContainer.scrollHeight
    const hasNewContent = currentScrollHeight !== lastScrollHeightRef.current
    lastScrollHeightRef.current = currentScrollHeight

    // Only auto-scroll if user hasn't manually scrolled up
    if (hasNewContent && !isUserScrollingRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    }
  }, [messages, isLoading])

  // Scroll to bottom manually
  const scrollToBottom = () => {
    isUserScrollingRef.current = false
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Start a conversation</h2>
          <p className="text-muted-foreground">
            Type a message below to begin chatting with AI
          </p>
        </div>
      </div>
    )
  }

  const lastMessage = messages[messages.length - 1]
  const showLoading = isLoading && lastMessage?.role === 'assistant' && !lastMessage?.content

  return (
    <div className="relative h-full w-full">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="flex flex-col w-full max-w-full overflow-hidden">
          {messages.map((message, index) => {
            // Don't render empty assistant messages (they're placeholders)
            if (message.role === 'assistant' && !message.content) {
              return null
            }
            return <ChatMessage key={message.id || index} message={message} index={index} />
          })}
          {showLoading && (
            <div className="flex gap-3 p-4 border-b bg-muted/30">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
                AI
              </div>
              <div className="flex items-center gap-2 text-muted-foreground pt-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-4 right-4 rounded-full shadow-lg z-10"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
