import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { FocusTimer } from "@/components/FocusTimer";
import { TodoList } from "@/components/TodoList";
import { ModuleChecklist } from "@/components/ModuleChecklist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/habits")({
  component: () => <AppShell><HabitsPage /></AppShell>,
  validateSearch: (s) => ({ tab: (s.tab as string) || "tasks" }),
});

function HabitsPage() {
  const { tab } = Route.useSearch();

  const tabConfig = {
    tasks: {
      moduleKey: "habit" as const,
      title: "Today's Habits",
      aiTitle: "Habit AI Coach",
      starterQuestions: ["Suggest 3 micro-habits I can do today", "How do I stay consistent?", "Build a morning routine for me"],
    },
    water: {
      moduleKey: "water" as const,
      title: "Water Checklist",
      aiTitle: "Water Habits Coach",
      starterQuestions: ["How much water should I drink?", "Tips to remember drinking water", "Best water reminder schedule"],
    },
    exercise: {
      moduleKey: "exercise" as const,
      title: "Exercise Checklist",
      aiTitle: "Exercise Coach",
      starterQuestions: ["15-min beginner workout at home", "Best exercise for stress relief", "How to start running?"],
    },
    routine: {
      moduleKey: "routine" as const,
      title: "Daily Routine Checklist",
      aiTitle: "Daily Routine Coach",
      starterQuestions: ["Build me an evening wind-down routine", "Productive morning rituals", "Sleep hygiene tips"],
    },
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-gradient-health flex items-center justify-center">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Habit Tracker</h1>
          <p className="text-sm text-muted-foreground">Task-first daily habits with optional AI coaching</p>
        </div>
      </div>

      <Tabs defaultValue={tab} key={tab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 max-w-4xl">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="todo">To-Do</TabsTrigger>
          <TabsTrigger value="focus">Focus Timer</TabsTrigger>
          <TabsTrigger value="water">Water</TabsTrigger>
          <TabsTrigger value="exercise">Exercise</TabsTrigger>
          <TabsTrigger value="routine">Routine</TabsTrigger>
        </TabsList>

        <TabsContent value="todo"><TodoList /></TabsContent>
        <TabsContent value="focus"><FocusTimer /></TabsContent>

        {(["tasks", "water", "exercise", "routine"] as const).map((k) => (
          <TabsContent key={k} value={k}>
            <ModuleChecklist
              aiModule="habit"
              moduleKey={tabConfig[k].moduleKey}
              title={tabConfig[k].title}
              aiTitle={tabConfig[k].aiTitle}
              starterQuestions={tabConfig[k].starterQuestions}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
