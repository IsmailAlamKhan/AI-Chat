# AI Chat UI

A beautiful, modern, full-stack chat application built with Next.js, supporting both Ollama (local) and Google AI models. Features real-time streaming responses, multimodal support (text and images), and persistent chat history.

## Features

- 🔐 **User Authentication** - Full email/password authentication via Supabase
- 👤 **User Profiles** - Customizable display name, avatar, and bio
- 🤝 **Personalized AI** - AI knows your name and bio for contextual conversations
- 💬 **Persistent Chat History** - All conversations saved to database with AI-generated titles
- 🎨 **Beautiful Dark UI** - Modern, responsive design with shadcn/ui and Geist fonts
- 🤖 **Multiple AI Providers**
  - Local Ollama models (optional)
  - Google AI (Gemini) models (optional)
  - Dynamic model fetching from APIs
- 👁️ **Vision Support** - Upload images to compatible models
- ⚡ **Real-time Streaming** - See responses as they generate
- 📝 **Markdown Rendering** - Full markdown with code syntax highlighting and wrapping
- 📋 **Rich Message Actions** - Copy messages, delete conversations, copy code blocks
- 📜 **Smart Scrolling** - Auto-scroll with manual control and "Go to latest" button
- ⚙️ **Configurable Settings** - API validation, database persistence, temperature control
- 🐳 **Docker Support** - Production and development Docker Compose configurations

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database & Auth**: Supabase (local instance)
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: Zustand
- **Markdown**: react-markdown with rehype-highlight

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for Supabase local)
- [Ollama](https://ollama.ai/) (optional, for local models)
- Google AI API key (optional, for Gemini models)

## Getting Started

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Start Supabase

Make sure Docker Desktop is running, then:

\`\`\`bash
npx supabase start
\`\`\`

This will start a local Supabase instance. The credentials are already configured in `.env.local`.

### 3. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Create an Account

1. Click "Sign Up" on the login page
2. Enter your email and password (min 6 characters)
3. For local development, email confirmation is disabled - you'll be logged in immediately

### 5. Set Up Your Profile (Optional)

Click the profile icon to set:
- **Display Name**: Your name shown in chats and passed to AI
- **Avatar**: Upload a profile picture
- **Bio**: Information about yourself for AI context

### 6. Configure Settings

Click the settings icon (⚙️) to configure:

- **Ollama Host URL**: (Optional) URL where Ollama is running
- **Google AI API Key**: (Optional) Get yours from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Temperature**: Control randomness (0.0 - 2.0)
- **Safety Settings**: Configure Google AI content filtering

Settings are validated before saving and persisted to the database.

## Using the App

### Starting a Conversation

1. Select a model from the dropdown (Ollama or Google AI)
2. Type your message in the input box
3. Press Enter or click the send button
4. Watch the AI response stream in real-time
5. Chat title is automatically generated from your first message

### Using Vision Models

1. Select a vision-capable model (marked with eye icon)
2. Click the paperclip icon to upload images
3. Add your text prompt
4. Send the message

### Managing Chats

- **New Chat**: Click the "New Chat" button in the sidebar
- **View History**: Click any previous chat in the sidebar
- **Edit Title**: Hover over chat title and click pencil icon to edit
- **Delete Chat**: Hover over chat in sidebar to reveal delete button
- **Auto-save**: All messages are automatically saved to the database
- **Model Badge**: See which model was used for each conversation

### Message Actions

- **Copy Message**: Hover over any message to copy it
- **Delete Message Pair**: Remove a question and its response
- **Copy Code Block**: Click copy button on any code block
- **Cancel Response**: Stop AI generation with the stop button

### Scrolling

- **Auto-scroll**: Automatically scrolls to new messages
- **Manual Control**: Scroll up to read - auto-scroll pauses
- **Go to Latest**: Click button to jump to newest message

## Project Structure

\`\`\`
app/
├── (auth)/
│   └── login/page.tsx            # Authentication page
├── api/
│   ├── chat/route.ts             # Chat streaming with user context
│   ├── models/route.ts           # Dynamic model fetching
│   └── generate-title/route.ts  # AI title generation
├── chat/
│   ├── layout.tsx                # Chat layout with sidebar
│   ├── page.tsx                  # New chat page
│   └── [chatId]/page.tsx         # Existing chat page
├── layout.tsx                    # Root layout (dark mode, fonts)
└── page.tsx                      # Home page (redirects)

components/
├── chat/
│   ├── chat-history-sidebar.tsx  # Chat list with delete
│   ├── chat-input.tsx            # Input with cancel support
│   ├── chat-message.tsx          # Message with copy/delete
│   ├── chat-messages.tsx         # Smart scrolling list
│   ├── model-badge.tsx           # Conversation model badge
│   └── model-selector.tsx        # Model dropdown with tooltips
├── ui/                           # shadcn/ui components
├── settings-dialog.tsx           # Settings with validation
└── profile-dialog.tsx            # User profile management

lib/
├── models.ts                     # Model type definitions
├── store.ts                      # Zustand state (with DB sync)
├── supabase.ts                   # Client-side Supabase
├── supabase-server.ts            # Server-side Supabase
└── utils.ts                      # Helper functions

supabase/
└── migrations/
    ├── 0001_init.sql                  # Initial schema
    ├── 0002_add_model_to_chats.sql    # Model per chat
    ├── 0003_add_user_preferences.sql  # Settings persistence
    ├── 0004_add_user_profiles.sql     # User profiles
    └── 0005_setup_avatars_storage.sql # Avatar storage bucket
\`\`\`

## Database Schema

### chats
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `title` (TEXT) - AI-generated
- `model` (TEXT) - Model used for conversation
- `created_at` (TIMESTAMPTZ)

### messages
- `id` (UUID, primary key)
- `chat_id` (UUID, foreign key to chats)
- `user_id` (UUID, foreign key to auth.users)
- `role` (TEXT: 'user' or 'assistant')
- `content` (TEXT)
- `attachments` (JSONB) - Image data for vision models
- `created_at` (TIMESTAMPTZ)

### user_preferences
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users, unique)
- `ollama_host` (TEXT)
- `google_api_key` (TEXT)
- `temperature` (REAL)
- `safety_settings` (JSONB)
- `selected_model` (TEXT)

### user_profiles
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users, unique)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `bio` (TEXT)
- `created_at` (TIMESTAMPTZ)

### Storage Buckets
- **avatars** - Public bucket for user profile pictures

## API Endpoints

### GET /api/models
Dynamically fetches models from configured providers.

**Query Parameters:**
- `ollamaHost` - (Optional) URL of Ollama instance
- `googleApiKey` - (Optional) Google AI API key

**Response:**
\`\`\`json
{
  "models": [
    {
      "id": "ollama/llama2",
      "name": "llama2",
      "provider": "ollama",
      "vision": false
    },
    {
      "id": "google/gemini-2.5-flash",
      "name": "gemini-2.5-flash",
      "provider": "google",
      "vision": true
    }
  ]
}
\`\`\`

### POST /api/chat
Streams responses with user context injection.

**Features:**
- Loads user profile (name, bio) automatically
- Injects user context into AI prompts
- Logs stop reasons and token usage
- Handles errors with notifications

**Request Body:**
\`\`\`json
{
  "messages": [...],
  "model": "google/gemini-1.5-pro",
  "chatId": "uuid",
  "settings": {
    "ollamaHost": "http://localhost:11434",
    "googleApiKey": "...",
    "temperature": 0.7,
    "safetySettings": {...}
  }
}
\`\`\`

**Response:** Server-Sent Events stream

### POST /api/generate-title
Generates chat titles from conversation content.

**Request:**
\`\`\`json
{
  "chatId": "uuid",
  "model": "google/gemini-1.5-pro",
  "message": "First message text..."
}
\`\`\`

**Response:**
\`\`\`json
{
  "title": "Discussion about quantum computing"
}
\`\`\`

## Environment Variables

The `.env.local` file contains:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
\`\`\`

These are automatically configured when you run `npx supabase start`.

## Development Commands

\`\`\`bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Start Supabase
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database (applies migrations)
npx supabase db reset

# View Supabase Studio
# Open http://localhost:54323
\`\`\`

## Troubleshooting

### Supabase won't start
- Make sure Docker Desktop is running
- Try: `npx supabase stop` then `npx supabase start`
- Check Docker has enough resources allocated

### Models not loading
- **Ollama**: Check it's running with `ollama list`
- **Google AI**: Ensure API key is valid
- Both providers are optional - configure at least one
- Settings are validated before saving

### Authentication issues
- Clear browser cookies and local storage
- Reset Supabase: `npx supabase db reset`
- Check Supabase is running: `npx supabase status`

### Streaming not working
- Check browser console for errors
- Verify API endpoints are accessible
- Ensure model format is correct (e.g., `ollama/llama2`, `google/gemini-1.5-pro`)
- Check for unusual stop reasons in console logs

### Scrolling issues
- Auto-scroll only works when at bottom of chat
- Scroll up manually to disable auto-scroll
- Use "Go to latest" button to re-enable

### Title not generating
- First message creates the title automatically
- Ollama models use API generation
- Google models use smart text extraction
- Edit manually with pencil icon if needed

## Docker Deployment

Simplified Docker setup with production build:

```bash
# Build and start
docker-compose up --build

# Access the app
open http://localhost:3000
```

This will:
1. Build Next.js for production
2. Start local Supabase with `npx supabase start`
3. Run the production server

For detailed Docker instructions, see `README.Docker.md`.

**Note**: For development with hot reload, it's recommended to run locally without Docker:
```bash
npx supabase start
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
