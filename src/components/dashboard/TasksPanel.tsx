import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trash2, Check, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string; title: string; description: string | null;
  priority: "low" | "medium" | "high"; status: "todo" | "in_progress" | "done";
  due_at: string | null; created_at: string; ai_generated: boolean;
};

export function TasksPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => apiJson<{ tasks: Task[] }>("/api/tasks") });

  const create = useMutation({
    mutationFn: (input: { title: string; priority: string }) =>
      apiJson("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setTitle(""); toast.success("Task added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      apiJson(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const suggest = useMutation({
    mutationFn: () => apiJson<{ suggestions: { title: string; priority: string; description?: string }[] }>(
      "/api/ai/suggest-tasks", { method: "POST", body: JSON.stringify({}) }
    ),
    onSuccess: async (data) => {
      for (const s of data.suggestions) {
        await apiJson("/api/tasks", {
          method: "POST",
          body: JSON.stringify({ title: s.title, description: s.description, priority: s.priority, ai_generated: true }),
        });
      }
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Added ${data.suggestions.length} AI-suggested tasks`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">Plan, prioritize, complete.</p>
        </div>
        <Button onClick={() => suggest.mutate()} disabled={suggest.isPending} variant="outline">
          {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Suggest tasks
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate({ title: title.trim(), priority }); }}
          >
            <Input placeholder="New task title…" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={priority} onValueChange={(v: "low" | "medium" | "high") => setPriority(v)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={create.isPending}>Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your tasks</CardTitle></CardHeader>
        <CardContent>
          {tasks.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {tasks.data?.tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
          <ul className="space-y-2">
            {tasks.data?.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <button
                  onClick={() => update.mutate({ id: t.id, patch: { status: t.status === "done" ? "todo" : "done" } })}
                  className="text-muted-foreground hover:text-primary"
                >
                  {t.status === "done" ? <Check className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                  {t.description && <div className="text-sm text-muted-foreground truncate">{t.description}</div>}
                </div>
                <Badge variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "default" : "secondary"}>{t.priority}</Badge>
                {t.ai_generated && <Badge variant="outline"><Sparkles className="h-3 w-3 mr-1" />AI</Badge>}
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
