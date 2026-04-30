import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Palette, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/theme")({ component: ThemePage });

type Preset = { name: string; hue: number; chroma: number };

const PRESETS: Preset[] = [
  { name: "Indigo", hue: 260, chroma: 0.2 },
  { name: "Ocean", hue: 220, chroma: 0.18 },
  { name: "Emerald", hue: 155, chroma: 0.16 },
  { name: "Sunset", hue: 30, chroma: 0.18 },
  { name: "Rose", hue: 350, chroma: 0.18 },
  { name: "Violet", hue: 295, chroma: 0.2 },
];

const STORAGE_KEY = "jarvis.theme.tokens";
const RADIUS_KEY = "jarvis.theme.radius";

function applyTokens(hue: number, chroma: number) {
  const root = document.documentElement;
  root.style.setProperty("--primary", `oklch(0.55 ${chroma} ${hue})`);
  root.style.setProperty("--primary-glow", `oklch(0.70 ${chroma * 0.9} ${hue - 15})`);
  root.style.setProperty("--ring", `oklch(0.55 ${chroma} ${hue})`);
}

function applyRadius(r: number) {
  document.documentElement.style.setProperty("--radius", `${r}rem`);
}

function ThemePage() {
  const [hue, setHue] = useState(260);
  const [chroma, setChroma] = useState(0.2);
  const [radius, setRadius] = useState(0.875);
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const v = JSON.parse(stored) as { hue: number; chroma: number };
      setHue(v.hue);
      setChroma(v.chroma);
    }
    const r = localStorage.getItem(RADIUS_KEY);
    if (r) setRadius(parseFloat(r));
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    applyTokens(hue, chroma);
  }, [hue, chroma]);

  useEffect(() => {
    applyRadius(radius);
  }, [radius]);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hue, chroma }));
    localStorage.setItem(RADIUS_KEY, String(radius));
    toast.success("Theme saved");
  }

  function reset() {
    setHue(260);
    setChroma(0.2);
    setRadius(0.875);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RADIUS_KEY);
    document.documentElement.style.removeProperty("--primary");
    document.documentElement.style.removeProperty("--primary-glow");
    document.documentElement.style.removeProperty("--ring");
    document.documentElement.style.removeProperty("--radius");
    toast.success("Theme reset");
  }

  function toggleMode() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Theme</h1>
          <p className="text-muted-foreground">Customize colors, radius, and appearance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset</Button>
          <Button onClick={save}><Check className="h-4 w-4" /> Save</Button>
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Presets</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setHue(p.hue);
                setChroma(p.chroma);
              }}
              className="group rounded-lg border bg-card/60 p-3 text-left hover:border-primary/50 hover:shadow-elevated transition"
            >
              <div
                className="h-10 w-full rounded-md mb-2"
                style={{ background: `oklch(0.55 ${p.chroma} ${p.hue})` }}
              />
              <p className="text-xs font-medium">{p.name}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold">Fine tune</h2>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Hue</span>
            <span className="text-muted-foreground">{hue}°</span>
          </div>
          <Slider value={[hue]} min={0} max={360} step={1} onValueChange={(v) => setHue(v[0])} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Chroma</span>
            <span className="text-muted-foreground">{chroma.toFixed(2)}</span>
          </div>
          <Slider value={[chroma]} min={0} max={0.3} step={0.01} onValueChange={(v) => setChroma(v[0])} />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Radius</span>
            <span className="text-muted-foreground">{radius.toFixed(2)} rem</span>
          </div>
          <Slider value={[radius]} min={0} max={2} step={0.05} onValueChange={(v) => setRadius(v[0])} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark mode.</p>
          </div>
          <Button variant="outline" onClick={toggleMode}>
            {dark ? "Switch to light" : "Switch to dark"}
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Preview</h2>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border bg-card p-4 flex-1 min-w-[200px]">
            <p className="text-sm text-muted-foreground">Card</p>
            <p className="text-xl font-semibold">Sample content</p>
          </div>
          <div className="rounded-lg bg-gradient-primary text-primary-foreground p-4 flex-1 min-w-[200px] shadow-elevated">
            <p className="text-sm opacity-80">Gradient</p>
            <p className="text-xl font-semibold">Primary glow</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
