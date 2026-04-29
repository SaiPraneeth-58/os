import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Brain, Check, Loader2, Mail, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type Project = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  progress_overridden: boolean;
  daily_note: string | null;
  worked_on_date: string | null;
  created_at: string;
};

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60_000);
  return ist.toISOString().slice(0, 10);
}

export function ProjectsPanel() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiJson<{ projects: Project[] }>("/api/projects"),
  });

  const create = useMutation({
    mutationFn: (input: { title: string; description: string }) =>
      apiJson<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });

  const update = useMutation({
    mutationFn: (input: Record<string, unknown> & { id: string }) =>
      apiJson<{ project: Project }>("/api/projects", { method: "PUT", body: JSON.stringify(input) }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      const prev = qc.getQueryData<{ projects: Project[] }>(["projects"]);
      qc.setQueryData<{ projects: Project[] }>(["projects"], {
        projects: (prev?.projects ?? []).map((p) =>
          p.id === input.id ? { ...p, ...input } as Project : p,
        ),
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["projects"], ctx.prev);
      toast.error(e instanceof Error ? e.message : "Failed");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
    onSuccess: () => setEditingId(null),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiJson("/api/projects", { method: "DELETE", body: JSON.stringify({ id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
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
  const today = todayIST();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
      <aside className="lg:sticky lg:top-[4.5rem] self-start space-y-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Plus className="h-3.5 w-3.5 text-primary" /> New project
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
            />
            <Textarea
              placeholder="Description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm"
            />
            <Button
              size="sm"
              className="w-full h-8"
              onClick={() => create.mutate({ title, description })}
              disabled={!title.trim() || create.isPending}
            >
              {create.isPending ? "Adding…" : "Add project"}
            </Button>
          </CardContent>
        </Card>

        <EmailPrefsCard />
      </aside>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-0.5">
          <h1 className="text-base font-semibold tracking-tight">Projects</h1>
          <span className="text-[11px] text-muted-foreground tabular-nums">{list.length} total</span>
        </div>

        {projects.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {projects.isError && <p className="text-xs text-destructive">Failed to load.</p>}

        {projects.data && list.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-xs text-muted-foreground">
              No projects yet — add your first one on the left.
            </CardContent>
          </Card>
        )}

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((p) => {
            const editing = editingId === p.id;
            const workedToday = p.worked_on_date === today;
            const noteDraft = noteDrafts[p.id] ?? p.daily_note ?? "";

            return (
              <Card key={p.id} className="flex flex-col group">
                <CardHeader className="pb-1.5">
                  {editing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-7 text-sm font-semibold"
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-snug truncate">
                        {p.title}
                      </CardTitle>
                      <span className="shrink-0 text-[10px] font-medium tabular-nums text-primary">
                        {p.progress}%
                      </span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-2.5 flex-1 pt-0">
                  {editing ? (
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  ) : (
                    p.description && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    )
                  )}

                  {/* Progress bar */}
                  {!editing && (
                    <div className="space-y-1.5">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-primary transition-all"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <Slider
                        value={[p.progress]}
                        max={100}
                        step={5}
                        onValueChange={([v]) =>
                          update.mutate({ id: p.id, progress: v, progress_overridden: true })
                        }
                        className="py-0.5"
                      />
                    </div>
                  )}

                  {/* Worked today + daily note */}
                  {!editing && (
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Worked on today</span>
                        <Switch
                          checked={workedToday}
                          onCheckedChange={(v) => update.mutate({ id: p.id, worked_today: v })}
                        />
                      </label>
                      <Textarea
                        placeholder="What did you do today?"
                        rows={2}
                        value={noteDraft}
                        onChange={(e) => setNoteDrafts((s) => ({ ...s, [p.id]: e.target.value }))}
                        onBlur={() => {
                          if (noteDraft !== (p.daily_note ?? "")) {
                            update.mutate({ id: p.id, daily_note: noteDraft });
                          }
                        }}
                        className="text-[11px] leading-snug"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {editing ? (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            update.mutate({ id: p.id, title: editTitle, description: editDesc })
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
                              <Sparkles className="h-3.5 w-3.5 mr-1" /> Ask Jarvis
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => startEdit(p)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => remove.mutate(p.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {aiResults[p.id] && !editing && (
                    <div className="rounded-lg border border-border/60 bg-accent/40 p-2.5 text-xs leading-relaxed animate-fade-in">
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

function EmailPrefsCard() {
  const qc = useQueryClient();
  const prefs = useQuery({
    queryKey: ["email-prefs"],
    queryFn: () => apiJson<{ prefs: { manager_email: string; enabled: boolean } | null }>("/api/email-prefs"),
  });
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const value = touched ? email : prefs.data?.prefs?.manager_email ?? "";
  const enabled = prefs.data?.prefs?.enabled ?? true;

  const save = useMutation({
    mutationFn: (input: { manager_email: string; enabled?: boolean }) =>
      apiJson("/api/email-prefs", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: () => {
      setTouched(false);
      qc.invalidateQueries({ queryKey: ["email-prefs"] });
      toast.success("Saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Mail className="h-3.5 w-3.5 text-primary" /> Daily digest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <Input
          type="email"
          placeholder="manager@company.com"
          value={value}
          onChange={(e) => {
            setTouched(true);
            setEmail(e.target.value);
          }}
          className="h-8 text-sm"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Send 5:45 PM IST</span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) =>
              save.mutate({ manager_email: value || prefs.data?.prefs?.manager_email || "", enabled: v })
            }
            disabled={!value && !prefs.data?.prefs?.manager_email}
          />
        </div>
        {touched && (
          <Button
            size="sm"
            className="w-full h-8"
            onClick={() => save.mutate({ manager_email: value })}
            disabled={!value.includes("@") || save.isPending}
          >
            Save
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
