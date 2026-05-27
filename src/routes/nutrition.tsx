import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Apple } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DietPlanner } from "@/components/DietPlanner";
import { ModuleChecklist } from "@/components/ModuleChecklist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/nutrition")({
  component: () => <AppShell><NutritionPage /></AppShell>,
  validateSearch: (s) => ({ tab: (s.tab as string) || "intake" }),
});

function NutritionPage() {
  const { tab } = Route.useSearch();
  const [feedback, setFeedback] = useState("");

  const submitFeedback = async () => {
    if (!feedback.trim()) return;
    toast.success("Thanks for your feedback! 🙌");
    setFeedback("");
  };

  const tabConfig = {
    intake: {
      moduleKey: "nutrition" as const,
      title: "Today's Nutrition Checklist",
      aiTitle: "Daily Nutrition AI Coach",
      starterQuestions: ["What should I eat today for sustained energy?", "Suggest a 1500 kcal meal plan", "Best foods to boost iron"],
    },
    hair: {
      moduleKey: "hair" as const,
      title: "Hair Care Checklist",
      aiTitle: "Hair Care Nutrition Coach",
      starterQuestions: ["What nutrients prevent hair fall?", "Foods for healthier scalp", "Vegetarian sources of biotin"],
    },
    skin: {
      moduleKey: "skin" as const,
      title: "Skin Care Checklist",
      aiTitle: "Skin Care Nutrition Coach",
      starterQuestions: ["What foods reduce acne?", "Best foods for glowing skin", "Anti-aging nutrition tips"],
    },
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-gradient-health flex items-center justify-center">
          <Apple className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Nutrition Monitoring</h1>
          <p className="text-sm text-muted-foreground">Task-first checklists with optional AI guidance</p>
        </div>
      </div>

      <Tabs defaultValue={tab} key={tab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-5 max-w-3xl">
          <TabsTrigger value="intake">Daily Intake</TabsTrigger>
          <TabsTrigger value="diet">Diet Planner</TabsTrigger>
          <TabsTrigger value="hair">Hair Care</TabsTrigger>
          <TabsTrigger value="skin">Skin Care</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="diet"><DietPlanner /></TabsContent>

        {(["intake", "hair", "skin"] as const).map((k) => (
          <TabsContent key={k} value={k}>
            <ModuleChecklist
              aiModule="nutrition"
              moduleKey={tabConfig[k].moduleKey}
              title={tabConfig[k].title}
              aiTitle={tabConfig[k].aiTitle}
              starterQuestions={tabConfig[k].starterQuestions}
            />
          </TabsContent>
        ))}

        <TabsContent value="feedback">
          <div className="max-w-xl rounded-2xl bg-card border border-border p-6 shadow-soft">
            <h3 className="font-semibold mb-2">Share your feedback</h3>
            <p className="text-sm text-muted-foreground mb-4">Help us improve the nutrition module.</p>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} placeholder="Tell us what's working or what could be better…" />
            <Button onClick={submitFeedback} className="mt-3 bg-gradient-health">Send feedback</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
