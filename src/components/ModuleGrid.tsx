import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity, ListChecks, Timer, Apple, Utensils, Wallet, Sparkles, Scissors,
  Settings2, Dumbbell, Droplet, Sun, TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ModuleDef {
  id: string;
  key: string; // category in daily_tasks for progress (empty = no progress)
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  search?: Record<string, string>;
  gradient: string;
}

// Fixed canonical order — primary defaults first, then optional add-ons.
const ALL_MODULES: ModuleDef[] = [
  { id: "habit",    key: "habit",     title: "Habit Tracking",      subtitle: "Build daily consistency", icon: Activity,   to: "/habits",                                gradient: "from-blue-500/20 to-cyan-500/10" },
  { id: "todo",     key: "",          title: "To-Do List",          subtitle: "Plan your day",           icon: ListChecks, to: "/habits",    search: { tab: "todo" },    gradient: "from-indigo-500/20 to-blue-500/10" },
  { id: "focus",    key: "",          title: "Focus Timer",         subtitle: "Deep work sessions",      icon: Timer,      to: "/habits",    search: { tab: "focus" },   gradient: "from-purple-500/20 to-violet-500/10" },
  { id: "nutrition",key: "nutrition", title: "Nutrition Monitoring",subtitle: "Daily intake",            icon: Apple,      to: "/nutrition",                             gradient: "from-green-500/20 to-emerald-500/10" },
  { id: "diet",     key: "diet",      title: "Diet Planner",        subtitle: "Meal plan & calories",    icon: Utensils,   to: "/nutrition", search: { tab: "diet" },    gradient: "from-violet-500/20 to-purple-500/10" },
  { id: "expenses", key: "",          title: "Expense Tracking",    subtitle: "Wellness spending",       icon: Wallet,     to: "/expenses",                              gradient: "from-slate-500/20 to-zinc-500/10" },
  { id: "skin",     key: "skin",      title: "Skincare",            subtitle: "Track your routine",      icon: Sparkles,   to: "/nutrition", search: { tab: "skin" },    gradient: "from-pink-500/20 to-rose-500/10" },
  { id: "hair",     key: "hair",      title: "Haircare",            subtitle: "Hair health habits",      icon: Scissors,   to: "/nutrition", search: { tab: "hair" },    gradient: "from-amber-500/20 to-orange-500/10" },
  { id: "exercise", key: "exercise",  title: "Exercise",            subtitle: "Move every day",          icon: Dumbbell,   to: "/habits",    search: { tab: "exercise" },gradient: "from-red-500/20 to-orange-500/10" },
  { id: "water",    key: "water",     title: "Water Tracking",      subtitle: "Stay hydrated",           icon: Droplet,    to: "/habits",    search: { tab: "water" },   gradient: "from-sky-500/20 to-cyan-500/10" },
  { id: "routine",  key: "routine",   title: "Daily Routine",       subtitle: "Morning to night",        icon: Sun,        to: "/habits",    search: { tab: "routine" }, gradient: "from-yellow-500/20 to-amber-500/10" },
];

const DEFAULT_VISIBLE = ["habit", "todo", "focus", "nutrition", "diet", "expenses"];

interface Counts { total: number; done: number; }

function storageKey(uid: string | undefined) {
  return `dashboard.modules.${uid ?? "anon"}`;
}
function freqKey(uid: string | undefined) {
  return `dashboard.modules.freq.${uid ?? "anon"}`;
}

function loadPrefs(uid: string | undefined): string[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE;
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return DEFAULT_VISIBLE;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return DEFAULT_VISIBLE;
    // Keep only known ids
    const known = new Set(ALL_MODULES.map((m) => m.id));
    return parsed.filter((id) => known.has(id));
  } catch {
    return DEFAULT_VISIBLE;
  }
}

function savePrefs(uid: string | undefined, ids: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(storageKey(uid), JSON.stringify(ids)); } catch { /* ignore */ }
}

function loadFreq(uid: string | undefined): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(freqKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch { return {}; }
}

function bumpFreq(uid: string | undefined, id: string) {
  if (typeof window === "undefined") return;
  try {
    const f = loadFreq(uid);
    f[id] = (f[id] ?? 0) + 1;
    localStorage.setItem(freqKey(uid), JSON.stringify(f));
  } catch { /* ignore */ }
}

export function ModuleGrid() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [visibleIds, setVisibleIds] = useState<string[]>(DEFAULT_VISIBLE);
  const [freq, setFreq] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);

  // Hydrate prefs once user is known.
  useEffect(() => {
    setVisibleIds(loadPrefs(user?.id));
    setFreq(loadFreq(user?.id));
  }, [user?.id]);

  // Refresh freq counters when the customize dialog opens.
  useEffect(() => {
    if (open) setFreq(loadFreq(user?.id));
  }, [open, user?.id]);

  const load = async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_tasks")
      .select("category,completed")
      .eq("user_id", user.id)
      .eq("task_date", today);
    const next: Record<string, Counts> = {};
    (data ?? []).forEach((r: { category: string; completed: boolean }) => {
      const c = next[r.category] ?? { total: 0, done: 0 };
      c.total += 1;
      if (r.completed) c.done += 1;
      next[r.category] = c;
    });
    setCounts(next);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel(`module-grid-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tasks", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line
  }, [user]);

  // Render in canonical ALL_MODULES order, filtered by visibility prefs.
  const visibleModules = useMemo(
    () => ALL_MODULES.filter((m) => visibleIds.includes(m.id)),
    [visibleIds],
  );

  const toggle = (id: string, on: boolean) => {
    setVisibleIds((prev) => {
      const set = new Set(prev);
      if (on) set.add(id); else set.delete(id);
      // Preserve canonical order in storage too.
      const ordered = ALL_MODULES.map((m) => m.id).filter((mid) => set.has(mid));
      savePrefs(user?.id, ordered);
      return ordered;
    });
  };

  return (
    <section>
      <div className="flex items-end justify-between mb-3 gap-3">
        <div>
          <h2 className="text-lg font-semibold">Your Modules</h2>
          <p className="text-xs text-muted-foreground">Jump into any area — progress syncs everywhere.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Customize Dashboard</span>
              <span className="sm:hidden">Customize</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Customize Dashboard</DialogTitle>
              <DialogDescription>
                Choose which modules appear on your homepage. Your preferences are saved automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {(() => {
                // Top 3 most-used ids for "Frequently used" badge.
                const topUsed = new Set(
                  Object.entries(freq)
                    .filter(([, n]) => (n as number) > 0)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 3)
                    .map(([id]) => id),
                );
                return ALL_MODULES.map((m) => {
                  const Icon = m.icon;
                  const on = visibleIds.includes(m.id);
                  const isFreq = topUsed.has(m.id);
                  return (
                    <div key={m.id} className="flex items-center gap-3 py-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          {m.title}
                          {isFreq && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-0.5">
                              <TrendingUp className="h-2.5 w-2.5" />
                              Frequent
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{m.subtitle}</div>
                      </div>
                      <Switch checked={on} onCheckedChange={(v) => toggle(m.id, v)} />
                    </div>
                  );
                });
              })()}
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  savePrefs(user?.id, DEFAULT_VISIBLE);
                  setVisibleIds(DEFAULT_VISIBLE);
                }}
              >
                Reset to defaults
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {visibleModules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No modules selected. Click <span className="font-medium">Customize Dashboard</span> to add some.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {visibleModules.map((m) => {
            const c = m.key ? counts[m.key] : undefined;
            const total = c?.total ?? 0;
            const done = c?.done ?? 0;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                to={m.to}
                search={m.search as never}
                onClick={() => bumpFreq(user?.id, m.id)}
                className={`group rounded-2xl border border-border bg-gradient-to-br ${m.gradient} bg-card p-4 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-0.5`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm leading-tight truncate">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{m.subtitle}</div>
                  </div>
                </div>
                {m.key && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>{total === 0 ? "No tasks yet" : `${done} / ${total} done`}</span>
                      <span>{percent}%</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
