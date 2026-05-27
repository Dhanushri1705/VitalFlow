import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Bookmark, CalendarPlus, Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Msg = { role: "user" | "assistant"; content: string };

export function AIAssistant({
  module: mod,
  title,
  starterQuestions,
}: {
  module: string;
  title: string;
  starterQuestions: string[];
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/health-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, module: mod }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("AI rate limit. Try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in workspace.");
        else toast.error(err.error || "AI error");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  const saveRecommendation = async (text: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ai_recommendations")
      .insert({ user_id: user.id, module_type: mod, recommendation_text: text, saved: true })
      .select()
      .single();
    if (error) toast.error("Could not save");
    else toast.success("Saved to your recommendations");
    return data;
  };

  const scheduleRecommendation = async (text: string) => {
    if (!user) return;
    const rec = await saveRecommendation(text);
    if (!rec) return;
    const { parseDurationDays, shortTitle } = await import("@/lib/recurring");
    const title = shortTitle(text);
    const days = parseDurationDays(text);

    if (days && days > 1) {
      // Recurring multi-day plan: create plan + N daily_tasks
      const { data: plan } = await supabase
        .from("recurring_plans")
        .insert({
          user_id: user.id,
          recommendation_id: rec.id,
          title,
          category: mod,
          duration_days: days,
        })
        .select("id")
        .single();
      if (plan) {
        const start = new Date();
        const rows = Array.from({ length: days }, (_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          return {
            user_id: user.id,
            recurring_plan_id: plan.id,
            recommendation_id: rec.id,
            title: `${title} (Day ${i + 1}/${days})`,
            category: mod,
            task_date: d.toISOString().slice(0, 10),
            plan_day: i + 1,
          };
        });
        await supabase.from("daily_tasks").insert(rows);
        toast.success(`📅 ${days}-day plan added to your checklist`);
        return;
      }
    }

    // One-off task + reminder for today
    const today = new Date().toISOString().slice(0, 10);
    const [{ error: remErr }, { error: taskErr }] = await Promise.all([
      supabase.from("scheduled_reminders").insert({
        user_id: user.id,
        recommendation_id: rec.id,
        reminder_text: title,
      }),
      supabase.from("daily_tasks").insert({
        user_id: user.id,
        recommendation_id: rec.id,
        title,
        category: mod,
        task_date: today,
      }),
    ]);
    if (remErr || taskErr) toast.error("Could not schedule");
    else toast.success("Added to today's schedule & checklist");
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-card shadow-soft overflow-hidden flex flex-col h-[600px]">
      <div className="px-5 py-4 border-b border-border bg-gradient-health text-white flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-white/80">Powered by Lovable AI</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try asking:</p>
            <div className="grid gap-2">
              {starterQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm"
                  : "max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm space-y-3"
              }
            >
              {m.role === "assistant" ? (
                <>
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                  {m.content && !loading && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveRecommendation(m.content)}
                      >
                        <Bookmark className="h-3.5 w-3.5 mr-1.5" /> Save
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => scheduleRecommendation(m.content)}
                        className="bg-gradient-health"
                      >
                        <CalendarPlus className="h-3.5 w-3.5 mr-1.5" /> Add to Schedule
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the AI coach…"
            rows={1}
            className="resize-none min-h-[44px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 bg-gradient-health">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AIAssistantTrigger(props: Parameters<typeof AIAssistant>[0]) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-gradient-health shadow-glow">
        <Sparkles className="h-4 w-4 mr-2" /> Ask AI Coach
      </Button>
    );
  }
  return (
    <div className="relative">
      <Button
        size="icon"
        variant="outline"
        className="absolute -top-2 -right-2 z-10 h-7 w-7 rounded-full"
        onClick={() => setOpen(false)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <AIAssistant {...props} />
    </div>
  );
}
