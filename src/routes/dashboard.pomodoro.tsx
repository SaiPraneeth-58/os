import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, SkipForward, Timer as TimerIcon, Coffee, Trees } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/pomodoro")({ component: PomodoroPage });

type Kind = "focus" | "short_break" | "long_break";

const KIND_META: Record<Kind, { label: string; icon: typeof TimerIcon; tone: string }> = {
  focus: { label: "Focus", icon: TimerIcon, tone: "text-primary" },
  short_break: { label: "Short break", icon: Coffee, tone: "text-emerald-500" },
  long_break: { label: "Long break", icon: Trees, tone: "text-sky-500" },
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PomodoroPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [focusMin, setFocusMin] = useState(25);
  const [shortMin, setShortMin] = useState(5);
  const [longMin, setLongMin] = useState(15);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<Kind>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(25 * 60);
  const startedAtRef = useRef<number | null>(null);

  const totalFor = (k: Kind) =>
    (k === "focus" ? focusMin : k === "short_break" ? shortMin : longMin) * 60;

  // Sync remaining on settings change while not running
  useEffect(() => {
    if (!running) setRemaining(totalFor(kind));
  }, [kind, focusMin, shortMin, longMin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          completeSession();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const sessionsQuery = useQuery({
    queryKey: ["pomodoro", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pomodoro_sessions")
        .select("id,kind,label,duration_seconds,started_at,ended_at")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const todayMinutes = useMemo(() => {
    const sessions = sessionsQuery.data ?? [];
    const today = new Date().toDateString();
    return Math.round(
      sessions
        .filter((s) => s.kind === "focus" && new Date(s.started_at).toDateString() === today)
        .reduce((sum, s) => sum + s.duration_seconds, 0) / 60,
    );
  }, [sessionsQuery.data]);

  const logSession = useMutation({
    mutationFn: async (payload: { kind: Kind; duration: number; started: Date; ended: Date }) => {
      if (!user) return;
      const { error } = await supabase.from("pomodoro_sessions").insert({
        user_id: user.id,
        kind: payload.kind,
        label: label.trim() || null,
        duration_seconds: payload.duration,
        started_at: payload.started.toISOString(),
        ended_at: payload.ended.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pomodoro", user?.id] }),
  });

  function start() {
    if (running) return;
    startedAtRef.current = Date.now() - (totalFor(kind) - remaining) * 1000;
    setRunning(true);
  }
  function pause() {
    setRunning(false);
  }
  function reset() {
    setRunning(false);
    setRemaining(totalFor(kind));
    startedAtRef.current = null;
  }
  function skip() {
    completeSession();
  }
  function completeSession() {
    setRunning(false);
    const total = totalFor(kind);
    const elapsed = total - remaining || total;
    const ended = new Date();
    const started = new Date(startedAtRef.current ?? ended.getTime() - elapsed * 1000);
    logSession.mutate({ kind, duration: elapsed, started, ended });
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(
        kind === "focus" ? "Focus session complete. Take a break." : "Break over. Back to it.",
      );
      window.speechSynthesis.speak(u);
    }
    toast.success(`${KIND_META[kind].label} complete!`);
    setRemaining(totalFor(kind));
    startedAtRef.current = null;
  }

  const total = totalFor(kind);
  const progress = total === 0 ? 0 : ((total - remaining) / total) * 100;
  const KindIcon = KIND_META[kind].icon;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pomodoro</h1>
        <p className="text-sm text-muted-foreground">{todayMinutes} min focused today</p>
      </div>

      {/* Kind switcher */}
      <div className="flex gap-2">
        {(["focus", "short_break", "long_break"] as const).map((k) => {
          const Icon = KIND_META[k].icon;
          return (
            <Button
              key={k}
              size="sm"
              variant={kind === k ? "default" : "outline"}
              onClick={() => { setKind(k); setRunning(false); setRemaining(totalFor(k)); }}
              className="gap-2"
            >
              <Icon className="h-4 w-4" /> {KIND_META[k].label}
            </Button>
          );
        })}
      </div>

      {/* Timer */}
      <Card className="glass p-8 sm:p-12 flex flex-col items-center gap-6">
        <KindIcon className={cn("h-7 w-7", KIND_META[kind].tone)} />
        <div className="relative">
          <svg width="220" height="220" viewBox="0 0 220 220" className="-rotate-90">
            <circle cx="110" cy="110" r="100" stroke="currentColor" strokeWidth="6" className="text-muted/40" fill="none" />
            <circle
              cx="110" cy="110" r="100" stroke="currentColor" strokeWidth="6" fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 100}
              strokeDashoffset={2 * Math.PI * 100 * (1 - progress / 100)}
              className="text-primary transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl sm:text-6xl font-mono font-semibold tabular-nums tracking-tight">
              {fmt(remaining)}
            </span>
          </div>
        </div>

        <Input
          placeholder="What are you working on?"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="max-w-xs text-center"
        />

        <div className="flex items-center gap-2">
          {running ? (
            <Button size="lg" onClick={pause} className="gap-2"><Pause className="h-4 w-4" /> Pause</Button>
          ) : (
            <Button size="lg" onClick={start} className="gap-2"><Play className="h-4 w-4" /> Start</Button>
          )}
          <Button size="lg" variant="outline" onClick={reset} aria-label="Reset"><RotateCcw className="h-4 w-4" /></Button>
          <Button size="lg" variant="outline" onClick={skip} aria-label="Skip"><SkipForward className="h-4 w-4" /></Button>
        </div>
      </Card>

      {/* Settings */}
      <Card className="glass p-5 space-y-4">
        <h2 className="text-sm font-semibold">Durations</h2>
        {[
          { label: "Focus", val: focusMin, set: setFocusMin, min: 5, max: 90 },
          { label: "Short break", val: shortMin, set: setShortMin, min: 1, max: 30 },
          { label: "Long break", val: longMin, set: setLongMin, min: 5, max: 60 },
        ].map((s) => (
          <div key={s.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{s.label}</span>
              <span className="font-mono text-muted-foreground">{s.val} min</span>
            </div>
            <Slider min={s.min} max={s.max} step={1} value={[s.val]} onValueChange={(v) => s.set(v[0])} />
          </div>
        ))}
      </Card>

      {/* Recent sessions */}
      <Card className="glass p-5">
        <h2 className="text-sm font-semibold mb-3">Recent sessions</h2>
        {sessionsQuery.data?.length === 0 && (
          <p className="text-xs text-muted-foreground">No sessions yet — finish one to see it here.</p>
        )}
        <ul className="space-y-1.5">
          {sessionsQuery.data?.slice(0, 8).map((s) => {
            const Icon = KIND_META[s.kind as Kind].icon;
            return (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <Icon className={cn("h-3.5 w-3.5", KIND_META[s.kind as Kind].tone)} />
                <span className="flex-1 truncate">{s.label || KIND_META[s.kind as Kind].label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(s.duration_seconds / 60)} min
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
