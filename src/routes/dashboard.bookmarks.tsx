import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Bookmark as BookmarkIcon, ExternalLink, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/bookmarks")({ component: BookmarksPage });

type Bookmark = {
  id: string;
  url: string;
  title: string;
  description: string | null;
  category: string;
  favicon_url: string | null;
  created_at: string;
};

function faviconFor(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}

function BookmarksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");

  const bookmarksQuery = useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id,url,title,description,category,favicon_url,created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    bookmarksQuery.data?.forEach((b) => set.add(b.category));
    return Array.from(set);
  }, [bookmarksQuery.data]);

  const filtered = useMemo(() => {
    const items = bookmarksQuery.data ?? [];
    const q = search.toLowerCase().trim();
    return items.filter((b) => {
      if (activeCat !== "All" && b.category !== activeCat) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [bookmarksQuery.data, activeCat, search]);

  const addBookmark = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!url.trim()) throw new Error("URL required");
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = "https://" + normalizedUrl;
      let host = "";
      try { host = new URL(normalizedUrl).hostname; } catch { throw new Error("Invalid URL"); }
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        url: normalizedUrl,
        title: title.trim() || host,
        description: description.trim() || null,
        category: category.trim() || "General",
        favicon_url: faviconFor(normalizedUrl),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setUrl(""); setTitle(""); setDescription(""); setCategory("General");
      qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks", user?.id] }),
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
          <p className="text-sm text-muted-foreground">
            {bookmarksQuery.data?.length ?? 0} saved links
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New bookmark</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add bookmark</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="url">URL</Label>
                <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title (optional)</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Description (optional)</Label>
                <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat">Category</Label>
                <Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => addBookmark.mutate()} disabled={addBookmark.isPending}>
                {addBookmark.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookmarks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={activeCat === c ? "default" : "outline"}
              onClick={() => setActiveCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass p-10 text-center text-muted-foreground">
          <BookmarkIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No bookmarks{search ? " match your search" : " yet"}.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <Card key={b.id} className="glass p-4 group transition hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="flex items-start gap-3">
                {b.favicon_url ? (
                  <img src={b.favicon_url} alt="" className="h-8 w-8 rounded shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                    <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sm line-clamp-1 hover:text-primary"
                  >
                    {b.title}
                  </a>
                  <p className="text-xs text-muted-foreground line-clamp-1">{new URL(b.url).hostname}</p>
                  {b.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1.5">{b.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{b.category}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:text-primary">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button onClick={() => deleteBookmark.mutate(b.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
