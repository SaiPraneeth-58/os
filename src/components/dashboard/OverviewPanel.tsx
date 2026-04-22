import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, CheckSquare, Calendar as CalIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";

type TabId = "overview" | "tasks" | "notes" | "calendar" | "chat";

export function OverviewPanel({ onNavigate }: { onNavigate: (t: TabId) => void }) {
  const briefing = useQuery({
    queryKey: ["briefing"],
    queryFn: () => apiJson<{ briefing: string; tasksCount: number; eventsCount: number }>("/api/ai/briefing"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Good day.</h1>
        <p className="text-muted-foreground mt-1">Here's your daily briefing from Jarvis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Daily briefing</CardTitle>
        </CardHeader>
        <CardContent>
          {briefing.isLoading && <p className="text-sm text-muted-foreground">Asking Jarvis…</p>}
          {briefing.isError && <p className="text-sm text-destructive">Failed to load briefing.</p>}
          {briefing.data && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{briefing.data.briefing}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onNavigate("tasks")}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CheckSquare className="h-4 w-4 text-primary" /> Open tasks</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{briefing.data?.tasksCount ?? "—"}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onNavigate("calendar")}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalIcon className="h-4 w-4 text-primary" /> Events today</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{briefing.data?.eventsCount ?? "—"}</div></CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onNavigate("chat")}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4 text-primary" /> Talk to Jarvis</CardTitle></CardHeader>
          <CardContent><Button variant="outline" size="sm">Open chat</Button></CardContent>
        </Card>
      </div>
    </div>
  );
}
