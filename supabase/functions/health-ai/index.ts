declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FRIENDLY_FOOD_RULES = `
CRITICAL FOOD-LANGUAGE RULES:
- NEVER recommend a nutrient/supplement name alone (e.g. "Consume Omega-3").
- ALWAYS translate it into specific, common foods the user can buy or eat.
- When you suggest a multi-day habit/plan, say the explicit duration (e.g., "Follow this for 21 days").
- Use beginner-friendly language. No medical jargon without an example.
`;

const SYSTEM_PROMPTS: Record<string, string> = {
  nutrition: `You are VitalFlow's nutrition AI coach. Give concise, actionable suggestions. Keep responses under 180 words. Use bullet points.\n${FRIENDLY_FOOD_RULES}`,
  habit: `You are VitalFlow's habit & fitness AI coach. End with one specific micro-action the user can do today.\n${FRIENDLY_FOOD_RULES}`,
  diet: `You are VitalFlow's diet planner AI. Build personalized diet plans. Keep responses under 200 words.\n${FRIENDLY_FOOD_RULES}`,
  todo: `You are VitalFlow's productivity coach. Help users plan their day with a checklist format.`,
};

async function calorieLookup(food: string, apiKey: string): Promise<any> {
  const resp = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${apiKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a nutrition database. Given a food description, return ONLY a JSON object: {\"calories\": <number>, \"note\": \"<short note>\"}. No markdown.",
          },
          { role: "user", content: `Estimate calories for: ${food}` },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );
  
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: "Groq lookup failed" }), {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  const json = await resp.json() as any;
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed: { calories?: number; note?: string } = {};
  try { parsed = JSON.parse(content); } catch { /* noop */ }
  
  return new Response(
    JSON.stringify({ calories: parsed.calories ?? 0, note: parsed.note ?? "" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req: any) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured in Supabase Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.mode === "calorie-lookup" && typeof body.food === "string") {
      return await calorieLookup(body.food, GROQ_API_KEY);
    }

    const { messages, module: mod = "nutrition" } = body;
    const system = SYSTEM_PROMPTS[mod as string] ?? SYSTEM_PROMPTS.nutrition;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API Error:", errorText);
      return new Response(JSON.stringify({ error: "Groq service error" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("vitalflow-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});