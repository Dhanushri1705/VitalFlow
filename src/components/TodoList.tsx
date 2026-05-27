import { useEffect, useState } from "react";
import { Plus, Bell, Trash2, CheckCircle2, Circle, Sparkles, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyStreak } from "@/lib/streak";

interface Todo {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  reminder_minutes: number | null;
  completed: boolean;
  recurrence: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function TodoList() {
  const { user, refreshProfile } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [reminder, setReminder] = useState<string>("none");
  const [recurrence, setRecurrence] = useState<string>("none");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .gte("due_date", today())
      .order("due_date")
      .order("due_time", { nullsFirst: false });
    setTodos((data as Todo[]) ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Browser notification scheduler (in-app, while tab open)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // request lazily on first add
    }
    const timers: number[] = [];
    todos.forEach((t) => {
      if (t.completed || !t.due_time || !t.reminder_minutes) return;
      const [h, m] = t.due_time.split(":").map(Number);
      const due = new Date(t.due_date);
      due.setHours(h, m, 0, 0);
      const fireAt = due.getTime() - t.reminder_minutes * 60_000;
      const ms = fireAt - Date.now();
      if (ms > 0 && ms < 24 * 3600 * 1000) {
        const id = window.setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("⏰ VitalFlow reminder", { body: `${t.title} in ${t.reminder_minutes}m` });
          }
          toast.info(`⏰ ${t.title} in ${t.reminder_minutes}m`);
        }, ms);
        timers.push(id);
      }
    });
    return () => { timers.forEach((id) => clearTimeout(id)); };
  }, [todos]);

  const addTodo = async () => {
    if (!user || !title.trim()) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const { data } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        title: title.trim(),
        due_date: today(),
        due_time: time || null,
        reminder_minutes: reminder === "none" ? null : Number(reminder),
        recurrence,
      })
      .select()
      .single();
    if (data) {
      setTodos((p) => [...p, data as Todo]);
      // Mirror into daily_tasks so streak/checklist counts it.
      await supabase.from("daily_tasks").insert({
        user_id: user.id,
        title: title.trim(),
        category: "todo",
        task_date: today(),
      });
    }
    setTitle(""); setTime(""); setReminder("none"); setRecurrence("none");
  };

  const toggle = async (t: Todo) => {
    const newDone = !t.completed;
    setTodos((p) => p.map((x) => (x.id === t.id ? { ...x, completed: newDone } : x)));
    await supabase.from("todos").update({ completed: newDone }).eq("id", t.id);
    // Sync the mirrored daily_task by title+date (best-effort).
    await supabase
      .from("daily_tasks")
      .update({ completed: newDone })
      .eq("user_id", user!.id)
      .eq("category", "todo")
      .eq("task_date", today())
      .eq("title", t.title);
    const res = await applyStreak(user!.id);
    if (res.reward) toast.success(`🎉 ${res.reward.days}-day milestone! +${res.reward.gems} 💎`);
    await refreshProfile();
  };

  const remove = async (id: string, t: Todo) => {
    setTodos((p) => p.filter((x) => x.id !== id));
    await supabase.from("todos").delete().eq("id", id);
    await supabase
      .from("daily_tasks")
      .delete()
      .eq("user_id", user!.id)
      .eq("category", "todo")
      .eq("task_date", today())
      .eq("title", t.title);
  };

  const planMyDay = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          module: "todo",
          messages: [
            { role: "user", content: "Suggest 5 prioritized realistic tasks for my day. Reply with one task per line, no numbering, no markdown." },
          ],
        }),
      });
      if (!resp.ok || !resp.body) {
        toast.error("AI unavailable");
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const p = JSON.parse(json);
            const d = p.choices?.[0]?.delta?.content;
            if (d) acc += d;
          } catch { /* noop */ }
        }
      }
      const lines = acc.split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 5);
      if (lines.length === 0) {
        toast.error("AI didn't return tasks");
        return;
      }
      const rows = lines.map((title) => ({
        user_id: user.id,
        title,
        due_date: today(),
        recurrence: "none",
      }));
      await supabase.from("todos").insert(rows);
      await supabase.from("daily_tasks").insert(
        lines.map((title) => ({ user_id: user.id, title, category: "todo", task_date: today() })),
      );
      toast.success(`Added ${lines.length} AI-planned tasks`);
      load();
    } finally {
      setAiLoading(false);
    }
  };

  const completed = todos.filter((t) => t.completed).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Today's plan</h3>
          <span className="text-xs text-muted-foreground">{completed}/{todos.length} done</span>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 mb-4">
          <Input placeholder="What do you want to get done?" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTodo()} />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />
          <Select value={reminder} onValueChange={setReminder}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Reminder" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No reminder</SelectItem>
              <SelectItem value="5">5 min before</SelectItem>
              <SelectItem value="15">15 min before</SelectItem>
              <SelectItem value="30">30 min before</SelectItem>
              <SelectItem value="60">1 hr before</SelectItem>
            </SelectContent>
          </Select>
          <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Repeat" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">One-off</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addTodo} className="bg-gradient-health"><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={planMyDay} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            Plan my day with AI
          </Button>
        </div>

        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No tasks yet — add one above or let AI plan your day.</p>
        ) : (
          <ul className="space-y-1.5">
            {todos.map((t) => (
              <li key={t.id} className="group flex items-center rounded-lg hover:bg-muted transition-colors">
                <button onClick={() => toggle(t)} className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left">
                  {t.completed ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                  <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  {t.due_time && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{t.due_time.slice(0, 5)}
                    </span>
                  )}
                  {t.reminder_minutes && (
                    <Bell className="h-3 w-3 text-primary" />
                  )}
                  {t.recurrence !== "none" && (
                    <span className="text-[10px] uppercase tracking-wider text-primary">{t.recurrence}</span>
                  )}
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100" onClick={() => remove(t.id, t)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
