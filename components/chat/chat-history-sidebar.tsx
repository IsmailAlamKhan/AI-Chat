'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Plus, MessageSquare, Trash2, MoreVertical, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase'
import { ModelBadge } from './model-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function ChatHistorySidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { chats, loadChats, setCurrentChatId, setMessages, deleteChat, loadUserPreferences, createChatFrom } = useStore()
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Load user preferences first
        await loadUserPreferences(user.id)
        // Then load chats
        await loadChats(user.id)
      }
    }

    loadUserData()
  }, [loadChats, loadUserPreferences])

  const handleNewChat = async () => {
    setCurrentChatId(null)
    setMessages([])
    
    // Navigate to new chat page to clear selected state
    router.push('/chat')
    
    // Reload chats to ensure clean state
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await loadChats(user.id)
    }
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId)
      toast.success('Chat deleted successfully')
      setOpenMenuId(null)
      
      // If we deleted the current chat, navigate to new chat
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat')
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast.error('Failed to delete chat')
    }
  }

  const handleCreateChatFrom = async (sourceChatId: string) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in')
        return
      }

      const newChatId = await createChatFrom(sourceChatId, user.id)
      
      if (newChatId) {
        toast.success('New chat created from this conversation')
        setOpenMenuId(null)
        router.push(`/chat/${newChatId}`)
      } else {
        toast.error('Failed to create chat')
      }
    } catch (error) {
      console.error('Error creating chat from source:', error)
      toast.error('Failed to create chat')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="p-4 border-b">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start gap-2"
          variant={pathname === '/chat' && !pathname.includes('/chat/') ? 'default' : 'outline'}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No chats yet
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`
              const isHovered = hoveredChatId === chat.id
              
              return (
                <div
                  key={chat.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => {
                    // Only clear hover if menu is not open
                    if (openMenuId !== chat.id) {
                      setHoveredChatId(null)
                    }
                  }}
                >
                        <Link href={`/chat/${chat.id}`} className="w-full">
                          <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full justify-start gap-2 text-left h-auto py-2 hover:bg-accent hover:text-accent-foreground',
                              isActive && 'bg-secondary hover:bg-secondary/80'
                            )}
                          >
                            <MessageSquare className="h-4 w-4 shrink-0" />
                            <div className="flex flex-col items-start gap-1 flex-1 min-w-0 max-w-[140px]">
                              <span className="truncate text-sm w-full font-medium">{chat.title}</span>
                              <div className="flex flex-col gap-0.5 w-full">
                                {chat.model && (
                                  <ModelBadge model={chat.model} className="text-[10px] max-w-[120px]" />
                                )}
                                {chat.updated_at && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDate(chat.updated_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </Button>
                        </Link>
                      
                  {isHovered && (
                    <Popover 
                      open={openMenuId === chat.id} 
                      onOpenChange={(open) => {
                        setOpenMenuId(open ? chat.id : null)
                        if (!open) {
                          setHoveredChatId(null)
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-1" align="end" side="left">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 text-sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleCreateChatFrom(chat.id)
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Create new chat from
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteChat(chat.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t mt-auto">
        <Link href="/login">
          <Button variant="outline" className="w-full">
            Sign Out
          </Button>
        </Link>
      </div>
    </div>
  )
}

