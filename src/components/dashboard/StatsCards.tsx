import { Card } from "@/components/ui/card";
import { FolderKanban, CheckSquare, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Stat = {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  accent: string;
};

const stats: Stat[] = [
  { label: "Active projects", value: "—", delta: "this week", icon: FolderKanban, accent: "from-sky-400/30 to-indigo-500/30" },
  { label: "Tasks done", value: "—", delta: "today", icon: CheckSquare, accent: "from-emerald-400/30 to-teal-500/30" },
  { label: "AI calls", value: "—", delta: "last 24h", icon: Sparkles, accent: "from-fuchsia-400/30 to-purple-500/30" },
  { label: "System uptime", value: "100%", delta: "all good", icon: Zap, accent: "from-amber-400/30 to-orange-500/30" },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card
          key={s.label}
          className="glass relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div
            className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${s.accent} blur-2xl`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
            <s.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight">{s.value}</div>
          {s.delta && <div className="mt-0.5 text-xs text-muted-foreground">{s.delta}</div>}
        </Card>
      ))}
    </div>
  );
}
