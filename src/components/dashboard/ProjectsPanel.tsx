import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Check, Loader2, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({});

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiJson<{ projects: Project[] }>("/api/projects"),
  });

  const create = useMutation({
    mutationFn: (input: { title: string; description: string }) =>
      apiJson<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      const prev = qc.getQueryData<{ projects: Project[] }>(["projects"]);
      const optimistic: Project = {
        id: `temp-${Date.now()}`,
        title: input.title,
        description: input.description || null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<{ projects: Project[] }>(["projects"], {
        projects: [optimistic, ...(prev?.projects ?? [])],
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["projects"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Failed to add project");
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; title: string; description: string }) =>
      apiJson<{ project: Project }>("/api/projects", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      const prev = qc.getQueryData<{ projects: Project[] }>(["projects"]);
      qc.setQueryData<{ projects: Project[] }>(["projects"], {
        projects: (prev?.projects ?? []).map((p) =>
          p.id === input.id
            ? { ...p, title: input.title, description: input.description }
            : p,
        ),
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["projects"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Failed to update");
    },
    onSuccess: () => setEditingId(null),
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiJson("/api/projects", { method: "DELETE", body: JSON.stringify({ id }) }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      const prev = qc.getQueryData<{ projects: Project[] }>(["projects"]);
      qc.setQueryData<{ projects: Project[] }>(["projects"], {
        projects: (prev?.projects ?? []).filter((p) => p.id !== id),
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["projects"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  function startEdit(p: Project) {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDesc(p.description ?? "");
  }

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

  const list = projects.data?.projects ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Add Project */}
      <aside className="lg:sticky lg:top-20 self-start">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Plus className="h-4 w-4 text-primary" /> Add project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              size="sm"
              className="w-full"
              onClick={() => create.mutate({ title, description })}
              disabled={!title.trim() || create.isPending}
            >
              {create.isPending ? "Adding…" : "Add"}
            </Button>
          </CardContent>
        </Card>
      </aside>

      {/* Grid */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <span className="text-xs text-muted-foreground">{list.length} total</span>
        </div>

        {projects.isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {projects.isError && (
          <p className="text-sm text-destructive">Failed to load projects.</p>
        )}

        {projects.data && list.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No projects yet — add your first one on the left.
            </CardContent>
          </Card>
        )}

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => {
            const editing = editingId === p.id;
            return (
              <Card key={p.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  {editing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-8 text-sm font-semibold"
                    />
                  ) : (
                    <CardTitle className="text-sm font-bold leading-snug">
                      {p.title}
                    </CardTitle>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 flex-1 pt-0">
                  {editing ? (
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  ) : (
                    p.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {p.description}
                      </p>
                    )
                  )}

                  <div className="flex items-center gap-1">
                    {editing ? (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            update.mutate({
                              id: p.id,
                              title: editTitle,
                              description: editDesc,
                            })
                          }
                          disabled={!editTitle.trim() || update.isPending}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs flex-1"
                          onClick={() => summarize(p)}
                          disabled={aiBusy[p.id]}
                        >
                          {aiBusy[p.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1" /> AI
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground"
                          onClick={() => startEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => remove.mutate(p.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {aiResults[p.id] && !editing && (
                    <div className="rounded-md border border-border bg-accent/40 p-2.5 text-xs leading-relaxed">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        <Brain className="h-3 w-3 text-primary" /> Jarvis
                      </div>
                      {aiResults[p.id]}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
