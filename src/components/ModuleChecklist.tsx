import { useEffect, useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyStreak } from "@/lib/streak";
import { seedDefaultsOnce, MODULE_DEFAULTS } from "@/lib/defaults";
import { AIAssistant } from "@/components/AIAssistant";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  task_date: string;
  user_id: string;
}

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  moduleKey: keyof typeof MODULE_DEFAULTS;
  aiModule: "habit" | "nutrition";
  title: string;
  aiTitle: string;
  starterQuestions: string[];
}

export function ModuleChecklist({ moduleKey, aiModule, title, aiTitle, starterQuestions }: Props) {
  const { user, refreshProfile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [showAI, setShowAI] = useState(false);

  const load = async () => {
    if (!user) return;

    // 1. Fetch ALL tasks for this category so they don't disappear
    const { data, error } = await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("category", moduleKey)
      .order("created_at");

    if (error) {
      console.error("Error loading tasks:", error);
      return;
    }

    const allTasks = (data as Task[]) ?? [];
    const currentDate = today();

    // 2. Check if any tasks need a reset for the new day
    const needsRollover = allTasks.some(t => t.task_date !== currentDate);

    if (needsRollover) {
      const updatedTasks = allTasks.map(t => ({
        id: t.id,
        user_id: user.id, // Included to fix the TS error
        title: t.title,
        category: t.category,
        task_date: currentDate,
        completed: false // Reset for the new day
      }));

      // Update database so habits persist with today's date
      const { error: upsertError } = await supabase
        .from("daily_tasks")
        .upsert(updatedTasks);

      if (!upsertError) {
        setTasks(updatedTasks as Task[]);
      } else {
        setTasks(allTasks);
      }
    } else {
      setTasks(allTasks);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      await seedDefaultsOnce(user.id, moduleKey);
      await load();
    })();
  }, [user, moduleKey]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`tasks-${moduleKey}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_tasks", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, moduleKey]);

  const toggle = async (t: Task) => {
    const newCompleted = !t.completed;
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, completed: newCompleted } : x)));
    
    const { error } = await supabase
      .from("daily_tasks")
      .update({ completed: newCompleted })
      .eq("id", t.id);

    if (error) {
      setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, completed: t.completed } : x)));
      toast.error("Couldn't save checkmark");
      return;
    }

    if (user) {
      await applyStreak(user.id);
      await refreshProfile();
    }
  };

  const add = async () => {
    if (!newTitle.trim() || !user) return;
    
    const { data, error } = await supabase
      .from("daily_tasks")
      .insert({ 
        user_id: user.id, 
        title: newTitle.trim(), 
        category: moduleKey, 
        task_date: today() 
      })
      .select()
      .single();

    if (error) {
      toast.error("Error adding habit");
      return;
    }

    if (data) {
      setTasks((p) => [...p, data as Task]);
      setNewTitle("");
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from("daily_tasks")
      .delete()
      .eq("id", id);

    if (!error) {
      setTasks((p) => p.filter((t) => t.id !== id));
      toast.success("Habit deleted");
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{tasks.length} done · {percent}%
            </p>
          </div>
          <Button
            size="sm"
            variant={showAI ? "secondary" : "outline"}
            onClick={() => setShowAI((s) => !s)}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {showAI ? "Hide AI" : "Ask AI"}
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add a permanent habit…"
          />
          <Button onClick={add} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No habits yet. Add one to see it every day!
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 group">
                <button onClick={() => toggle(t)} className="shrink-0">
                  {t.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                  {t.title}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        {showAI ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">AI Coach</h3>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowAI(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AIAssistant module={aiModule} title={aiTitle} starterQuestions={starterQuestions} />
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold text-sm mb-1">Stay Consistent</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Your habits stay in this list every day until you manually delete them.
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowAI(true)}>
              <Sparkles className="h-4 w-4 mr-1" />
              Open AI Coach
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}