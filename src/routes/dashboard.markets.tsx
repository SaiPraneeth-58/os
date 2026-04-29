import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/markets")({ component: MarketsPage });

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change_24h: number;
  market_cap: number;
  volume: number;
};

function fmt(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function MarketsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["markets"],
    refetchInterval: 60000,
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-markets`;
      const session = await supabase.auth.getSession();
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.data.session?.access_token ?? ""}` },
      });
      if (!res.ok) throw new Error("Markets fetch failed");
      return (await res.json()) as { coins: Coin[] };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        <p className="text-muted-foreground">Live crypto prices, refreshed every minute.</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading markets…
        </div>
      )}
      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {data?.coins.map((c) => {
          const up = (c.change_24h ?? 0) >= 0;
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-3">
                <img src={c.image} alt="" className="h-10 w-10" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs uppercase text-muted-foreground">{c.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">
                    ${c.price < 1 ? c.price.toFixed(4) : c.price.toLocaleString()}
                  </div>
                  <div
                    className={`text-xs inline-flex items-center gap-1 ${
                      up ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {c.change_24h?.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50 text-xs">
                <div>
                  <div className="text-muted-foreground">Market cap</div>
                  <div className="font-mono">{fmt(c.market_cap)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Volume</div>
                  <div className="font-mono">{fmt(c.volume)}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
