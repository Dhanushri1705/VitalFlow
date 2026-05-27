import { useEffect, useRef, useState } from "react";
import { Timer, Square, Maximize2, Minimize2, ExternalLink, Bell } from "lucide-react";
import { useFocusTimer, formatDuration, formatHuman } from "@/contexts/FocusTimerContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Document Picture-in-Picture API (Chromium 116+) — provides a true OS-level
// always-on-top window that survives tab/app switches. Falls back to an in-app
// floating bar elsewhere; on browsers without PiP we also offer a persistent
// notification fallback so users still see elapsed time outside the tab.
type DocPiPWindow = Window & { document: Document };
interface DocPiPApi {
  requestWindow: (opts?: { width?: number; height?: number }) => Promise<DocPiPWindow>;
}
function getDocPiP(): DocPiPApi | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.documentPictureInPicture ?? null;
}

export function FocusTimerBar() {
  const { active, elapsed, stop } = useFocusTimer();
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => ({ x: 16, y: 16 })); // bottom-right offset
  const [drag, setDrag] = useState<{ ox: number; oy: number } | null>(null);
  const pipWinRef = useRef<DocPiPWindow | null>(null);
  const pipRootRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<Notification | null>(null);
  const notifTimerRef = useRef<number | null>(null);

  // ---------- Drag (pointer events) ----------
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      setPos({
        x: Math.max(8, window.innerWidth - e.clientX - drag.ox),
        y: Math.max(8, window.innerHeight - e.clientY - drag.oy),
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  // ---------- Picture-in-Picture window ----------
  const openPiP = async () => {
    const api = getDocPiP();
    if (!api) {
      toast.message("Picture-in-Picture not supported here. Trying notification…");
      enableNotificationFallback();
      return;
    }
    try {
      const pipWin = await api.requestWindow({ width: 280, height: 140 });
      pipWinRef.current = pipWin;
      // Copy stylesheets so Tailwind/colors render inside the PiP window
      [...document.styleSheets].forEach((sheet) => {
        try {
          const rules = [...(sheet.cssRules ?? [])].map((r) => r.cssText).join("");
          const style = pipWin.document.createElement("style");
          style.textContent = rules;
          pipWin.document.head.appendChild(style);
        } catch {
          // cross-origin stylesheet (e.g. fonts) — link instead
          if (sheet.href) {
            const link = pipWin.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            pipWin.document.head.appendChild(link);
          }
        }
      });
      pipWin.document.body.style.margin = "0";
      pipWin.document.body.style.background = "transparent";
      const root = pipWin.document.createElement("div");
      pipWin.document.body.appendChild(root);
      pipRootRef.current = root;
      pipWin.addEventListener("pagehide", () => {
        pipWinRef.current = null;
        pipRootRef.current = null;
      });
    } catch (err) {
      console.warn("PiP open failed", err);
      toast.error("Could not open floating window");
    }
  };

  const closePiP = () => {
    pipWinRef.current?.close();
    pipWinRef.current = null;
    pipRootRef.current = null;
  };

  // Render PiP contents whenever elapsed updates
  useEffect(() => {
    const root = pipRootRef.current;
    if (!root || !active) return;
    const goal = active.goal_seconds ?? 0;
    const progress = goal > 0 ? Math.min(100, Math.round((elapsed / goal) * 100)) : 0;
    root.innerHTML = `
      <div style="font-family:system-ui,-apple-system,sans-serif;color:#fff;background:linear-gradient(135deg,oklch(0.62 0.14 200),oklch(0.72 0.15 160));height:100vh;width:100vw;padding:14px 16px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="font-size:12px;opacity:.85;text-transform:capitalize;">${escapeHtml(active.habit_type)} in progress</div>
        <div style="font:700 28px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1px;">${formatDuration(elapsed)}</div>
        ${goal ? `<div style="height:4px;background:rgba(255,255,255,.25);border-radius:99px;overflow:hidden;"><div style="height:100%;width:${progress}%;background:#fff;transition:width .3s;"></div></div>` : ""}
        <button id="pip-stop" style="margin-top:6px;background:#fff;color:#0a3a4a;border:0;border-radius:10px;padding:8px;font-weight:600;cursor:pointer;">End session</button>
      </div>`;
    const btn = root.querySelector<HTMLButtonElement>("#pip-stop");
    if (btn) btn.onclick = handleStop;
  }, [elapsed, active]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Notification fallback ----------
  const enableNotificationFallback = async () => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") {
      toast.error("Notification permission denied");
      return;
    }
    showNotif();
    notifTimerRef.current = window.setInterval(showNotif, 30_000);
    toast.success("Persistent timer notification enabled");
  };

  const showNotif = () => {
    if (!active) return;
    try {
      notifRef.current?.close();
      notifRef.current = new Notification(`${active.habit_type} • ${formatDuration(elapsed)}`, {
        body: "Focus session in progress — tap to return",
        tag: "vitalflow-focus",
        silent: true,
        requireInteraction: true,
      });
      notifRef.current.onclick = () => {
        window.focus();
        notifRef.current?.close();
      };
    } catch {
      /* ignore */
    }
  };

  const stopNotifications = () => {
    if (notifTimerRef.current) clearInterval(notifTimerRef.current);
    notifTimerRef.current = null;
    notifRef.current?.close();
    notifRef.current = null;
  };

  // Cleanup on session end
  useEffect(() => {
    if (!active) {
      closePiP();
      stopNotifications();
    }
  }, [active]);

  const handleStop = async () => {
    const r = await stop();
    closePiP();
    stopNotifications();
    if (r) toast.success(`${r.habit_type} session completed — ${formatHuman(r.duration)}`);
  };

  if (!active) return null;
  const goal = active.goal_seconds ?? 0;
  const progress = goal > 0 ? Math.min(100, Math.round((elapsed / goal) * 100)) : 0;
  const pipSupported = !!getDocPiP();

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={{ right: pos.x, bottom: pos.y }}
        className="fixed z-50 rounded-full bg-gradient-hero text-white shadow-elegant h-12 w-12 flex items-center justify-center animate-pulse"
        title={`${active.habit_type} • ${formatDuration(elapsed)}`}
      >
        <Timer className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      style={{ right: pos.x, bottom: pos.y }}
      className="fixed z-50 rounded-2xl bg-gradient-hero text-white shadow-elegant px-3 py-2.5 min-w-[280px] animate-in slide-in-from-bottom-4 select-none"
    >
      <div
        className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          const rect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
          setDrag({ ox: rect.right - e.clientX, oy: rect.bottom - e.clientY });
        }}
      >
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <Timer className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-white/80 capitalize truncate leading-tight">{active.habit_type} in progress</div>
          <div className="font-mono font-bold text-base leading-tight">{formatDuration(elapsed)}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => setMinimized(true)} className="h-7 w-7 text-white hover:bg-white/15" title="Minimize">
          <Minimize2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="secondary" onClick={handleStop} className="h-7 w-7" title="End session">
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
      {goal > 0 && (
        <div className="h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex items-center gap-1 mt-2">
        {pipSupported ? (
          <Button size="sm" variant="ghost" onClick={openPiP} className="h-6 px-2 text-[11px] text-white hover:bg-white/15 gap-1">
            <ExternalLink className="h-3 w-3" /> Pop-out (always-on-top)
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={enableNotificationFallback} className="h-6 px-2 text-[11px] text-white hover:bg-white/15 gap-1">
            <Bell className="h-3 w-3" /> Notify across tabs
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setMinimized(true)} className="h-6 px-2 text-[11px] text-white hover:bg-white/15 gap-1">
          <Maximize2 className="h-3 w-3 rotate-45" /> Drag to move
        </Button>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
