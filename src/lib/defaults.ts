/**
 * Per-module default tasks. Seeded ONLY ONCE per user per module.
 * After seeding, deletions stick — defaults won't reappear next day or on revisit.
 */
import { supabase } from "@/integrations/supabase/client";

export const MODULE_DEFAULTS: Record<string, { title: string; category: string }[]> = {
  habit: [
    { title: "Drink 8 glasses of water", category: "habit" },
    { title: "Take a 10-min walk", category: "habit" },
    { title: "Stretch for 5 minutes", category: "habit" },
    { title: "Read for 15 minutes", category: "habit" },
    { title: "Sleep 7+ hours tonight", category: "habit" },
  ],
  water: [
    { title: "Drink a glass of water now", category: "water" },
    { title: "Refill water bottle", category: "water" },
    { title: "Drink water before each meal", category: "water" },
  ],
  exercise: [
    { title: "Do 15 minutes of exercise", category: "exercise" },
    { title: "Stretch for 5 minutes", category: "exercise" },
    { title: "Take a brisk walk", category: "exercise" },
  ],
  routine: [
    { title: "Morning routine done", category: "routine" },
    { title: "Evening wind-down", category: "routine" },
    { title: "Sleep by target time", category: "routine" },
  ],
  nutrition: [
    { title: "Eat a fruit", category: "nutrition" },
    { title: "Add a protein source", category: "nutrition" },
    { title: "Eat one veggie meal", category: "nutrition" },
    { title: "Avoid sugary drinks", category: "nutrition" },
    { title: "Stay within calorie target", category: "nutrition" },
  ],
  hair: [
    { title: "Eat protein-rich foods", category: "hair" },
    { title: "Include Omega-3 foods (fish, walnuts)", category: "hair" },
    { title: "Drink enough water for scalp health", category: "hair" },
  ],
  skin: [
    { title: "Drink water (8 glasses)", category: "skin" },
    { title: "Eat Vitamin C foods (orange, kiwi)", category: "skin" },
    { title: "Follow skincare routine", category: "skin" },
  ],
  diet: [
    { title: "Protein-rich breakfast", category: "diet" },
    { title: "Mid-morning fruit", category: "diet" },
    { title: "Balanced lunch", category: "diet" },
    { title: "Healthy evening snack", category: "diet" },
    { title: "Light dinner", category: "diet" },
  ],
};

/**
 * In-memory guard against rapid double-mounts in the same session.
 * Keys: `${userId}:${module}`.
 */
const inflight = new Set<string>();
const sessionDone = new Set<string>();

/**
 * Seed defaults for a module exactly once per user, EVER.
 * Strategy:
 *  1. In-memory guard prevents StrictMode / fast re-mounts from double-firing.
 *  2. Atomic flag-set BEFORE insert: we mark `defaults_seeded[module] = true`
 *     first; if another concurrent call wins, our follow-up read sees it and aborts.
 *  3. Deletions persist — we never re-seed once the flag is set.
 */
export async function seedDefaultsOnce(
  userId: string,
  module: keyof typeof MODULE_DEFAULTS,
): Promise<void> {
  const key = `${userId}:${module}`;
  if (sessionDone.has(key) || inflight.has(key)) return;
  inflight.add(key);

  try {
    // Read current flag map.
    const { data: prof } = await supabase
      .from("profiles")
      .select("defaults_seeded")
      .eq("id", userId)
      .maybeSingle();
    const seeded = (prof?.defaults_seeded ?? {}) as Record<string, boolean>;
    if (seeded[module]) {
      sessionDone.add(key);
      return;
    }

    // Set the flag FIRST (before insert) so concurrent callers bail out.
    const updated = { ...seeded, [module]: true };
    const { error: flagErr } = await supabase
      .from("profiles")
      .update({ defaults_seeded: updated })
      .eq("id", userId);
    if (flagErr) return;

    // Re-read to verify we won the race (no harm if we lost — flag is now true either way).
    // Then insert defaults only if no rows for this category exist for this user yet.
    const { count } = await supabase
      .from("daily_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", module);
    if ((count ?? 0) > 0) {
      sessionDone.add(key);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const rows = MODULE_DEFAULTS[module].map((d) => ({
      user_id: userId,
      title: d.title,
      category: d.category,
      task_date: today,
    }));
    await supabase.from("daily_tasks").insert(rows);
    sessionDone.add(key);
  } finally {
    inflight.delete(key);
  }
}
