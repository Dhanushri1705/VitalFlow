import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Heart, Activity, Sparkles, Trophy, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 backdrop-blur bg-background/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-health flex items-center justify-center shadow-soft">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="font-bold text-lg">VitalFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth/login"><Button variant="ghost">Login</Button></Link>
            <Link to="/auth/signup"><Button className="bg-gradient-health">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" /> AI-Powered Health Companion
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Your <span className="text-gradient">smart wellness</span> dashboard, built for daily wins.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Track nutrition, habits, sleep & water. Get personalized AI recommendations.
          Build streaks, earn gems, and stay motivated every single day.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth/signup">
            <Button size="lg" className="bg-gradient-health shadow-glow">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth/login">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-5 text-left">
          {[
            { icon: Sparkles, title: "AI Coach Inside", desc: "Embedded nutrition & habit AI assistants in every module. Save and schedule recommendations." },
            { icon: Activity, title: "Track Everything", desc: "Water, sleep, exercise, nutrition, and expenses — all in one beautiful dashboard." },
            { icon: Trophy, title: "Streaks & Rewards", desc: "Hit 75% daily completion to grow your streak. Earn gems. Restore lost streaks." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft">
              <div className="h-11 w-11 rounded-xl bg-gradient-health flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <div className="font-semibold mb-1.5">{f.title}</div>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
