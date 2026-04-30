import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FolderKanban, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/projects")({ component: ProjectsPage });

type Project = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  updated_at: string;
};

function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,description,progress,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!title.trim()) throw new Error("Title required");
      const { error } = await supabase
        .from("projects")
        .insert({ user_id: user.id, title: title.trim(), description: description.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project created");
      setTitle("");
      setDescription("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const { error } = await supabase
        .from("projects")
        .update({ progress, progress_overridden: true, last_progress_change_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Track long-running work and progress.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> New project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this about?" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading projects…
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No projects yet. Create one to get started.
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{p.title}</h3>
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{p.progress}%</span>
              </div>
              <Progress value={p.progress} />
              <input
                type="range"
                min={0}
                max={100}
                value={p.progress}
                onChange={(e) => updateProgress.mutate({ id: p.id, progress: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
