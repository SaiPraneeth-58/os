import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Rss, ExternalLink, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rss")({ component: RssPage });

const STORAGE_KEY = "jarvis.rss.feeds";

const DEFAULT_FEEDS = [
  "https://hnrss.org/frontpage",
  "https://www.theverge.com/rss/index.xml",
];

type FeedItem = {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
};

function parseFeed(xml: string, source: string): FeedItem[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = Array.from(doc.querySelectorAll("item, entry")).slice(0, 15);
  return items.map((it) => {
    const link =
      it.querySelector("link")?.textContent?.trim() ||
      it.querySelector("link")?.getAttribute("href") ||
      "#";
    return {
      title: it.querySelector("title")?.textContent?.trim() ?? "Untitled",
      link,
      pubDate: it.querySelector("pubDate, updated, published")?.textContent ?? undefined,
      description: it.querySelector("description, summary")?.textContent?.slice(0, 200) ?? undefined,
      source,
    };
  });
}

function RssPage() {
  const [feeds, setFeeds] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setFeeds(stored ? (JSON.parse(stored) as string[]) : DEFAULT_FEEDS);
  }, []);

  useEffect(() => {
    if (feeds.length === 0) {
      setItems([]);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    setLoading(true);
    Promise.all(
      feeds.map(async (url) => {
        try {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          const text = await res.text();
          return parseFeed(text, new URL(url).hostname);
        } catch {
          return [];
        }
      }),
    )
      .then((all) => {
        const merged = all.flat().sort((a, b) => {
          const da = a.pubDate ? Date.parse(a.pubDate) : 0;
          const db = b.pubDate ? Date.parse(b.pubDate) : 0;
          return db - da;
        });
        setItems(merged);
      })
      .finally(() => setLoading(false));
  }, [feeds]);

  function add() {
    if (!newUrl.trim()) return;
    try {
      new URL(newUrl);
    } catch {
      toast.error("Invalid URL");
      return;
    }
    if (feeds.includes(newUrl)) {
      toast.error("Already added");
      return;
    }
    setFeeds([...feeds, newUrl]);
    setNewUrl("");
    toast.success("Feed added");
  }

  function remove(url: string) {
    setFeeds(feeds.filter((f) => f !== url));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">RSS</h1>
        <p className="text-muted-foreground">Aggregate your favorite feeds in one place.</p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/feed.xml"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <Button onClick={add}><Plus className="h-4 w-4" /> Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {feeds.map((f) => (
            <div key={f} className="flex items-center gap-1.5 rounded-md border bg-card/60 px-2 py-1 text-xs">
              <Rss className="h-3 w-3 text-primary" />
              <span className="truncate max-w-[200px]">{new URL(f).hostname}</span>
              <button onClick={() => remove(f)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Fetching feeds…
        </div>
      )}

      <div className="space-y-2">
        {items.map((it, i) => (
          <Card key={i} className="p-4 hover:shadow-elevated transition-shadow">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:text-primary inline-flex items-center gap-1.5"
                >
                  {it.title}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
                {it.description && (
                  <p
                    className="text-sm text-muted-foreground mt-1 line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: it.description }}
                  />
                )}
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>{it.source}</span>
                  {it.pubDate && <span>· {new Date(it.pubDate).toLocaleString()}</span>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {!loading && items.length === 0 && feeds.length > 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No items found.</p>
        )}
      </div>
    </div>
  );
}
