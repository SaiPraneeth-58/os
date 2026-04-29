import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/Markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Pin,
  PinOff,
  Sparkles,
  Loader2,
  StickyNote as NoteIcon,
  ChevronDown,
  Eye,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/notes")({ component: NotesPage });

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  updated_at: string;
};

function NotesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [search, setSearch] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const notesQuery = useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("id,title,content,tags,pinned,updated_at")
        .eq("user_id", user!.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });

  const filtered = useMemo(() => {
    const notes = notesQuery.data ?? [];
    const q = search.toLowerCase().trim();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [notesQuery.data, search]);

  const active = useMemo(
    () => notesQuery.data?.find((n) => n.id === activeId) ?? null,
    [notesQuery.data, activeId],
  );

  useEffect(() => {
    if (!activeId && filtered.length > 0) setActiveId(filtered[0].id);
  }, [filtered, activeId]);

  useEffect(() => {
    if (active) {
      setDraftTitle(active.title);
      setDraftContent(active.content);
      setPreview(false);
    }
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save (debounced)
  useEffect(() => {
    if (!active) return;
    if (draftTitle === active.title && draftContent === active.content) return;
    const t = setTimeout(async () => {
      const { error } = await supabase
        .from("notes")
        .update({ title: draftTitle || "Untitled", content: draftContent })
        .eq("id", active.id);
      if (error) toast.error(error.message);
      else qc.invalidateQueries({ queryKey: ["notes", user?.id] });
    }, 600);
    return () => clearTimeout(t);
  }, [draftTitle, draftContent, active, qc, user?.id]);

  const newNote = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("notes")
        .insert({ user_id: user.id, title: "Untitled", content: "" })
        .select()
        .single();
      if (error) throw error;
      return data as Note;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["notes", user?.id] });
      setActiveId(n.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async (n: Note) => {
      const { error } = await supabase.from("notes").update({ pinned: !n.pinned }).eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", user?.id] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_v, id) => {
      qc.invalidateQueries({ queryKey: ["notes", user?.id] });
      if (activeId === id) setActiveId(null);
    },
  });

  async function runAI(mode: "summarize" | "improve" | "actions") {
    if (!active || !draftContent.trim()) {
      toast.error("Note is empty");
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-note", {
        body: { content: draftContent, mode },
      });
      if (error) throw error;
      const result = (data as { result?: string })?.result;
      if (!result) throw new Error("No result");
      const heading = mode === "summarize" ? "## Summary" : mode === "improve" ? "## Improved" : "## Action items";
      setDraftContent((c) => `${c}\n\n${heading}\n${result}`);
      toast.success("AI added below");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* List */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="p-3 space-y-2 border-b border-border/60">
          <Button className="w-full gap-2" onClick={() => newNote.mutate()} disabled={newNote.isPending}>
            <Plus className="h-4 w-4" /> New note
          </Button>
          <Input
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">No notes yet.</p>
            )}
            {filtered.map((n) => (
              <button
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={cn(
                  "w-full text-left rounded-md px-2.5 py-2 transition",
                  activeId === n.id ? "bg-sidebar-accent" : "hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-1.5">
                  {n.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                  <span className="text-sm font-medium truncate flex-1">{n.title || "Untitled"}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {n.content || "Empty note"}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Editor */}
      <div className="flex-1 flex min-w-0 flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/40 backdrop-blur-xl px-4 py-2">
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base font-semibold h-8 px-0"
              />
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
                  {preview ? <Pencil className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {preview ? "Edit" : "Preview"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={aiBusy}>
                      {aiBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                      AI <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => runAI("summarize")}>Summarize</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAI("improve")}>Improve writing</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => runAI("actions")}>Extract actions</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={() => togglePin.mutate(active)}>
                  {active.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm("Delete this note?")) deleteNote.mutate(active.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6">
                {preview ? (
                  <Markdown>{draftContent || "_Empty note._"}</Markdown>
                ) : (
                  <Textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="Start writing… markdown supported."
                    className="min-h-[60vh] border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none p-0 font-mono text-sm leading-relaxed"
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <NoteIcon className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">Select a note or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
