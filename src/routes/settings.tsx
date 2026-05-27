import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Moon, Sun } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: () => <AppShell><SettingsPage /></AppShell>,
});

function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [goal, setGoal] = useState("");
  const [dailyGoal, setDailyGoal] = useState<number>(5);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setDailyGoal(profile?.daily_goal ?? 5);
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") === "dark";
      setDark(saved);
      document.documentElement.classList.toggle("dark", saved);
    }
  }, [profile]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const save = async () => {
    if (!user) return;
    await supabase.from("profiles").update({
      full_name: fullName,
      daily_goal: dailyGoal,
      health_goals: { primary: goal },
    }).eq("id", user.id);
    await refreshProfile();
    toast.success("Settings saved");
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-health flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Profile & preferences</p>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 shadow-soft space-y-4">
        <h3 className="font-semibold">Profile</h3>
        <div>
          <Label>Full name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Username</Label>
          <Input value={profile?.username ?? ""} disabled className="mt-1.5" />
        </div>
        <div>
          <Label>Primary health goal</Label>
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. lose 5kg in 3 months" className="mt-1.5" />
        </div>
        <div>
          <Label>Daily task goal</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            How many tasks per day? Streak counts when you complete ≥75%.
          </p>
          <div className="flex gap-2">
            {[5, 8, 10].map((n) => (
              <Button
                key={n}
                type="button"
                variant={dailyGoal === n ? "default" : "outline"}
                onClick={() => setDailyGoal(n)}
                className={dailyGoal === n ? "bg-gradient-health" : ""}
              >
                {n} tasks
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={save} className="bg-gradient-health">Save changes</Button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
        <h3 className="font-semibold mb-3">Appearance</h3>
        <Button variant="outline" onClick={toggleTheme}>
          {dark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
          {dark ? "Light" : "Dark"} mode
        </Button>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 shadow-soft">
        <h3 className="font-semibold mb-1">Stats</h3>
        <p className="text-sm text-muted-foreground">Lifetime overview</p>
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gradient">{profile?.gems ?? 0}</div>
            <div className="text-xs text-muted-foreground">💎 Gems</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gradient">{profile?.current_streak ?? 0}</div>
            <div className="text-xs text-muted-foreground">🔥 Current</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gradient">{profile?.longest_streak ?? 0}</div>
            <div className="text-xs text-muted-foreground">🏆 Best</div>
          </div>
        </div>
      </div>
    </div>
  );
}
