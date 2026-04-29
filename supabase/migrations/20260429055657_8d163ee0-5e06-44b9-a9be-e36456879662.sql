-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  progress smallint NOT NULL DEFAULT 0,
  progress_overridden boolean NOT NULL DEFAULT false,
  daily_note text,
  worked_on_date date,
  last_progress_change_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects (user_id, created_at DESC);

-- Tasks table (used for auto-progress + existing tasks panel)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  due_at timestamptz,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Daily log
CREATE TABLE IF NOT EXISTS public.project_daily_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  progress_start smallint NOT NULL DEFAULT 0,
  progress_end smallint NOT NULL DEFAULT 0,
  note text,
  worked_marked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, log_date)
);
ALTER TABLE public.project_daily_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_log_select_own" ON public.project_daily_log;
CREATE POLICY "daily_log_select_own" ON public.project_daily_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "daily_log_insert_own" ON public.project_daily_log;
CREATE POLICY "daily_log_insert_own" ON public.project_daily_log FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "daily_log_update_own" ON public.project_daily_log;
CREATE POLICY "daily_log_update_own" ON public.project_daily_log FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "daily_log_delete_own" ON public.project_daily_log;
CREATE POLICY "daily_log_delete_own" ON public.project_daily_log FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_project_daily_log_user_date ON public.project_daily_log (user_id, log_date DESC);

-- Email preferences
CREATE TABLE IF NOT EXISTS public.user_email_prefs (
  user_id uuid PRIMARY KEY,
  manager_email text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  send_hour_ist smallint NOT NULL DEFAULT 17,
  send_minute_ist smallint NOT NULL DEFAULT 45,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_email_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_prefs_select_own" ON public.user_email_prefs;
CREATE POLICY "email_prefs_select_own" ON public.user_email_prefs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "email_prefs_insert_own" ON public.user_email_prefs;
CREATE POLICY "email_prefs_insert_own" ON public.user_email_prefs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "email_prefs_update_own" ON public.user_email_prefs;
CREATE POLICY "email_prefs_update_own" ON public.user_email_prefs FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_projects_upd ON public.projects;
CREATE TRIGGER trg_projects_upd BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_tasks_upd ON public.tasks;
CREATE TRIGGER trg_tasks_upd BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_daily_log_upd ON public.project_daily_log;
CREATE TRIGGER trg_daily_log_upd BEFORE UPDATE ON public.project_daily_log FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_email_prefs_upd ON public.user_email_prefs;
CREATE TRIGGER trg_email_prefs_upd BEFORE UPDATE ON public.user_email_prefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();