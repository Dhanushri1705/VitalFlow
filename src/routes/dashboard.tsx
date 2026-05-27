import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Apple, Droplet, Moon, Flame, TrendingUp, Trophy, Sparkles, Calendar,
  AlertTriangle, Plus, Minus, CheckCircle2, Circle, Gem, X, Loader2,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { applyStreak, restoreStreak, nextMilestone, RESTORE_COST, REWARD_MILESTONES } from "@/lib/streak";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { seedDefaultsOnce } from "@/lib/defaults";
import { lookupFoodCalories } from "@/lib/calories";
import { ModuleGrid } from "@/components/ModuleGrid";

export const Route = createFileRoute("/dashboard")({
  component: () => <AppShell><DashboardPage /></AppShell>,
});

const METRIC_TARGETS = { water: 8, sleep: 8, nutrition: 2200, activity: 8000 };

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Task { id: string; title: string; category: string; completed: boolean; recommendation_id?: string | null; }
interface Reminder { id: string; reminder_text: string; status: string; recommendation_id?: string | null; }
interface MetricTotals { water: number; sleep: number; nutrition: number; }
interface WeeklyPoint { day: string; score: number; }

function DashboardPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [metrics, setMetrics] = useState<MetricTotals>({ water: 0, sleep: 0, nutrition: 0 });
  const [weekly, setWeekly] = useState<WeeklyPoint[]>(() =>
    WEEK_DAYS.map((d) => ({ day: d, score: 0 })),
  );
  const [newTask, setNewTask] = useState("");
  const [foodInput, setFoodInput] = useState("");
  const [foodLoading, setFoodLoading] = useState(false);
  const [streakMsg, setStreakMsg] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const loadMetrics = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("metric_logs")
      .select("metric_type,value")
      .eq("user_id", user.id)
      .eq("log_date", today);
    const totals: MetricTotals = { water: 0, sleep: 0, nutrition: 0 };
    (data ?? []).forEach((row: { metric_type: string; value: number }) => {
      if (row.metric_type in totals) {
        totals[row.metric_type as keyof MetricTotals] += Number(row.value) || 0;
      }
    });
    setMetrics(totals);
  };

  const loadWeekly = async () => {
    if (!user) return;
    // Build the 7-day window ending today, Mon..Sun in display order.
    const days: { date: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: WEEK_DAYS[(d.getDay() + 6) % 7],
      });
    }
    const fromDate = days[0].date;
    const { data } = await supabase
      .from("streak_log")
      .select("log_date,percent")
      .eq("user_id", user.id)
      .gte("log_date", fromDate);
    const map = new Map<string, number>();
    (data ?? []).forEach((row: { log_date: string; percent: number }) => {
      map.set(row.log_date, Number(row.percent) || 0);
    });
    setWeekly(days.map((d) => ({ day: d.label, score: map.get(d.date) ?? 0 })));
  };

  const loadData = async () => {
    if (!user) return;
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from("daily_tasks").select("id,title,category,completed,recommendation_id").eq("user_id", user.id).eq("task_date", today).order("created_at"),
      supabase.from("scheduled_reminders").select("id,reminder_text,status,recommendation_id").eq("user_id", user.id).eq("schedule_date", today).order("created_at"),
    ]);
    setTasks((t as Task[]) ?? []);
    setReminders((r as Reminder[]) ?? []);
    await Promise.all([loadMetrics(), loadWeekly()]);
  };

  useEffect(() => {
    if (!user) return;
    // Seed habit defaults exactly once per user, then load.
    seedDefaultsOnce(user.id, "habit").finally(() => loadData());
    /* eslint-disable-next-line */
  }, [user]);

  // Cross-device sync: realtime subscription on tasks/metrics/profile so a change
  // on mobile is immediately reflected on desktop (and vice versa).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tasks", filter: `user_id=eq.${user.id}` },
        () => { loadData(); },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "metric_logs", filter: `user_id=eq.${user.id}` },
        () => { loadMetrics(); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => { refreshProfile(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    /* eslint-disable-next-line */
  }, [user]);

  // Force refresh on tab focus / visibility — guarantees no stale local cache.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => { loadData(); refreshProfile(); };
    const onVisible = () => { if (document.visibilityState === "visible") onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
    /* eslint-disable-next-line */
  }, [user]);

  const logMetric = async (metric_type: keyof MetricTotals, value: number) => {
    if (!user) return;
    if (value === 0) return;
    await supabase.from("metric_logs").insert({ user_id: user.id, metric_type, value, log_date: today });
    setMetrics((p) => ({ ...p, [metric_type]: Math.max(0, p[metric_type] + value) }));
  };

  const logFood = async () => {
    if (!user || !foodInput.trim()) return;
    setFoodLoading(true);
    try {
      const result = await lookupFoodCalories(foodInput.trim());
      if (!result || result.calories <= 0) {
        toast.error("Couldn't estimate calories — try being more specific");
        return;
      }
      await logMetric("nutrition", result.calories);
      toast.success(`+${result.calories} kcal logged${result.note ? ` (${result.note})` : ""}`);
      setFoodInput("");
    } finally {
      setFoodLoading(false);
    }
  };

  const toggleTask = async (id: string, completed: boolean, recId?: string | null) => {
    const newCompleted = !completed;
    // Optimistic UI
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t)));
    // 1) Persist to DB and WAIT for confirmation
    const { error } = await supabase.from("daily_tasks").update({ completed: newCompleted }).eq("id", id);
    if (error) {
      // Roll back on failure
      setTasks((p) => p.map((t) => (t.id === id ? { ...t, completed } : t)));
      toast.error("Couldn't save — try again");
      return;
    }
    // Sync linked scheduled reminder so AI-scheduled items stay in sync
    if (recId) {
      await supabase
        .from("scheduled_reminders")
        .update({ status: newCompleted ? "done" : "pending" })
        .eq("user_id", user!.id)
        .eq("recommendation_id", recId)
        .eq("schedule_date", today);
      setReminders((p) =>
        p.map((r) => (r.recommendation_id === recId ? { ...r, status: newCompleted ? "done" : "pending" } : r)),
      );
    }
    if (user) {
      // 2) Re-fetch latest tasks from DB BEFORE computing streak (single source of truth)
      await loadData();
      // 3) applyStreak reads tasks from DB itself — guaranteed consistent across devices
      const res = await applyStreak(user.id);
      console.log("[streak] result", res);
      setStreakMsg(res.message);
      if (res.reward) toast.success(`🎉 ${res.reward.days}-day milestone! +${res.reward.gems} gems`);
      await refreshProfile();
      await loadWeekly();
    }
  };

  const addTask = async () => {
    if (!newTask.trim() || !user) return;
    const { data } = await supabase
      .from("daily_tasks")
      .insert({ user_id: user.id, title: newTask, task_date: today })
      .select("id,title,category,completed")
      .single();
    if (data) setTasks((p) => [...p, data as Task]);
    setNewTask("");
  };

  const deleteTask = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await supabase.from("daily_tasks").delete().eq("id", id);
    if (user) {
      const res = await applyStreak(user.id);
      setStreakMsg(res.message);
      await refreshProfile();
      await loadWeekly();
    }
  };

  const completeReminder = async (id: string) => {
    await supabase.from("scheduled_reminders").update({ status: "done" }).eq("id", id);
    setReminders((p) => p.map((r) => (r.id === id ? { ...r, status: "done" } : r)));
  };

  const handleRestore = async () => {
    if (!user) return;
    const r = await restoreStreak(user.id, 7);
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
    await refreshProfile();
  };

  // Use the user's CURRENT active task list as the denominator (no fixed goal floor).
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const healthScore = Math.round((percent + (profile?.current_streak ?? 0) * 2) / 1.5);
  const streak = profile?.current_streak ?? 0;
  const next = nextMilestone(streak);
  const nextReward = REWARD_MILESTONES[next] ?? 200;

  // Miss-day detection: days since last counted streak day.
  const daysSinceStreak = (() => {
    if (!profile?.last_streak_date) return 0;
    const last = new Date(profile.last_streak_date).getTime();
    const now = new Date(today).getTime();
    return Math.max(0, Math.round((now - last) / 86400000));
  })();
  const streakAtRisk = streak > 0 && daysSinceStreak === 1 && percent < 75;
  const canRestore = streak === 0 && (profile?.last_streak_date != null);

  const firstName = (profile?.full_name || profile?.username || "there").split(" ")[0];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Hello, {firstName} 👋</h1>
          <p className="text-muted-foreground mt-1">Let's check on your health today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-card border border-border px-4 py-2 flex items-center gap-2 shadow-sm">
            <Gem className="h-4 w-4 text-primary" />
            <span className="font-semibold">{profile?.gems ?? 0}</span>
            <span className="text-xs text-muted-foreground">gems</span>
          </div>
          <div className="rounded-xl bg-gradient-health text-white px-4 py-2 flex items-center gap-2 shadow-soft">
            <Flame className="h-4 w-4" />
            <span className="font-semibold">{streak}</span>
            <span className="text-xs text-white/80">day streak</span>
          </div>
        </div>
      </div>

      {/* Quick-access modules grid */}
      <ModuleGrid />

      {/* Metric cards (Nutrition, Water, Sleep — Activity/steps removed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={Apple} label="Nutrition"
          value={metrics.nutrition === 0 ? "0" : metrics.nutrition.toLocaleString()}
          target={`${METRIC_TARGETS.nutrition.toLocaleString()} kcal`}
          color="text-accent"
          onInc={() => logMetric("nutrition", 100)}
          onDec={() => logMetric("nutrition", -100)}
          stepLabel="100 kcal"
          empty={metrics.nutrition === 0}
        />
        <MetricCard
          icon={Droplet} label="Water"
          value={`${metrics.water}`}
          target={`${METRIC_TARGETS.water} glasses`}
          color="text-primary"
          onInc={() => logMetric("water", 1)}
          onDec={() => logMetric("water", -1)}
          stepLabel="1 glass"
          empty={metrics.water === 0}
        />
        <MetricCard
          icon={Moon} label="Sleep"
          value={metrics.sleep === 0 ? "0h" : `${metrics.sleep}h`}
          target={`${METRIC_TARGETS.sleep}h goal`}
          color="text-primary-glow"
          onInc={() => logMetric("sleep", 1)}
          onDec={() => logMetric("sleep", -1)}
          stepLabel="1 hour"
          empty={metrics.sleep === 0}
        />
      </div>

      {/* Food → calorie auto-lookup */}
      <div className="rounded-xl bg-card border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Apple className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Log food (AI estimates calories)</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={foodInput}
            onChange={(e) => setFoodInput(e.target.value)}
            placeholder="e.g. 1 guava, 2 eggs, bowl of rice"
            onKeyDown={(e) => e.key === "Enter" && !foodLoading && logFood()}
          />
          <Button onClick={logFood} disabled={foodLoading || !foodInput.trim()} className="bg-gradient-health">
            {foodLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">No need to know the exact calories — just type what you ate.</p>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weekly progress */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-card border border-border p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Weekly progress</h3>
              <p className="text-xs text-muted-foreground">Average wellness score</p>
            </div>
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.15 160)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.62 0.14 200)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="oklch(0.55 0.03 220)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.55 0.03 220)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.015 210)", fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="oklch(0.62 0.14 200)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health score gauge */}
        <div className="rounded-2xl bg-gradient-card border border-border p-5 shadow-soft">
          <h3 className="font-semibold">Health Score</h3>
          <p className="text-xs text-muted-foreground">Today's overall wellness</p>
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "score", value: Math.min(healthScore, 100), fill: "oklch(0.72 0.15 160)" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background={{ fill: "oklch(0.94 0.01 200)" }} dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-gradient">{Math.min(healthScore, 100)}</div>
              <div className="text-xs text-muted-foreground">/ 100</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's tasks + Streak panel */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5 shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Today's habits</h3>
            <span className="text-sm text-muted-foreground">{completed}/{total} • {percent}%</span>
          </div>
          <Progress value={percent} className="h-2 mb-4" />
          {streakMsg && <div className="text-xs text-muted-foreground mb-3">{streakMsg}</div>}
          <ul className="space-y-1.5">
            {tasks.length === 0 && (
              <li className="text-sm text-muted-foreground px-3 py-4 text-center">
                No tasks yet — add your first habit below.
              </li>
            )}
            {tasks.map((t) => (
              <li key={t.id} className="group flex items-center rounded-lg hover:bg-muted transition-colors">
                <button
                  onClick={() => toggleTask(t.id, t.completed, t.recommendation_id)}
                  className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left"
                >
                  {t.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.category}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteTask(t.id)}
                  aria-label="Delete task"
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a habit…" onKeyDown={(e) => e.key === "Enter" && addTask()} />
            <Button onClick={addTask} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Streak panel */}
        <div className="rounded-2xl bg-gradient-hero text-white p-5 shadow-elegant overflow-hidden relative">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Trophy className="h-4 w-4" /> Streak rewards
            </div>
            <div className="mt-3 flex items-end gap-2">
              <div className="text-5xl font-bold">{streak}</div>
              <div className="text-sm text-white/80 mb-2">days 🔥</div>
            </div>
            <div className="mt-4 text-xs text-white/85">Next reward at <b>{next} days</b></div>
            <Progress value={Math.min((streak / next) * 100, 100)} className="h-1.5 mt-2 bg-white/20" />
            <div className="mt-2 text-xs text-white/80">+{nextReward} 💎 awaits</div>

            {streakAtRisk && (
              <div className="mt-4 rounded-lg bg-warning/30 p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Your streak is at risk 🔥 — complete one task today to protect it.</span>
              </div>
            )}

            {percent < 75 && total > 0 && !streakAtRisk && (
              <div className="mt-4 rounded-lg bg-white/15 p-3 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Reach 75% today to keep the streak alive.</span>
              </div>
            )}

            {canRestore && (
              <div className="mt-4 rounded-lg bg-white/15 p-3 text-xs">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Streak broken — use {RESTORE_COST} 💎 to restore it?</span>
                </div>
                <Button onClick={handleRestore} variant="secondary" size="sm" className="w-full">
                  Restore streak ({RESTORE_COST} 💎)
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's AI recommendations + Reminders */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Today's AI recommendations</h3>
        </div>
        {reminders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scheduled tips yet. Visit <b>Nutrition</b> or <b>Habit Tracker</b> to ask the AI coach and add suggestions to your schedule.
          </p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                <Calendar className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className={`text-sm flex-1 ${r.status === "done" ? "line-through text-muted-foreground" : ""}`}>{r.reminder_text}</span>
                {r.status !== "done" && (
                  <Button size="sm" variant="ghost" onClick={() => completeReminder(r.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, target, color, onInc, onDec, stepLabel, empty }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; target: string; color: string;
  onInc?: () => void; onDec?: () => void; stepLabel?: string; empty?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-4 shadow-soft hover:shadow-elegant transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-lg bg-muted flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-1">
          {onDec && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDec} aria-label={`Subtract ${stepLabel ?? ""}`}>
              <Minus className="h-3 w-3" />
            </Button>
          )}
          {onInc && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onInc} aria-label={`Add ${stepLabel ?? ""}`}>
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label} • {target}{stepLabel ? ` • ±${stepLabel}` : ""}</div>
      {empty && <div className="text-[10px] text-muted-foreground mt-1">Tap + to start tracking</div>}
    </div>
  );
}
