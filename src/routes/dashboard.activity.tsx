import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Loader2, Activity as ActivityIcon } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard/activity")({ component: ActivityPage });

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ActivityPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["activity-heatmap", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceIso = since.toISOString();
      const [tasks, notes, chats, pomodoro] = await Promise.all([
        supabase.from("tasks").select("created_at").gte("created_at", sinceIso),
        supabase.from("notes").select("created_at").gte("created_at", sinceIso),
        supabase.from("chat_messages").select("created_at").gte("created_at", sinceIso),
        supabase.from("pomodoro_sessions").select("created_at,duration_seconds").gte("created_at", sinceIso),
      ]);
      return {
        tasks: tasks.data ?? [],
        notes: notes.data ?? [],
        chats: chats.data ?? [],
        pomodoro: pomodoro.data ?? [],
      };
    },
  });

  const { days, totals } = useMemo(() => {
    const buckets = new Map<string, number>();
    const today = startOfDay(new Date());
    const days: { date: Date; key: string; count: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, 0);
      days.push({ date: d, key, count: 0 });
    }
    const tally = (rows: { created_at: string }[] | undefined) => {
      rows?.forEach((r) => {
        const k = r.created_at.slice(0, 10);
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
      });
    };
    tally(data?.tasks);
    tally(data?.notes);
    tally(data?.chats);
    tally(data?.pomodoro);
    days.forEach((d) => (d.count = buckets.get(d.key) ?? 0));

    const focusMinutes = Math.round(
      (data?.pomodoro ?? []).reduce((s, p) => s + (p.duration_seconds ?? 0), 0) / 60,
    );

    return {
      days,
      totals: {
        tasks: data?.tasks.length ?? 0,
        notes: data?.notes.length ?? 0,
        chats: data?.chats.length ?? 0,
        focusMinutes,
      },
    };
  }, [data]);

  const max = Math.max(1, ...days.map((d) => d.count));

  function tone(count: number) {
    if (count === 0) return "bg-muted/40";
    const ratio = count / max;
    if (ratio < 0.25) return "bg-primary/20";
    if (ratio < 0.5) return "bg-primary/40";
    if (ratio < 0.75) return "bg-primary/70";
    return "bg-primary";
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">Your last 90 days at a glance.</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Tasks", value: totals.tasks },
          { label: "Notes", value: totals.notes },
          { label: "Chat msgs", value: totals.chats },
          { label: "Focus min", value: totals.focusMinutes },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Heatmap</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="h-3 w-3 rounded bg-muted/40" />
            <div className="h-3 w-3 rounded bg-primary/20" />
            <div className="h-3 w-3 rounded bg-primary/40" />
            <div className="h-3 w-3 rounded bg-primary/70" />
            <div className="h-3 w-3 rounded bg-primary" />
            <span>More</span>
          </div>
        </div>
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto">
          {days.map((d) => (
            <div
              key={d.key}
              className={`h-3.5 w-3.5 rounded-sm ${tone(d.count)} hover:ring-2 hover:ring-primary/40 transition`}
              title={`${d.key}: ${d.count} actions`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
