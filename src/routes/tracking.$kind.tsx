import { createFileRoute } from "@tanstack/react-router";
import { Moon, Droplet, Flame, Apple, Plus, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/tracking/$kind")({
  component: () => <AppShell><TrackingPage /></AppShell>,
});

type Kind = "sleep" | "water" | "activity" | "nutrition";

const CONFIG: Record<Kind, { label: string; icon: React.ComponentType<{ className?: string }>; unit: string; goal: number; step: number; color: string }> = {
  sleep:     { label: "Sleep",     icon: Moon,    unit: "h",        goal: 8,    step: 1,    color: "oklch(0.62 0.14 200)" },
  water:     { label: "Water",     icon: Droplet, unit: "glasses",  goal: 8,    step: 1,    color: "oklch(0.78 0.13 180)" },
  activity:  { label: "Activity",  icon: Flame,   unit: "steps",    goal: 8000, step: 1000, color: "oklch(0.72 0.15 160)" },
  nutrition: { label: "Nutrition", icon: Apple,   unit: "kcal",     goal: 2200, step: 200,  color: "oklch(0.78 0.14 60)"  },
};

function TrackingPage() {
  const { kind } = Route.useParams();
  const k = (kind as Kind) in CONFIG ? (kind as Kind) : "sleep";
  const cfg = CONFIG[k];
  const Icon = cfg.icon;
  const { user } = useAuth();
  const [week, setWeek] = useState<{ day: string; date: string; value: number }[]>([]);
  const [customAmount, setCustomAmount] = useState<number>(cfg.step);

  const load = async () => {
    if (!user) return;
    const days: { date: string; day: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().slice(0, 10),
        day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()],
      });
    }
    const { data } = await supabase
      .from("metric_logs")
      .select("log_date,value")
      .eq("user_id", user.id)
      .eq("metric_type", k)
      .gte("log_date", days[0].date);
    const totals = new Map<string, number>();
    (data ?? []).forEach((r: { log_date: string; value: number }) => {
      totals.set(r.log_date, (totals.get(r.log_date) ?? 0) + Number(r.value || 0));
    });
    setWeek(days.map((d) => ({ day: d.day, date: d.date, value: totals.get(d.date) ?? 0 })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, k]);

  const logValue = async (amount: number) => {
    if (!user || !amount) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("metric_logs").insert({ user_id: user.id, metric_type: k, value: amount, log_date: today });
    toast.success(`${amount > 0 ? "+" : ""}${amount} ${cfg.unit}`);
    load();
  };

  const today = week.length ? week[6].value : 0;
  const avg = week.length ? week.reduce((s, d) => s + d.value, 0) / 7 : 0;
  const fmt = (n: number) => k === "activity" || k === "nutrition" ? Math.round(n).toLocaleString() : n.toFixed(k === "sleep" ? 1 : 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-health flex items-center justify-center">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{cfg.label} Tracking</h1>
          <p className="text-sm text-muted-foreground">Last 7 days</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card label="Today" value={fmt(today)} unit={cfg.unit} accent />
        <Card label="Goal" value={fmt(cfg.goal)} unit={cfg.unit} />
        <Card label="7-day average" value={fmt(avg)} unit={cfg.unit} />
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold">Log {cfg.label.toLowerCase()}</h3>
          <div className="flex flex-wrap gap-2 items-center">
            <Button size="sm" variant="outline" onClick={() => logValue(-cfg.step)} className="gap-1">
              <Minus className="h-3.5 w-3.5" /> {cfg.step} {cfg.unit}
            </Button>
            <Button size="sm" variant="outline" onClick={() => logValue(cfg.step)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> {cfg.step} {cfg.unit}
            </Button>
            <Input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(Number(e.target.value))}
              className="w-24 h-9"
            />
            <Button size="sm" variant="outline" onClick={() => logValue(-Math.abs(customAmount))}>− Add</Button>
            <Button size="sm" onClick={() => logValue(Math.abs(customAmount))}>+ Add</Button>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week}>
              <CartesianGrid vertical={false} stroke="oklch(0.92 0.015 210)" />
              <XAxis dataKey="day" stroke="oklch(0.55 0.03 220)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.55 0.03 220)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.015 210)", fontSize: 12 }} />
              <Bar dataKey="value" fill={cfg.color} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {week.every((d) => d.value === 0) && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            No entries yet — add your first log above to start the trend.
          </p>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-5 shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent ? "text-gradient" : ""}`}>
        {value}
        <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
    </div>
  );
}
