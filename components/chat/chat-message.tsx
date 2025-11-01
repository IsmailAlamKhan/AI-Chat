'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { Message, useStore } from '@/lib/store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Copy, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import 'highlight.js/styles/github-dark.css'

interface ChatMessageProps {
  message: Message
  index: number
}

export function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [copiedCode, setCopiedCode] = useState<number | null>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const { messages, setMessages, currentChatId } = useStore()

  // Load user's display name
  useEffect(() => {
    const loadDisplayName = async () => {
      if (!isUser) return
      
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const { data } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single()

        if (data?.display_name) {
          setDisplayName(data.display_name)
        }
      } catch (error) {
        console.error('Error loading display name:', error)
      }
    }

    loadDisplayName()
  }, [isUser])

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopiedMessage(true)
    toast.success('Message copied to clipboard')
    setTimeout(() => setCopiedMessage(false), 2000)
  }

  const handleCopyCode = async (code: string, codeIndex: number) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(codeIndex)
    toast.success('Code copied to clipboard')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDeletePair = async () => {
    if (!currentChatId) return

    try {
      const supabase = createClient()
      
      // Find the pair to delete (user message + assistant response)
      let userMsgIndex = -1
      let assistantMsgIndex = -1

      if (isUser) {
        userMsgIndex = index
        // Find next assistant message
        if (index + 1 < messages.length && messages[index + 1].role === 'assistant') {
          assistantMsgIndex = index + 1
        }
      } else {
        assistantMsgIndex = index
        // Find previous user message
        if (index - 1 >= 0 && messages[index - 1].role === 'user') {
          userMsgIndex = index - 1
        }
      }

      // Delete from database
      const messagesToDelete = [
        userMsgIndex >= 0 ? messages[userMsgIndex] : null,
        assistantMsgIndex >= 0 ? messages[assistantMsgIndex] : null,
      ].filter(msg => msg && msg.id)

      if (messagesToDelete.length > 0) {
        const { error } = await supabase
          .from('messages')
          .delete()
          .in('id', messagesToDelete.map(msg => msg!.id!))

        if (error) throw error
      }

      // Update local state
      const newMessages = messages.filter((_, i) => 
        i !== userMsgIndex && i !== assistantMsgIndex
      )
      setMessages(newMessages)

      toast.success('Messages deleted')
    } catch (error) {
      console.error('Error deleting messages:', error)
      toast.error('Failed to delete messages')
    }
  }

  return (
    <div className={cn('flex gap-3 p-4 group relative', isUser ? 'bg-muted/50' : 'bg-background')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(isUser ? 'bg-primary' : 'bg-secondary')}>
          {isUser ? 'U' : 'AI'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">
            {isUser ? (displayName || 'You') : 'Assistant'}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCopyMessage}
              className="h-7 w-7"
              title="Copy message"
            >
              {copiedMessage ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDeletePair}
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              title="Delete message pair"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((attachment, idx) => (
              attachment.type.startsWith('image/') && (
                <img
                  key={idx}
                  src={attachment.data}
                  alt="Uploaded"
                  className="max-w-xs rounded-lg border"
                />
              )
            ))}
          </div>
        )}
        
        <div className="prose prose-invert max-w-none break-words overflow-hidden">
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              code: ({ node, inline, className, children, ...props }: any) => {
                if (inline) {
                  return (
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm border border-border break-all" {...props}>
                      {children}
                    </code>
                  )
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              pre: ({ node, children, ...props }: any) => {
                // Extract code content for copy button
                let codeString = ''
                
                try {
                  const extractText = (child: any): string => {
                    if (typeof child === 'string') {
                      return child
                    }
                    if (Array.isArray(child)) {
                      return child.map(extractText).join('')
                    }
                    if (child?.props?.children) {
                      return extractText(child.props.children)
                    }
                    return String(child || '')
                  }
                  
                  codeString = extractText(children)
                } catch (e) {
                  console.error('Error extracting code:', e)
                  codeString = 'Error extracting code'
                }
                
                // Use a stable unique ID based on content
                const codeId = `code-${codeString.slice(0, 20).replace(/\s/g, '')}`
                
                return (
                  <div className="relative group/code my-4">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyCode(codeString, codeId.length)}
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/code:opacity-100 transition-opacity bg-background/80 hover:bg-background z-10"
                      title="Copy code"
                    >
                      {copiedCode === codeId.length ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <pre 
                      className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/50 p-4 w-full max-w-full overflow-hidden" 
                      {...props}
                    >
                      {children}
                    </pre>
                  </div>
                )
              },
              p: ({ node, children, ...props }: any) => {
                return (
                  <p className="break-words overflow-wrap-anywhere" {...props}>
                    {children}
                  </p>
                )
              },
              h1: ({ node, children, ...props }: any) => {
                return (
                  <div className="text-2xl font-bold space-y-2" {...props}>
                    {children}
                  </div>
                )
              },
              h2: ({ node, children, ...props }: any) => {
                return (
                  <div className="text-xl font-bold space-y-2" {...props}>
                    {children}
                  </div>
                )
              },
              h3: ({ node, children, ...props }: any) => {
                return (
                  <div className="text-lg font-bold space-y-2" {...props}>
                    {children}
                  </div>
                )
              },
              h4: ({ node, children, ...props }: any) => {
                return (
                  <div className="text-base font-bold space-y-2" {...props}>
                    {children}
                  </div>
                )
              },
              h5: ({ node, children, ...props }: any) => {
                return (
                  <div className="text-sm font-bold space-y-2" {...props}>
                    {children}
                  </div>
                )
              },
              h6: ({ node, children, ...props }: any) => {
                return (
                  <div className="text-xs font-bold space-y-2" {...props}>
                    {children}
                  </div>
                )
              },  
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
