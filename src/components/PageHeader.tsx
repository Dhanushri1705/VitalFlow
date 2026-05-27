import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Home, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sticky global header shown on every authenticated page.
 * Provides Back + Home navigation so users never need to open the sidebar.
 */
export function PageHeader() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname === "/dashboard";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between gap-2 px-3 md:px-6 py-2">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={isDashboard}
            className="h-9 px-2.5"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Button
            variant={isDashboard ? "secondary" : "ghost"}
            size="sm"
            asChild
            className="h-9 px-2.5"
          >
            <Link to="/dashboard" aria-label="Go to dashboard">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </Button>
        </div>
        <Button variant="ghost" size="sm" asChild className="h-9 px-2.5" aria-label="Settings">
          <Link to="/settings">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
