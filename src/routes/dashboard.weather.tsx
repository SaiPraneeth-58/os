import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Cloud, Droplets, Wind, Thermometer, Loader2, Search, MapPin } from "lucide-react";

export const Route = createFileRoute("/dashboard/weather")({ component: WeatherPage });

type WeatherData = {
  place: string;
  current: { temp: number; feels_like: number; humidity: number; wind: number; condition: string };
  forecast: { date: string; condition: string; max: number; min: number }[];
};

function WeatherPage() {
  const [query, setQuery] = useState("London");
  const [submitted, setSubmitted] = useState("London");

  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", submitted],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<WeatherData>("get-weather", {
        body: null,
        method: "GET",
        // Edge functions don't accept query params via invoke; pass as body header trick:
      } as never);
      // Fallback: invoke does support query via URL — use direct fetch instead
      if (error || !data) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weather?q=${encodeURIComponent(submitted)}`;
        const session = await supabase.auth.getSession();
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.data.session?.access_token ?? ""}` },
        });
        if (!res.ok) throw new Error("Weather fetch failed");
        return (await res.json()) as WeatherData;
      }
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weather</h1>
        <p className="text-muted-foreground">Real-time conditions and 5-day forecast.</p>
      </div>

      <form
        className="flex gap-2 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city…"
        />
        <Button type="submit">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      {data && (
        <>
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="h-4 w-4" /> {data.place}
            </div>
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <div className="text-6xl font-bold">{Math.round(data.current.temp)}°</div>
                <div className="text-xl text-muted-foreground">{data.current.condition}</div>
              </div>
              <Cloud className="h-20 w-20 text-primary/40" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
              <Stat icon={Thermometer} label="Feels like" value={`${Math.round(data.current.feels_like)}°`} />
              <Stat icon={Droplets} label="Humidity" value={`${data.current.humidity}%`} />
              <Stat icon={Wind} label="Wind" value={`${Math.round(data.current.wind)} km/h`} />
            </div>
          </Card>

          <div>
            <h2 className="text-xl font-semibold mb-3">5-Day Forecast</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {data.forecast.map((d) => (
                <Card key={d.date} className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    {new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}
                  </div>
                  <Cloud className="h-8 w-8 mx-auto my-2 text-primary/60" />
                  <div className="text-xs text-muted-foreground line-clamp-1">{d.condition}</div>
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">{Math.round(d.max)}°</span>
                    <span className="text-muted-foreground"> / {Math.round(d.min)}°</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Cloud; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}
