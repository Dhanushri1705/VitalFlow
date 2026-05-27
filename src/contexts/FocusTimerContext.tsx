import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { applyStreak } from "@/lib/streak";
import { toast } from "sonner";

interface ActiveSession {
  id: string;
  habit_type: string;
  start_time: string; // ISO
  goal_seconds?: number | null;
}

interface FocusCtx {
  active: ActiveSession | null;
  elapsed: number; // seconds since start
  start: (habit_type: string, goal_seconds?: number | null) => Promise<void>;
  stop: () => Promise<{ duration: number; habit_type: string } | null>;
  cancel: () => Promise<void>;
}

const Ctx = createContext<FocusCtx | undefined>(undefined);
const LS_KEY = "vitalflow.activeFocus";

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // restore from localStorage / db on mount
  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    (async () => {
      const cached = localStorage.getItem(LS_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ActiveSession;
          // verify still active in DB
          const { data } = await supabase
            .from("focus_sessions")
            .select("id,habit_type,start_time,goal_seconds,status")
            .eq("id", parsed.id)
            .maybeSingle();
          if (data && data.status === "active") {
            setActive({ id: data.id, habit_type: data.habit_type, start_time: data.start_time, goal_seconds: data.goal_seconds });
            return;
          }
        } catch { /* fall through */ }
        localStorage.removeItem(LS_KEY);
      }
      // also recover any orphan active session for this user
      const { data } = await supabase
        .from("focus_sessions")
        .select("id,habit_type,start_time,goal_seconds")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const s = { id: data.id, habit_type: data.habit_type, start_time: data.start_time, goal_seconds: data.goal_seconds };
        setActive(s);
        localStorage.setItem(LS_KEY, JSON.stringify(s));
      }
    })();
  }, [user]);

  // tick
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const tick = () => {
      const sec = Math.max(0, Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
      setElapsed(sec);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  const start = useCallback(async (habit_type: string, goal_seconds?: number | null) => {
    if (!user) return;
    if (active) {
      toast.error("A focus session is already running. Stop it first.");
      return;
    }
    const start_time = new Date().toISOString();
    const { data, error } = await supabase
      .from("focus_sessions")
      .insert({ user_id: user.id, habit_type, start_time, goal_seconds: goal_seconds ?? null })
      .select("id,habit_type,start_time,goal_seconds")
      .single();
    if (error || !data) {
      toast.error("Could not start session");
      return;
    }
    const s = { id: data.id, habit_type: data.habit_type, start_time: data.start_time, goal_seconds: data.goal_seconds };
    setActive(s);
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    toast.success(`${habit_type} session started`);
  }, [user, active]);

  const stop = useCallback(async () => {
    if (!user || !active) return null;
    const end_time = new Date().toISOString();
    const duration = Math.max(1, Math.floor((Date.now() - new Date(active.start_time).getTime()) / 1000));
    await supabase
      .from("focus_sessions")
      .update({ end_time, duration_seconds: duration, status: "completed" })
      .eq("id", active.id);

    // If 30+ min, auto-add a completed daily task that contributes to today's progress + streak
    if (duration >= 30 * 60) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("daily_tasks").insert({
        user_id: user.id,
        title: `Focus: ${active.habit_type} (${Math.round(duration / 60)} min)`,
        category: "focus",
        completed: true,
        task_date: today,
      });
      const res = await applyStreak(user.id);
      if (res.reward) toast.success(`🎉 ${res.reward.days}-day milestone! +${res.reward.gems} gems`);
      await refreshProfile();
    }

    const result = { duration, habit_type: active.habit_type };
    setActive(null);
    setElapsed(0);
    localStorage.removeItem(LS_KEY);
    return result;
  }, [user, active, refreshProfile]);

  const cancel = useCallback(async () => {
    if (!active) return;
    await supabase.from("focus_sessions").update({ status: "cancelled", end_time: new Date().toISOString() }).eq("id", active.id);
    setActive(null);
    setElapsed(0);
    localStorage.removeItem(LS_KEY);
  }, [active]);

  return (
    <Ctx.Provider value={{ active, elapsed, start, stop, cancel }}>{children}</Ctx.Provider>
  );
}

export function useFocusTimer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFocusTimer must be inside FocusTimerProvider");
  return c;
}

export function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHuman(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} hour${h > 1 ? "s" : ""} ${m} minute${m !== 1 ? "s" : ""}`;
  return `${m} minute${m !== 1 ? "s" : ""}`;
}
