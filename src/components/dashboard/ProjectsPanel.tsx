import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Project = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export function ProjectsPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({});

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiJson<{ projects: Project[] }>("/api/projects"),
  });

  const create = useMutation({
    mutationFn: (input: { title: string; description: string }) =>
      apiJson("/api/projects", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add project"),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiJson("/api/projects", { method: "DELETE", body: JSON.stringify({ id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  async function summarize(p: Project) {
    if (!p.description?.trim()) {
      toast.message("Add a description first.");
      return;
    }
    setAiBusy((s) => ({ ...s, [p.id]: true }));
    try {
      const { result } = await apiJson<{ result: string }>("/api/ai", {
        method: "POST",
        body: JSON.stringify({ action: "summarize", text: p.description }),
      });
      setAiResults((s) => ({ ...s, [p.id]: result }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setAiBusy((s) => ({ ...s, [p.id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground mt-1">Manage your projects and let Jarvis summarize them.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> New project
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button
            onClick={() => create.mutate({ title, description })}
            disabled={!title.trim() || create.isPending}
          >
            {create.isPending ? "Adding…" : "Add project"}
          </Button>
        </CardContent>
      </Card>

      {projects.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {projects.isError && <p className="text-sm text-destructive">Failed to load projects.</p>}

      <div className="grid md:grid-cols-2 gap-4">
        {projects.data?.projects.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(p.id)}
                  aria-label="Delete project"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 flex-1">
              {p.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.description}</p>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => summarize(p)}
                disabled={aiBusy[p.id]}
              >
                {aiBusy[p.id] ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Summarizing…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Summarize with Jarvis</>
                )}
              </Button>

              {aiResults[p.id] && (
                <div className="rounded-md border border-border bg-accent/40 p-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Jarvis
                  </div>
                  {aiResults[p.id]}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {projects.data && projects.data.projects.length === 0 && (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        )}
      </div>
    </div>
  );
}
