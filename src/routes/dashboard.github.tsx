import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Star, GitFork, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/dashboard/github")({ component: GitHubPage });

type Repo = {
  id: number;
  name: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  owner_avatar: string;
};

const LANGS = ["", "typescript", "python", "rust", "go", "javascript"];
const PERIODS = [
  { key: "1", label: "Today" },
  { key: "7", label: "Week" },
  { key: "30", label: "Month" },
];

function GitHubPage() {
  const [language, setLanguage] = useState("");
  const [since, setSince] = useState("7");

  const { data, isLoading, error } = useQuery({
    queryKey: ["github-trending", language, since],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-github-trending?language=${language}&since=${since}`;
      const session = await supabase.auth.getSession();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.data.session?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error("GitHub fetch failed");
      return (await res.json()) as { repos: Repo[] };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GitHub Trending</h1>
        <p className="text-muted-foreground">Most-starred repos created recently.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={since === p.key ? "default" : "outline"}
              onClick={() => setSince(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {LANGS.map((l) => (
            <Button
              key={l || "all"}
              size="sm"
              variant={language === l ? "secondary" : "ghost"}
              onClick={() => setLanguage(l)}
            >
              {l || "All langs"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading repos…
        </div>
      )}
      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <div className="grid gap-3 md:grid-cols-2">
        {data?.repos.map((r) => (
          <Card key={r.id} className="p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-start gap-3">
              <img src={r.owner_avatar} alt="" className="h-10 w-10 rounded-md" />
              <div className="flex-1 min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:text-primary inline-flex items-center gap-1 truncate"
                >
                  <Code2 className="h-4 w-4" /> {r.name}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {r.description || "No description"}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3 w-3" /> {r.stars.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="h-3 w-3" /> {r.forks.toLocaleString()}
                  </span>
                  {r.language && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {r.language}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
