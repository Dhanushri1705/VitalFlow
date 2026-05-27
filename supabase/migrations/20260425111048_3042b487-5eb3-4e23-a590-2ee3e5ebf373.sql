-- Focus / habit session tracker
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  goal_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | cancelled
  task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own focus sessions all" ON public.focus_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_focus_sessions_user_date ON public.focus_sessions(user_id, start_time DESC);

-- Generic daily metric logs for water, sleep, nutrition kcal, steps, etc.
CREATE TABLE public.metric_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- water | sleep | nutrition | activity
  value NUMERIC NOT NULL DEFAULT 0,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.metric_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own metric logs all" ON public.metric_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_metric_logs_user_date ON public.metric_logs(user_id, log_date, metric_type);
