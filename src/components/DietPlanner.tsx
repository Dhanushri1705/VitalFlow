import { useEffect, useState } from "react";
import { Apple, Sparkles, Plus, CheckCircle2, Circle, Trash2, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIAssistant } from "@/components/AIAssistant";
import { seedDefaultsOnce } from "@/lib/defaults";
import { lookupFoodCalories } from "@/lib/calories";
import { applyStreak } from "@/lib/streak";

interface DietTask { id: string; title: string; completed: boolean; }

const today = () => new Date().toISOString().slice(0, 10);

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "text-warning-foreground" };
  if (bmi < 25)   return { label: "Normal",       color: "text-success" };
  if (bmi < 30)   return { label: "Overweight",   color: "text-warning-foreground" };
  return            { label: "Obese",         color: "text-destructive" };
}

function calorieEstimate(weight: number, height: number, age: number, goal: string) {
  // Simple Mifflin–St Jeor (assume male; reasonable starting point — user can adjust).
  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const tdee = bmr * 1.4; // light activity
  if (goal === "loss") return Math.round(tdee - 400);
  if (goal === "gain" || goal === "muscle") return Math.round(tdee + 400);
  return Math.round(tdee);
}

export function DietPlanner() {
  const { user, profile, refreshProfile } = useAuth();
  const [showAI, setShowAI] = useState(false);
  const [tasks, setTasks] = useState<DietTask[]>([]);
  const [newTask, setNewTask] = useState("");
  const [foodInput, setFoodInput] = useState("");
  const [calories, setCalories] = useState(0);

  // Onboarding form state
  const [height, setHeight] = useState<string>(profile?.bmi_height_cm?.toString() ?? "");
  const [weight, setWeight] = useState<string>(profile?.bmi_weight_kg?.toString() ?? "");
  const [age, setAge] = useState<string>(profile?.bmi_age?.toString() ?? "");
  const [goal, setGoal] = useState<string>(profile?.diet_goal ?? "maintain");

  const isOnboarded = !!(profile?.bmi_height_cm && profile?.bmi_weight_kg && profile?.diet_goal);

  const loadTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_tasks")
      .select("id,title,completed")
      .eq("user_id", user.id)
      .eq("task_date", today())
      .eq("category", "diet")
      .order("created_at");
    setTasks((data as DietTask[]) ?? []);
  };

  const loadCalories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("metric_logs")
      .select("value")
      .eq("user_id", user.id)
      .eq("metric_type", "nutrition")
      .eq("log_date", today());
    setCalories((data ?? []).reduce((s, r: { value: number }) => s + Number(r.value || 0), 0));
  };

  useEffect(() => {
    if (!user || !isOnboarded) return;
    seedDefaultsOnce(user.id, "diet").finally(() => loadTasks());
    loadCalories();
    /* eslint-disable-next-line */
  }, [user, isOnboarded]);

  const saveOnboarding = async () => {
    if (!user) return;
    const h = Number(height), w = Number(weight), a = Number(age);
    if (!h || !w || !a) { toast.error("Please fill height, weight, age"); return; }
    const target = calorieEstimate(w, h, a, goal);
    await supabase
      .from("profiles")
      .update({ bmi_height_cm: h, bmi_weight_kg: w, bmi_age: a, diet_goal: goal, calorie_target: target })
      .eq("id", user.id);
    await refreshProfile();
    toast.success(`Plan saved! Daily target: ${target} kcal`);
  };

  const addTask = async () => {
    if (!user || !newTask.trim()) return;
    const { data } = await supabase
      .from("daily_tasks")
      .insert({ user_id: user.id, title: newTask, category: "diet", task_date: today() })
      .select("id,title,completed")
      .single();
    if (data) setTasks((p) => [...p, data as DietTask]);
    setNewTask("");
  };

  const toggle = async (t: DietTask) => {
    const newDone = !t.completed;
    setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, completed: newDone } : x)));
    await supabase.from("daily_tasks").update({ completed: newDone }).eq("id", t.id);
    const res = await applyStreak(user!.id);
    if (res.reward) toast.success(`🎉 +${res.reward.gems} 💎`);
    await refreshProfile();
  };

  const remove = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    await supabase.from("daily_tasks").delete().eq("id", id);
  };

  const logFood = async (sign: 1 | -1) => {
    if (!user || !foodInput.trim()) return;
    const result = await lookupFoodCalories(foodInput.trim());
    if (!result || result.calories <= 0) { toast.error("Couldn't estimate calories"); return; }
    const value = sign * result.calories;
    await supabase.from("metric_logs").insert({ user_id: user.id, metric_type: "nutrition", value, log_date: today() });
    toast.success(`${sign > 0 ? "+" : "−"}${result.calories} kcal`);
    setFoodInput("");
    loadCalories();
  };

  if (!isOnboarded) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl bg-card border border-border p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-health flex items-center justify-center">
            <Apple className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Diet Maintain Planner</h2>
            <p className="text-xs text-muted-foreground">Tell us about you to build your plan.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs text-muted-foreground">Height (cm)</label><Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Weight (kg)</label><Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Age</label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Goal</label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="maintain">Maintain weight</SelectItem>
              <SelectItem value="loss">Weight loss</SelectItem>
              <SelectItem value="gain">Weight gain</SelectItem>
              <SelectItem value="muscle">Muscle building</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={saveOnboarding} className="w-full bg-gradient-health">Build my plan</Button>
      </div>
    );
  }

  const h = Number(profile!.bmi_height_cm) / 100;
  const bmi = Number(profile!.bmi_weight_kg) / (h * h);
  const cat = bmiCategory(bmi);
  const target = profile!.calorie_target ?? 2000;
  const remaining = Math.max(0, target - calories);
  const completedCount = tasks.filter((t) => t.completed).length;
  const percent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-4 relative">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="BMI" value={bmi.toFixed(1)} sub={cat.label} subClass={cat.color} />
        <StatCard label="Goal" value={(profile!.diet_goal ?? "").replace(/^./, (c) => c.toUpperCase())} sub="" />
        <StatCard label="Today" value={`${calories} kcal`} sub={`Target ${target}`} />
        <StatCard label="Remaining" value={`${remaining} kcal`} sub={remaining === 0 ? "Goal hit 🎉" : ""} />
      </div>

      {/* Food logger */}
      <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-2">
          <Apple className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Log a meal (AI estimates calories)</span>
        </div>
        <div className="flex gap-2">
          <Input value={foodInput} onChange={(e) => setFoodInput(e.target.value)} placeholder="e.g. 2 eggs and toast" onKeyDown={(e) => e.key === "Enter" && logFood(1)} />
          <Button variant="outline" size="icon" onClick={() => logFood(-1)} disabled={!foodInput.trim()}><Minus className="h-4 w-4" /></Button>
          <Button onClick={() => logFood(1)} disabled={!foodInput.trim()} className="bg-gradient-health"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Diet checklist */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-soft">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Diet checklist</h3>
          <span className="text-xs text-muted-foreground">{completedCount}/{tasks.length} • {percent}%</span>
        </div>
        <Progress value={percent} className="h-2 mb-3" />
        <ul className="space-y-1.5">
          {tasks.map((t) => (
            <li key={t.id} className="group flex items-center rounded-lg hover:bg-muted transition-colors">
              <button onClick={() => toggle(t)} className="flex-1 flex items-center gap-3 px-3 py-2 text-left">
                {t.completed ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                <span className={`text-sm flex-1 ${t.completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-3">
          <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Add a diet task…" onKeyDown={(e) => e.key === "Enter" && addTask()} />
          <Button size="icon" variant="outline" onClick={addTask}><Plus className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Floating AI assistant */}
      {!showAI ? (
        <Button
          onClick={() => setShowAI(true)}
          className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-elegant bg-gradient-health"
          size="icon"
          aria-label="Diet AI assistant"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      ) : (
        <div className="fixed bottom-6 right-6 z-30 w-[min(420px,calc(100vw-3rem))]">
          <Button size="icon" variant="outline" className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full" onClick={() => setShowAI(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <AIAssistant
            module="diet"
            title="Diet Planner AI"
            starterQuestions={[
              `Build a ${profile?.diet_goal} diet plan for me`,
              "Suggest 3 high-protein vegetarian meals",
              "What should I eat to stay within my calorie goal?",
            ]}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, subClass }: { label: string; value: string; sub: string; subClass?: string }) {
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-4 shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className={`text-[11px] mt-0.5 ${subClass ?? "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}
