/**
 * Streak engine
 * Rule: ≥75% of today's tasks complete -> streak +1 (once per day)
 * Missing 1 day = warning. Missing 2 consecutive days = streak resets.
 * Reward milestones grant gems.
 */
import { supabase } from "@/integrations/supabase/client";

export const REWARD_MILESTONES: Record<number, number> = {
  3: 50,
  7: 250,
  14: 500,
  30: 1500,
};
export const RESTORE_COST = 200;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export interface DailyStats {
  total: number;
  completed: number;
  percent: number;
  threshold: boolean;
}

export async function recomputeDailyStats(userId: string): Promise<DailyStats> {
  const day = todayISO();
  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("id, completed")
    .eq("user_id", userId)
    .eq("task_date", day);
  // Use the user's actual active task count as the denominator.
  const total = tasks?.length ?? 0;
  const completed = tasks?.filter((t) => t.completed).length ?? 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const threshold = total > 0 && percent >= 75;
  // Debug: streak source-of-truth values come from DB, not local state.
  console.log("[streak] DB stats", { userId, day, total, completed, percent, threshold });

  await supabase.from("streak_log").upsert(
    {
      user_id: userId,
      log_date: day,
      total_count: total,
      completed_count: completed,
      percent,
    },
    { onConflict: "user_id,log_date" },
  );

  return { total, completed, percent, threshold };
}

/**
 * Apply streak rule based on today's completion. Returns updated profile values + reward (if any).
 */
export async function applyStreak(userId: string): Promise<{
  current_streak: number;
  gems: number;
  reward?: { days: number; gems: number };
  message: string;
}> {
  const day = todayISO();
  const stats = await recomputeDailyStats(userId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, gems, last_streak_date, missed_days")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) throw new Error("Profile not found");

  const { data: log } = await supabase
    .from("streak_log")
    .select("counted")
    .eq("user_id", userId)
    .eq("log_date", day)
    .maybeSingle();

  let current = profile.current_streak ?? 0;
  let longest = profile.longest_streak ?? 0;
  let gems = profile.gems ?? 0;
  let last = profile.last_streak_date as string | null;
  let missed = profile.missed_days ?? 0;
  let reward: { days: number; gems: number } | undefined;
  let message = "";

  // Handle gap from last counted day
  if (last) {
    const gap = diffDays(last, day);
    if (gap >= 2) {
      current = 0;
      missed = 0;
      message = "Streak reset — missed 2+ days.";
    } else if (gap === 1) {
      // last counted yesterday — fine, no reset
      missed = 0;
    }
  }

  if (stats.threshold && !log?.counted) {
    current += 1;
    longest = Math.max(longest, current);
    last = day;
    missed = 0;
    if (REWARD_MILESTONES[current]) {
      const r = REWARD_MILESTONES[current];
      gems += r;
      reward = { days: current, gems: r };
    }
    message = `🔥 Streak +1! Now at ${current} days.`;
    await supabase
      .from("streak_log")
      .update({ counted: true })
      .eq("user_id", userId)
      .eq("log_date", day);
  } else if (!stats.threshold && stats.total > 0) {
    message = `${stats.percent}% complete — reach 75% to keep your streak.`;
  } else if (stats.total === 0) {
    message = "Add some tasks to start your streak today.";
  } else {
    message = `Streak maintained at ${current} days 🔥`;
  }

  await supabase
    .from("profiles")
    .update({
      current_streak: current,
      longest_streak: longest,
      gems,
      last_streak_date: last,
      missed_days: missed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return { current_streak: current, gems, reward, message };
}

export async function restoreStreak(userId: string, restoreTo: number): Promise<{ ok: boolean; message: string }> {
  const { data: p } = await supabase
    .from("profiles")
    .select("gems")
    .eq("id", userId)
    .maybeSingle();
  if (!p) return { ok: false, message: "No profile" };
  if ((p.gems ?? 0) < RESTORE_COST) {
    return { ok: false, message: `Need ${RESTORE_COST} gems to restore.` };
  }
  await supabase
    .from("profiles")
    .update({
      gems: p.gems - RESTORE_COST,
      current_streak: restoreTo,
      last_streak_date: todayISO(),
      missed_days: 0,
    })
    .eq("id", userId);
  return { ok: true, message: `Streak restored to ${restoreTo} days!` };
}

export function nextMilestone(current: number): number {
  const keys = Object.keys(REWARD_MILESTONES).map(Number).sort((a, b) => a - b);
  return keys.find((k) => k > current) ?? current + 7;
}
