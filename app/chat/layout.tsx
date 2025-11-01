'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import { ChatHistorySidebar } from '@/components/chat/chat-history-sidebar'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { loadUserPreferences, loadUserProfile, loadChats } = useStore()

  useEffect(() => {
    const initializeApp = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Load all user data in parallel (only once on mount)
      await Promise.all([
        loadUserPreferences(user.id),
        loadUserProfile(user.id),
        loadChats(user.id),
      ])
    }

    initializeApp()
  }, [router, loadUserPreferences, loadUserProfile, loadChats])

  return (
    <div className="flex h-screen">
      <ChatHistorySidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}

