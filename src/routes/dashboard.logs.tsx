import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  StickyNote,
  Bookmark,
  Calendar,
  MessageSquare,
  Timer,
  FolderKanban,
  Loader2,
  ScrollText,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/logs")({ component: LogsPage });

type Activity = {
  id: string;
  kind: string;
  title: string;
  at: string;
  icon: typeof CheckSquare;
  tone: string;
};

const KIND_FILTERS = ["all", "tasks", "notes", "bookmarks", "events", "chats", "pomodoro", "projects"] as const;

function LogsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof KIND_FILTERS)[number]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["activity-log", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Activity[]> => {
      const [tasks, notes, bookmarks, events, chats, pomodoro, projects] = await Promise.all([
        supabase.from("tasks").select("id,title,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("notes").select("id,title,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("bookmarks").select("id,title,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("events").select("id,title,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("chat_threads").select("id,title,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("pomodoro_sessions").select("id,kind,label,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("projects").select("id,title,created_at").order("created_at", { ascending: false }).limit(20),
      ]);

      const items: Activity[] = [
        ...(tasks.data ?? []).map((t) => ({ id: `t-${t.id}`, kind: "tasks", title: `Task: ${t.title}`, at: t.created_at, icon: CheckSquare, tone: "text-emerald-500" })),
        ...(notes.data ?? []).map((n) => ({ id: `n-${n.id}`, kind: "notes", title: `Note: ${n.title}`, at: n.created_at, icon: StickyNote, tone: "text-amber-500" })),
        ...(bookmarks.data ?? []).map((b) => ({ id: `b-${b.id}`, kind: "bookmarks", title: `Bookmark: ${b.title}`, at: b.created_at, icon: Bookmark, tone: "text-sky-500" })),
        ...(events.data ?? []).map((e) => ({ id: `e-${e.id}`, kind: "events", title: `Event: ${e.title}`, at: e.created_at, icon: Calendar, tone: "text-violet-500" })),
        ...(chats.data ?? []).map((c) => ({ id: `c-${c.id}`, kind: "chats", title: `Chat: ${c.title}`, at: c.created_at, icon: MessageSquare, tone: "text-primary" })),
        ...(pomodoro.data ?? []).map((p) => ({ id: `p-${p.id}`, kind: "pomodoro", title: `Pomodoro ${p.kind}${p.label ? `: ${p.label}` : ""}`, at: p.created_at, icon: Timer, tone: "text-rose-500" })),
        ...(projects.data ?? []).map((pr) => ({ id: `pr-${pr.id}`, kind: "projects", title: `Project: ${pr.title}`, at: pr.created_at, icon: FolderKanban, tone: "text-indigo-500" })),
      ];
      return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    },
  });

  const filtered = (data ?? []).filter((a) => filter === "all" || a.kind === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity logs</h1>
        <p className="text-muted-foreground">Recent actions across all your modules.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {KIND_FILTERS.map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "outline"}
            onClick={() => setFilter(k)}
            className="capitalize"
          >
            {k}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No activity to show.
        </Card>
      )}

      <Card className="divide-y divide-border/60">
        {filtered.map((a) => {
          const Icon = a.icon;
          return (
            <div key={a.id} className="p-3 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-md bg-muted/50 flex items-center justify-center ${a.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString()}</p>
              </div>
              <Badge variant="secondary" className="capitalize">{a.kind}</Badge>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
