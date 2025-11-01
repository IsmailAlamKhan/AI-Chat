'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChatHistorySidebar } from '@/components/chat/chat-history-sidebar'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="flex h-screen">
      <ChatHistorySidebar />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}

