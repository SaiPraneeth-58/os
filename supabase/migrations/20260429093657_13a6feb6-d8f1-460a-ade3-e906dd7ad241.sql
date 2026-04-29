-- Chat threads
CREATE TABLE public.chat_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New chat',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "threads_select_own" ON public.chat_threads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "threads_insert_own" ON public.chat_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "threads_update_own" ON public.chat_threads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "threads_delete_own" ON public.chat_threads
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_chat_threads_user_recent
  ON public.chat_threads (user_id, last_message_at DESC);

CREATE TRIGGER chat_threads_set_updated_at
  BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_own" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "messages_insert_own" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_update_own" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "messages_delete_own" ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_thread ON public.chat_messages (thread_id, created_at);

-- Bump thread last_message_at on new message
CREATE OR REPLACE FUNCTION public.bump_thread_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_bump_thread
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_thread_last_message_at();