<div align="center">

# 💬 AI Chat

**A beautiful, full-stack AI chat application with multi-provider support, real-time streaming, and persistent history.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-local-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Overview

AI Chat is a modern, production-ready chat interface built with **Next.js 16** and **React 19**. It supports both local AI models via [Ollama](https://ollama.com/) and cloud models via [Google AI (Gemini)](https://ai.google.dev/), all backed by a local **Supabase** instance for authentication, persistent chat history, and user profiles. Responses stream in real-time and the UI is crafted with **shadcn/ui** and Tailwind CSS for a clean, responsive dark-mode experience.

---

## ✨ Features

### 🤖 AI & Models
- **Dual Provider Support** — Connect to local Ollama models or Google Gemini models (both optional)
- - **Dynamic Model Fetching** — Available models are fetched live from each provider's API
  - - **Vision / Multimodal** — Upload images to compatible models (marked with an eye icon)
    - - **Real-time Streaming** — Responses stream token-by-token as they are generated
      - - **Personalized AI** — The AI is automatically injected with your display name and bio for contextual conversations
        - - **AI-Generated Titles** — Chat titles are automatically created from your first message
         
          - ### 💾 Data & Authentication
          - - **Full Auth** — Email/password sign-up and login via Supabase (email confirmation disabled in dev)
            - - **Persistent History** — All chats and messages are saved to the database and synced via Zustand
              - - **User Profiles** — Set a display name, avatar, and bio that carry into every conversation
                - - **Per-User Settings** — Ollama host, Google API key, temperature, and safety settings are saved per user
                 
                  - ### 🎨 UI & UX
                  - - **Beautiful Dark UI** — Modern design with Geist fonts and shadcn/ui components
                    - - **Markdown Rendering** — Full markdown with syntax-highlighted, copy-able code blocks
                      - - **Smart Scrolling** — Auto-scrolls to new messages; pauses when you scroll up; "Go to latest" button to resume
                        - - **Rich Message Actions** — Copy messages, delete message pairs, copy code blocks inline
                          - - **Model Badge** — Each conversation shows which model was used
                           
                            - ### ⚙️ Configuration & Deployment
                            - - **Settings Dialog** — Configure providers, temperature, and safety settings with built-in API validation
                              - - **Docker Support** — Production-ready `docker-compose.yml` included

                              ---

                              ## 🛠️ Tech Stack

                              | Category | Technology |
                              |---|---|
                              | Framework | Next.js 16 (App Router) |
                              | Language | TypeScript 5 |
                              | Database & Auth | Supabase (local instance) |
                              | UI Components | shadcn/ui + Tailwind CSS v4 |
                              | State Management | Zustand v5 |
                              | Markdown | react-markdown + rehype-highlight |
                              | AI Providers | Ollama (local) · Google AI (Gemini) |
                              | Notifications | Sonner |

                              ---

                              ## 📋 Prerequisites

                              - **Node.js** 18+ and npm
                              - - **Docker Desktop** (required for local Supabase)
                                - - **Ollama** *(optional)* — for running local models
                                  - - **Google AI API Key** *(optional)* — for Gemini models, available at [Google AI Studio](https://aistudio.google.com/)
                                   
                                    - ---

                                    ## 🚀 Getting Started

                                    ### 1. Clone the repository

                                    ```bash
                                    git clone https://github.com/IsmailAlamKhan/AI-Chat.git
                                    cd AI-Chat
                                    ```

                                    ### 2. Install dependencies

                                    ```bash
                                    npm install
                                    ```

                                    ### 3. Start Supabase

                                    Make sure **Docker Desktop** is running, then:

                                    ```bash
                                    npx supabase start
                                    ```

                                    This spins up a local Supabase instance. The required credentials are pre-configured in `.env.local`.

                                    ### 4. Run the development server

                                    ```bash
                                    npm run dev
                                    ```

                                    Open [http://localhost:3000](http://localhost:3000) in your browser.

                                    ### 5. Create an account

                                    Click **Sign Up** on the login page and enter your email and password (minimum 6 characters). Email confirmation is disabled in local development — you will be logged in immediately.

                                    ---

                                    ## ⚙️ Configuration

                                    ### Profile (Optional)

                                    Click the **profile icon** to set:
                                    - **Display Name** — Shown in chats and passed to the AI
                                    - **Avatar** — Upload a profile picture
                                    - - **Bio** — Context about yourself that the AI uses in conversations
                                     
                                      - ### Settings (⚙️ icon)
                                     
                                      - | Setting | Description |
                                      - |---|---|
                                      - | Ollama Host URL | URL of your running Ollama instance (e.g. `http://localhost:11434`) |
                                      | Google AI API Key | Your key from [Google AI Studio](https://aistudio.google.com/) |
| Temperature | Response randomness from `0.0` (focused) to `2.0` (creative) |
| Safety Settings | Content filtering options for Google AI |

Settings are validated against the provider APIs before saving.

---

## 🧭 Using the App

### Starting a conversation

1. Select a model from the dropdown (Ollama or Google AI)
2. 2. Type your message and press **Enter** or click the send button
3. Watch the AI response stream in real-time
4. 4. The chat title is automatically generated from your first message
  
   5. ### Using vision models

   1. Select a model with the **eye icon** (vision-capable)
   2. 2. Click the **paperclip icon** to attach an image
   3. Add your text prompt and send
  
   4. ### Managing chats
  
   5. | Action | How |
   6. |---|---|
   7. | New Chat | Click **New Chat** in the sidebar |
   8. | View history | Click any previous chat in the sidebar |
   9. | Edit title | Hover over the chat title → click the **pencil icon** |
   10. | Delete chat | Hover over the chat in the sidebar → click **delete** |
   | Copy message | Hover over any message → click **copy** |
   | Delete message pair | Hover over a message → click **delete** |
   | Cancel generation | Click the **stop button** while the AI is responding |

---

## 🗂️ Project Structure

```
├── app/
│   ├── (auth)/login/         # Authentication page
│   ├── api/
│   │   ├── chat/             # Streaming chat endpoint with user context injection
│   │   ├── models/           # Dynamic model fetching from providers
│   │   └── generate-title/   # AI-powered title generation
│   ├── chat/
│   │   ├── layout.tsx        # Chat layout with sidebar
│   │   ├── page.tsx          # New chat page
│   │   └── [chatId]/         # Existing chat page
│   └── page.tsx              # Home (redirects to chat)
├── components/
│   ├── chat/                 # Chat UI components (input, messages, sidebar, etc.)
│   ├── ui/                   # shadcn/ui primitives
│   ├── settings-dialog.tsx   # Settings with live API validation
│   └── profile-dialog.tsx    # User profile management
├── lib/
│   ├── models.ts             # Model type definitions
│   ├── store.ts              # Zustand state (with DB sync)
│   ├── supabase.ts           # Client-side Supabase
│   ├── supabase-server.ts    # Server-side Supabase
│   └── utils.ts              # Utility functions
└── supabase/
    └── migrations/           # Incremental DB schema migrations
```

---

## 🗄️ Database Schema

**`chats`** — `id`, `user_id`, `title`, `model`, `created_at`

**`messages`** — `id`, `chat_id`, `user_id`, `role` (`user` | `assistant`), `content`, `attachments` (JSONB for images), `created_at`

**`user_preferences`** — `user_id`, `ollama_host`, `google_api_key`, `temperature`, `safety_settings`, `selected_model`

**`user_profiles`** — `user_id`, `display_name`, `avatar_url`, `bio`, `created_at`

**Storage:** `avatars` — public bucket for user profile pictures

---

## 🔌 API Reference

### `GET /api/models`

Fetches available models from configured providers.

| Query Param | Required | Description |
|---|---|---|
| `ollamaHost` | No | URL of Ollama instance |
| `googleApiKey` | No | Google AI API key |

### `POST /api/chat`

Streams an AI response. Automatically loads and injects the user's profile context.

```json
{
  "messages": [...],
  "model": "google/gemini-2.5-flash",
  "chatId": "uuid",
  "settings": {
    "ollamaHost": "http://localhost:11434",
    "googleApiKey": "...",
    "temperature": 0.7
  }
}
```

**Response:** Server-Sent Events (SSE) stream

### `POST /api/generate-title`

Generates a concise title for a chat from the first message.

---

## 🐳 Docker Deployment

```bash
# Build and start (production)
docker-compose up --build

# Access the app
open http://localhost:3000
```

This will build Next.js for production, start a local Supabase instance, and serve the app. For hot-reload development, running locally without Docker is recommended:

```bash
npx supabase start
npm run dev
```

See [README.Docker.md](README.Docker.md) for detailed Docker instructions.

---

## 🛠️ Development Commands

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm start              # Start production server
npm run lint           # Run ESLint

npx supabase start     # Start local Supabase
npx supabase stop      # Stop local Supabase
npx supabase db reset  # Reset DB and re-run all migrations
# Supabase Studio → http://localhost:54323
```

---

## 🩺 Troubleshooting

**Supabase won't start** — Ensure Docker Desktop is running. Try `npx supabase stop` then `npx supabase start`. Check Docker has sufficient resources.

**Models not loading** — For Ollama, verify it is running with `ollama list`. For Google AI, ensure your API key is valid. Both providers are optional; at least one must be configured.

**Auth issues** — Clear browser cookies and local storage. Reset the database with `npx supabase db reset`. Confirm Supabase is running with `npx supabase status`.

**Streaming not working** — Check the browser console for errors. Verify the model format is correct (e.g. `ollama/llama2` or `google/gemini-1.5-pro`).

**Auto-scroll not working** — Auto-scroll only activates when you are at the bottom of the chat. Scroll up manually to pause it, and use the **"Go to latest"** button to resume.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

<div align="center">
  Built with ❤️ using Next.js, Supabase, and shadcn/ui
</div>div>
