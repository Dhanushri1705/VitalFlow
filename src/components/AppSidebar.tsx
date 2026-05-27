import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Apple,
  Activity,
  Wallet,
  Moon,
  Droplet,
  Flame,
  ChevronDown,
  Heart,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { to: string; label: string }[];
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Main",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      {
        label: "Nutrition",
        icon: Apple,
        children: [
          { to: "/nutrition", label: "Daily Intake & AI" },
          { to: "/nutrition?tab=diet", label: "Diet Planner" },
          { to: "/nutrition?tab=hair", label: "Hair Care" },
          { to: "/nutrition?tab=skin", label: "Skin Care" },
          { to: "/nutrition?tab=feedback", label: "Feedback" },
        ],
      },
      {
        label: "Habit Tracker",
        icon: Activity,
        children: [
          { to: "/habits", label: "Tasks & AI" },
          { to: "/habits?tab=todo", label: "To-Do List" },
          { to: "/habits?tab=focus", label: "Focus Timer" },
          { to: "/habits?tab=water", label: "Water Habits" },
          { to: "/habits?tab=exercise", label: "Exercise" },
          { to: "/habits?tab=routine", label: "Daily Routine" },
        ],
      },
      { to: "/expenses", label: "Expense Tracker", icon: Wallet },
    ],
  },
  {
    section: "Tracking",
    items: [
      { to: "/tracking/sleep", label: "Sleep", icon: Moon },
      { to: "/tracking/water", label: "Water", icon: Droplet },
    ],
  },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const router = useRouterState();
  const path = router.location.pathname;
  const [open, setOpen] = useState<Record<string, boolean>>({
    Nutrition: path.startsWith("/nutrition"),
    "Habit Tracker": path.startsWith("/habits"),
  });

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-health shadow-soft">
            <Heart className="h-5 w-5 text-white" fill="white" />
          </div>
          <div>
            <div className="font-bold tracking-tight">VitalFlow</div>
            <div className="text-[11px] text-muted-foreground">Smart Health Companion</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV.map((sec) => (
          <div key={sec.section}>
            <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {sec.section}
            </div>
            <ul className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                if (item.children) {
                  const isOpen = open[item.label];
                  return (
                    <li key={item.label}>
                      <button
                        onClick={() => setOpen((s) => ({ ...s, [item.label]: !isOpen }))}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-colors"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                        />
                      </button>
                      {isOpen && (
                        <ul className="mt-1 ml-7 space-y-0.5 border-l border-sidebar-border pl-3">
                          {item.children.map((c) => (
                            <li key={c.label}>
                              <Link
                                to={c.to.split("?")[0]}
                                search={Object.fromEntries(
                                  new URLSearchParams(c.to.split("?")[1] ?? ""),
                                )}
                                onClick={onNavigate}
                                className="block px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                              >
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                }
                const active = path === item.to;
                return (
                  <li key={item.label}>
                    <Link
                      to={item.to!}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        active
                          ? "bg-gradient-health text-white shadow-soft"
                          : "hover:bg-sidebar-accent",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-sidebar-accent/40">
          <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm">
            {(profile?.full_name || profile?.username || "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {profile?.full_name || profile?.username || "User"}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span>💎 {profile?.gems ?? 0}</span>
              <span>🔥 {profile?.current_streak ?? 0}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/settings" onClick={onNavigate} className="flex-1">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
