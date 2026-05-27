ALTER TABLE public.daily_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.metric_logs REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metric_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;