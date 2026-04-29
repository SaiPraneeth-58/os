import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, Loader2, ExternalLink, MessageCircle, ArrowUp } from "lucide-react";

export const Route = createFileRoute("/dashboard/news")({ component: NewsPage });

type Story = { id: number; title: string; url: string; score: number; by: string; time: number; comments: number };

const FEEDS = [
  { key: "topstories", label: "Top" },
  { key: "newstories", label: "New" },
  { key: "beststories", label: "Best" },
  { key: "askstories", label: "Ask HN" },
  { key: "showstories", label: "Show HN" },
];

function NewsPage() {
  const [feed, setFeed] = useState("topstories");

  const { data, isLoading, error } = useQuery({
    queryKey: ["news", feed],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-news?feed=${feed}&limit=20`;
      const session = await supabase.auth.getSession();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.data.session?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error("News fetch failed");
      return (await res.json()) as { stories: Story[] };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">News</h1>
        <p className="text-muted-foreground">Latest from Hacker News.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FEEDS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={feed === f.key ? "default" : "outline"}
            onClick={() => setFeed(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading stories…
        </div>
      )}
      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <div className="space-y-2">
        {data?.stories.map((s, i) => (
          <Card key={s.id} className="p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground text-sm font-mono w-6 pt-0.5">{i + 1}.</div>
              <div className="flex-1 min-w-0">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:text-primary inline-flex items-start gap-1"
                >
                  {s.title}
                  <ExternalLink className="h-3 w-3 mt-1 shrink-0 opacity-60" />
                </a>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="inline-flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" /> {s.score}
                  </span>
                  <span>by {s.by}</span>
                  <a
                    href={`https://news.ycombinator.com/item?id=${s.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <MessageCircle className="h-3 w-3" /> {s.comments}
                  </a>
                </div>
              </div>
              <Newspaper className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
