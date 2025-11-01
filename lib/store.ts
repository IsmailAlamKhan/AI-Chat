import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from './supabase'

export interface Message {
  id?: string
  chat_id?: string
  user_id?: string
  role: 'user' | 'assistant'
  content: string
  attachments?: Array<{ type: string; data: string }>
  created_at?: string
}

export interface Chat {
  id: string
  user_id: string
  title: string
  model?: string
  created_at: string
  summary?: string
  summary_up_to_message_id?: string
  messages_summarized?: number
  last_summarized_at?: string
  system_prompt?: string
}

export interface Settings {
  ollamaHost: string
  googleApiKey: string
  temperature: number
  safetySettings: {
    harassment: string
    hateSpeech: string
    sexuallyExplicit: string
    dangerousContent: string
  }
}

export interface UserProfile {
  user_id: string
  display_name: string
  avatar_url?: string
  bio?: string
}

interface ChatStore {
  // State
  chats: Chat[]
  messages: Message[]
  currentChatId: string | null
  isLoading: boolean
  isTitleGenerating: boolean
  isSummarizing: boolean
  settings: Settings
  selectedModel: string
  userProfile: UserProfile | null

  // Actions
  setChats: (chats: Chat[]) => void
  setMessages: (messages: Message[]) => void
  setCurrentChatId: (id: string | null) => void
  setIsLoading: (loading: boolean) => void
  setIsTitleGenerating: (loading: boolean) => void
  setIsSummarizing: (summarizing: boolean) => void
  setSettings: (settings: Partial<Settings>) => void
  setSelectedModel: (model: string) => void
  setUserProfile: (profile: UserProfile | null) => void
  updateChatTitle: (chatId: string, title: string) => void
  updateChatModel: (chatId: string, model: string) => void
  updateChatSystemPrompt: (chatId: string, systemPrompt: string) => void
  
  loadChats: (userId: string) => Promise<void>
  loadMessages: (chatId: string) => Promise<void>
  addMessage: (message: Message) => void
  appendStreamToLastMessage: (chunk: string) => void
  createChat: (userId: string, title: string, model?: string) => Promise<string | null>
  saveMessage: (message: Message) => Promise<void>
  deleteChat: (chatId: string) => Promise<void>
  loadUserPreferences: (userId: string) => Promise<void>
  saveUserPreferences: (userId: string) => Promise<void>
  loadUserProfile: (userId: string) => Promise<void>
  updateUserProfile: (userId: string, updates: Partial<Omit<UserProfile, 'user_id'>>) => Promise<void>
}

export const useStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      chats: [],
      messages: [],
      currentChatId: null,
      isLoading: false,
      isTitleGenerating: false,
      isSummarizing: false,
      selectedModel: '',
      userProfile: null,
      settings: {
        ollamaHost: '',
        googleApiKey: '',
        temperature: 0.7,
        safetySettings: {
          harassment: 'BLOCK_MEDIUM_AND_ABOVE',
          hateSpeech: 'BLOCK_MEDIUM_AND_ABOVE',
          sexuallyExplicit: 'BLOCK_MEDIUM_AND_ABOVE',
          dangerousContent: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      },

      // Actions
      setChats: (chats) => set({ chats }),
      setMessages: (messages) => set({ messages }),
      setCurrentChatId: (id) => set({ currentChatId: id }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsTitleGenerating: (loading) => set({ isTitleGenerating: loading }),
      setIsSummarizing: (summarizing) => set({ isSummarizing: summarizing }),
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setUserProfile: (profile) => set({ userProfile: profile }),
      updateChatTitle: (chatId, title) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, title } : chat
          ),
        })),
      
      updateChatModel: (chatId, model) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, model } : chat
          ),
        })),
      
      updateChatSystemPrompt: (chatId, systemPrompt) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, system_prompt: systemPrompt } : chat
          ),
        })),

      loadChats: async (userId: string) => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('chats')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading chats:', error)
          return
        }

        set({ chats: data || [] })
      },

      loadMessages: async (chatId: string) => {
        const supabase = createClient()
        
        // Load messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Error loading messages:', messagesError)
          return
        }

        // Load chat to get the model, summary info, and system prompt
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('model, summary, messages_summarized, system_prompt')
          .eq('id', chatId)
          .single()

        if (chatError) {
          console.error('Error loading chat:', chatError)
        }

        // Update the chat in the chats array with latest summary info and system prompt
        if (chatData) {
          set((state) => ({
            chats: state.chats.map(chat => 
              chat.id === chatId 
                ? { 
                    ...chat, 
                    summary: chatData.summary, 
                    messages_summarized: chatData.messages_summarized,
                    system_prompt: chatData.system_prompt 
                  }
                : chat
            )
          }))
        }

        // Update messages, current chat, and selected model
        set({ 
          messages: messagesData || [], 
          currentChatId: chatId,
          selectedModel: chatData?.model || get().selectedModel
        })
      },

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      appendStreamToLastMessage: (chunk) =>
        set((state) => {
          const messages = [...state.messages]
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1]
            if (lastMessage.role === 'assistant') {
              lastMessage.content += chunk
            }
          }
          return { messages }
        }),

      createChat: async (userId: string, title: string, model?: string): Promise<string | null> => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('chats')
          .insert([{ user_id: userId, title, model }])
          .select()
          .single()

        if (error) {
          console.error('Error creating chat:', error)
          return null
        }

        set((state) => ({
          chats: [data, ...state.chats],
          currentChatId: data.id,
        }))

        return data.id
      },

      saveMessage: async (message: Message) => {
        const supabase = createClient()
        const { error } = await supabase.from('messages').insert([message])

        if (error) {
          console.error('Error saving message:', error)
        }
      },

      deleteChat: async (chatId: string) => {
        const supabase = createClient()
        
        // First delete all messages for this chat
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('chat_id', chatId)

        if (messagesError) {
          console.error('Error deleting messages:', messagesError)
          throw messagesError
        }

        // Then delete the chat itself
        const { error: chatError } = await supabase
          .from('chats')
          .delete()
          .eq('id', chatId)

        if (chatError) {
          console.error('Error deleting chat:', chatError)
          throw chatError
        }

        // Update local state
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== chatId),
          ...(state.currentChatId === chatId ? { currentChatId: null, messages: [] } : {}),
        }))
      },

      loadUserPreferences: async (userId: string) => {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading user preferences:', error)
          return
        }

        if (data) {
          set({
            settings: {
              ollamaHost: data.ollama_host || '',
              googleApiKey: data.google_api_key || '',
              temperature: data.temperature || 0.7,
              safetySettings: data.safety_settings || {
                harassment: 'BLOCK_MEDIUM_AND_ABOVE',
                hateSpeech: 'BLOCK_MEDIUM_AND_ABOVE',
                sexuallyExplicit: 'BLOCK_MEDIUM_AND_ABOVE',
                dangerousContent: 'BLOCK_MEDIUM_AND_ABOVE',
              },
            },
            selectedModel: data.selected_model || '',
          })
        }
      },

      saveUserPreferences: async (userId: string) => {
        const supabase = createClient()
        const state = get()
        
        const { error } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: userId,
              ollama_host: state.settings.ollamaHost,
              google_api_key: state.settings.googleApiKey,
              temperature: state.settings.temperature,
              selected_model: state.selectedModel,
              safety_settings: state.settings.safetySettings,
            },
            {
              onConflict: 'user_id', // Update existing record based on user_id
            }
          )

        if (error) {
          console.error('Error saving user preferences:', error)
          throw error
        }
      },

      loadUserProfile: async (userId: string) => {
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error loading user profile:', error)
          return
        }

        if (data) {
          set({
            userProfile: {
              user_id: data.user_id,
              display_name: data.display_name,
              avatar_url: data.avatar_url,
              bio: data.bio,
            },
          })
        }
      },

      updateUserProfile: async (userId: string, updates: Partial<Omit<UserProfile, 'user_id'>>) => {
        const supabase = createClient()
        
        const { error } = await supabase
          .from('user_profiles')
          .upsert(
            {
              user_id: userId,
              ...updates,
            },
            {
              onConflict: 'user_id',
            }
          )

        if (error) {
          console.error('Error updating user profile:', error)
          throw error
        }

        // Update local state
        set((state) => ({
          userProfile: state.userProfile ? { ...state.userProfile, ...updates } : null,
        }))
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        settings: state.settings,
        selectedModel: state.selectedModel,
        userProfile: state.userProfile,
      }),
    }
  )
)
