
# JARVIS OS — Full-Stack AI Productivity Dashboard

A premium personal AI operating system with Tasks, Notes, Calendar, and a context-aware AI assistant.

## Architecture

- **Frontend**: TanStack Start (React 19, SSR) — Lovable's modern stack
- **Backend**: TanStack server functions + server routes (`/api/*`)
- **Database**: Lovable Cloud (Supabase) with Row-Level Security
- **AI**: OpenAI API via your `OPENAI_API_KEY` secret (called only from server functions)
- **Auth**: Supabase email + password

## Database schema (RLS on every table, scoped to `auth.uid()`)

- `profiles` — `id` (FK auth.users), `display_name`, `avatar_url`, `timezone`, `ai_preferences` (jsonb), `created_at`
  - Auto-created via trigger on signup
- `tasks` — `id`, `user_id`, `title`, `description`, `priority` (low/medium/high), `status` (todo/in_progress/done), `due_at`, `ai_generated` (bool), `created_at`
- `notes` — `id`, `user_id`, `title`, `content` (markdown), `summary` (AI-filled), `tags` (text[]), `created_at`, `updated_at`
- `events` — `id`, `user_id`, `title`, `description`, `starts_at`, `ends_at`, `location`, `created_at`
- `chat_threads` — `id`, `user_id`, `title`, `created_at`
- `chat_messages` — `id`, `thread_id`, `user_id`, `role` (user/assistant/system), `content`, `created_at`

## Routes

- `/login` — Email + password sign-in / sign-up (tabs), redirects to `/dashboard` on success
- `/dashboard` (protected) — Main shell with sidebar navigation and module panels:
  - Overview (AI daily briefing, today's tasks + events)
  - Tasks
  - Notes
  - Calendar
  - Jarvis Chat
- `/_authenticated` layout route guards all dashboard sub-routes; redirects to `/login` if no session

## Server functions & API routes

All AI logic lives server-side; `OPENAI_API_KEY` never touches the client.

- `getDailyBriefing` — pulls today's tasks/events, asks OpenAI for a personalized morning briefing
- `suggestTasks` — given context, returns 3–5 AI-suggested tasks (structured output via tool calling)
- `summarizeNote` — auto-generates a short summary stored on the note
- `chatWithJarvis` (server route `/api/chat`) — streaming SSE endpoint; loads thread history + user context (recent tasks/notes/events) and streams OpenAI response token-by-token
- CRUD server functions for tasks, notes, events, threads, messages — all use authenticated Supabase client (RLS-enforced)

## Auth & security

- `requireSupabaseAuth` middleware on every protected server function
- RLS policies: users can only see/modify rows where `user_id = auth.uid()`
- Profile auto-created via `handle_new_user()` trigger on `auth.users` insert
- Zod validation on all server function inputs
- After approval, you'll be prompted to add `OPENAI_API_KEY` as a secret

## What v1 delivers

- Working signup / login / logout
- Full CRUD for tasks, notes, events
- AI daily briefing on dashboard overview
- Persistent Jarvis chat with streaming responses and user-context awareness
- AI task suggestions and note summarization
- Architecture-first: minimal styling, clean layout, focus on functionality
