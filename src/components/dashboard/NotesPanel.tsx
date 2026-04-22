import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Note = { id: string; title: string; content: string; summary: string | null; updated_at: string };

export function NotesPanel() {
  const qc = useQueryClient();
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => apiJson<{ notes: Note[] }>("/api/notes") });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", content: "" });

  const active = notes.data?.notes.find((n) => n.id === activeId) ?? null;

  const create = useMutation({
    mutationFn: () => apiJson<{ note: Note }>("/api/notes", { method: "POST", body: JSON.stringify({ title: "Untitled", content: "" }) }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["notes"] }); setActiveId(d.note.id); setDraft({ title: d.note.title, content: d.note.content }); },
  });

  const save = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Note> }) =>
      apiJson(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast.success("Saved"); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); setActiveId(null); },
  });

  const summarize = useMutation({
    mutationFn: (id: string) => apiJson("/api/ai/summarize-note", { method: "POST", body: JSON.stringify({ noteId: id }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); toast.success("Summary generated"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "AI failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Notes</h1><p className="text-muted-foreground mt-1">Markdown-friendly notes with AI summaries.</p></div>
        <Button onClick={() => create.mutate()}>New note</Button>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">All notes</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {notes.data?.notes.map((n) => (
              <button key={n.id}
                onClick={() => { setActiveId(n.id); setDraft({ title: n.title, content: n.content }); }}
                className={`w-full text-left rounded-md p-2 text-sm ${activeId === n.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                <div className="font-medium truncate">{n.title}</div>
                {n.summary && <div className="text-xs text-muted-foreground line-clamp-2">{n.summary}</div>}
              </button>
            ))}
            {notes.data?.notes.length === 0 && <p className="text-sm text-muted-foreground p-2">No notes yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {!active && <p className="text-sm text-muted-foreground">Select or create a note.</p>}
            {active && (
              <div className="space-y-3">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="text-lg font-semibold" />
                <Textarea value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} rows={14} placeholder="Write in markdown…" />
                {active.summary && (
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI summary</div>
                    {active.summary}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => save.mutate({ id: active.id, patch: draft })} disabled={save.isPending}>Save</Button>
                  <Button variant="outline" onClick={() => summarize.mutate(active.id)} disabled={summarize.isPending}>
                    {summarize.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    Summarize
                  </Button>
                  <Button variant="ghost" className="ml-auto text-destructive" onClick={() => remove.mutate(active.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
