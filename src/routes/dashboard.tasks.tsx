import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar, Flag, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/tasks")({ component: TasksPage });

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  due_at: string | null;
  created_at: string;
};

const PRIORITY_TONE: Record<Task["priority"], string> = {
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueAt, setDueAt] = useState("");
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");

  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,priority,status,due_at,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: title.trim(),
        priority,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDueAt("");
      setPriority("medium");
      qc.invalidateQueries({ queryKey: ["tasks", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Task["status"] }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", user?.id] }),
  });

  const filtered = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasksQuery.data, filter]);

  const counts = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  }, [tasksQuery.data]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          {counts.done} done · {counts.todo} to do · {counts.total} total
        </p>
      </div>

      {/* Add task */}
      <Card className="glass p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add a new task…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask.mutate();
            }}
            className="flex-1"
          />
          <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
            <SelectTrigger className="sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="sm:w-48"
          />
          <Button onClick={() => addTask.mutate()} disabled={addTask.isPending}>
            {addTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Add</span>
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "todo", "in_progress", "done"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "in_progress" ? "In progress" : f === "todo" ? "To do" : "Done"}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {tasksQuery.isLoading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {filtered.length === 0 && !tasksQuery.isLoading && (
          <Card className="glass p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No tasks here. Add one above.
          </Card>
        )}
        {filtered.map((t) => {
          const overdue = t.due_at && t.status !== "done" && new Date(t.due_at) < new Date();
          return (
            <Card key={t.id} className={cn("glass p-3 flex items-center gap-3 group transition", t.status === "done" && "opacity-60")}>
              <Checkbox
                checked={t.status === "done"}
                onCheckedChange={(v) =>
                  updateStatus.mutate({ id: t.id, status: v ? "done" : "todo" })
                }
              />
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium truncate", t.status === "done" && "line-through")}>
                  {t.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <Badge variant="outline" className={cn("h-5 gap-1", PRIORITY_TONE[t.priority])}>
                    <Flag className="h-3 w-3" /> {t.priority}
                  </Badge>
                  {t.due_at && (
                    <span className={cn("flex items-center gap-1", overdue && "text-destructive")}>
                      <Calendar className="h-3 w-3" />
                      {new Date(t.due_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
              {t.status !== "done" && (
                <Select
                  value={t.status}
                  onValueChange={(v) => updateStatus.mutate({ id: t.id, status: v as Task["status"] })}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To do</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => deleteTask.mutate(t.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// silence unused import warning
void Textarea;
