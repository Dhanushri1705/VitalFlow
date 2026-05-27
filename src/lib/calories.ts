/**
 * Food → calorie lookup via Lovable AI Gateway (called through health-ai edge function).
 */
export async function lookupFoodCalories(food: string): Promise<{ calories: number; note: string } | null> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-ai`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ mode: "calorie-lookup", food }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (typeof data.calories !== "number") return null;
    return { calories: Math.round(data.calories), note: data.note ?? "" };
  } catch {
    return null;
  }
}
