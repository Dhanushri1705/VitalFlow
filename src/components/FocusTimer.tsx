import { useEffect, useState } from "react";
import { Play, Square, Timer as TimerIcon, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFocusTimer, formatDuration, formatHuman } from "@/contexts/FocusTimerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HABITS = ["Coding", "Studying", "Exercise", "Meditation", "Reading", "Writing", "Other"];
const PRESETS = [
  { label: "No goal", value: 0 },
  { label: "25 min focus", value: 25 * 60 },
  { label: "45 min focus", value: 45 * 60 },
  { label: "1 hour", value: 60 * 60 },
  { label: "Custom", value: -1 },
];

interface SessionRow {
  id: string;
  habit_type: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  status: string;
}

export function FocusTimer() {
  const { user } = useAuth();
  const { active, elapsed, start, stop, cancel } = useFocusTimer();
  const [habit, setHabit] = useState("Coding");
  const [customHabit, setCustomHabit] = useState("");
  const [presetVal, setPresetVal] = useState(0);
  const [customMin, setCustomMin] = useState(30);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const loadSessions = async () => {
    if (!user) return;
    const sevenDays = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data } = await supabase
      .from("focus_sessions")
      .select("id,habit_type,start_time,end_time,duration_seconds,status")
      .eq("user_id", user.id)
      .gte("start_time", sevenDays)
      .order("start_time", { ascending: false });
    setSessions((data as SessionRow[]) ?? []);
  };

  useEffect(() => { loadSessions(); /* eslint-disable-next-line */ }, [user, active]);

  const handleStart = async () => {
    const ht = habit === "Other" ? (customHabit.trim() || "Focus") : habit;
    const goal = presetVal === -1 ? Math.max(1, customMin) * 60 : presetVal || null;
    await start(ht, goal);
  };

  const handleStop = async () => {
    const r = await stop();
    if (r) {
      toast.success(`${r.habit_type} session completed — ${formatHuman(r.duration)}`);
      loadSessions();
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.start_time.slice(0, 10) === todayISO && s.status === "completed");
  const todayTotal = todaySessions.reduce((a, s) => a + s.duration_seconds, 0);
  const weekTotal = sessions.filter((s) => s.status === "completed").reduce((a, s) => a + s.duration_seconds, 0);

  const perHabit = sessions
    .filter((s) => s.status === "completed")
    .reduce<Record<string, number>>((acc, s) => {
      acc[s.habit_type] = (acc[s.habit_type] ?? 0) + s.duration_seconds;
      return acc;
    }, {});

  return (
    <div className="space-y-6">
      {/* Active or starter */}
      <div className="rounded-2xl bg-gradient-hero text-white p-6 shadow-elegant relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-white/90 text-sm mb-3">
            <TimerIcon className="h-4 w-4" /> Focus Session
          </div>
          {active ? (
            <>
              <div className="text-sm text-white/80 capitalize">{active.habit_type} in progress</div>
              <div className="font-mono text-5xl md:text-6xl font-bold mt-2">{formatDuration(elapsed)}</div>
              {active.goal_seconds ? (
                <div className="mt-3">
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all"
                      style={{ width: `${Math.min(100, (elapsed / active.goal_seconds) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-white/80 mt-1">
                    Goal: {formatHuman(active.goal_seconds)}
                  </div>
                </div>
              ) : null}
              <div className="flex gap-2 mt-5">
                <Button onClick={handleStop} variant="secondary" className="gap-2">
                  <Square className="h-4 w-4" /> End session
                </Button>
                <Button onClick={cancel} variant="ghost" className="text-white hover:bg-white/10">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-white/80 mb-1 block">Habit</label>
                  <Select value={habit} onValueChange={setHabit}>
                    <SelectTrigger className="bg-white/15 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HABITS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {habit === "Other" && (
                    <Input
                      className="mt-2 bg-white/15 border-white/20 text-white placeholder:text-white/60"
                      placeholder="Custom habit name"
                      value={customHabit}
                      onChange={(e) => setCustomHabit(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/80 mb-1 block">Goal (optional)</label>
                  <Select value={String(presetVal)} onValueChange={(v) => setPresetVal(Number(v))}>
                    <SelectTrigger className="bg-white/15 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESETS.map((p) => <SelectItem key={p.label} value={String(p.value)}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {presetVal === -1 && (
                    <Input
                      type="number"
                      min={1}
                      className="mt-2 bg-white/15 border-white/20 text-white"
                      placeholder="Minutes"
                      value={customMin}
                      onChange={(e) => setCustomMin(Number(e.target.value))}
                    />
                  )}
                </div>
              </div>
              <Button onClick={handleStart} variant="secondary" size="lg" className="mt-5 gap-2">
                <Play className="h-4 w-4" /> Start session
              </Button>
              <p className="text-xs text-white/75 mt-3">
                Tip: Sessions of 30+ minutes count as a completed habit task and contribute to your streak.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Clock} label="Today" value={formatHuman(todayTotal)} sub={`${todaySessions.length} sessions`} />
        <StatCard icon={Target} label="This week" value={formatHuman(weekTotal)} sub="last 7 days" />
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <div className="text-xs text-muted-foreground mb-2">Time per habit</div>
          {Object.keys(perHabit).length === 0 ? (
            <div className="text-sm text-muted-foreground">No completed sessions yet.</div>
          ) : (
            <ul className="space-y-1">
              {Object.entries(perHabit).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{k}</span>
                  <span className="font-medium">{formatHuman(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <h3 className="font-semibold mb-3">Recent sessions</h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No focus sessions yet. Start your first one above.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.slice(0, 12).map((s) => (
              <li key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium capitalize truncate">{s.habit_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.start_time).toLocaleString()} • {s.status}
                  </div>
                </div>
                <div className="font-mono text-sm">{formatHuman(s.duration_seconds)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string; }) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-4 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
