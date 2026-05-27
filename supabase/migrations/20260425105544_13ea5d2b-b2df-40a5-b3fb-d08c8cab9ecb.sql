ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_goal integer NOT NULL DEFAULT 5;
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS recommendation_id uuid;
CREATE INDEX IF NOT EXISTS idx_daily_tasks_rec ON public.daily_tasks(recommendation_id);