-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  gems integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_streak_date date,
  missed_days integer not null default 0,
  preferences jsonb not null default '{}'::jsonb,
  health_goals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- AI recommendations
create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_type text not null, -- 'nutrition' | 'habit'
  category text,
  recommendation_text text not null,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ai_recommendations enable row level security;
create policy "own ai_recs all" on public.ai_recommendations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Scheduled reminders
create table public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid references public.ai_recommendations(id) on delete set null,
  reminder_text text not null,
  schedule_date date not null default current_date,
  schedule_time time,
  status text not null default 'pending', -- 'pending' | 'done'
  created_at timestamptz not null default now()
);
alter table public.scheduled_reminders enable row level security;
create policy "own reminders all" on public.scheduled_reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily tasks (for streak engine)
create table public.daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_date date not null default current_date,
  title text not null,
  category text not null default 'general', -- 'water' | 'exercise' | 'nutrition' | 'sleep' | 'general'
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.daily_tasks enable row level security;
create policy "own tasks all" on public.daily_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index daily_tasks_user_date on public.daily_tasks(user_id, task_date);

-- Streak log
create table public.streak_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  completed_count integer not null default 0,
  total_count integer not null default 0,
  percent integer not null default 0,
  counted boolean not null default false,
  unique(user_id, log_date)
);
alter table public.streak_log enable row level security;
create policy "own streak all" on public.streak_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();