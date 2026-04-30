import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KeyRound, ShieldCheck, Lock } from "lucide-react";

export const Route = createFileRoute("/dashboard/secrets")({ component: SecretsPage });

const CONFIGURED = [
  { name: "LOVABLE_API_KEY", description: "AI gateway access for chat & note assistants", category: "AI" },
  { name: "OPENAI_API_KEY", description: "OpenAI fallback for advanced reasoning", category: "AI" },
  { name: "SUPABASE_URL", description: "Backend endpoint for the data layer", category: "Backend" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", description: "Privileged backend operations", category: "Backend" },
  { name: "SUPABASE_PUBLISHABLE_KEY", description: "Browser-safe key with RLS enforcement", category: "Backend" },
  { name: "SUPABASE_JWKS", description: "JWT verification keys", category: "Auth" },
];

const TONE: Record<string, string> = {
  AI: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
  Backend: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
  Auth: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

function SecretsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Secrets</h1>
        <p className="text-muted-foreground">Backend secrets configured for this workspace.</p>
      </div>

      <Card className="p-4 flex items-start gap-3 border-primary/30 bg-primary/5">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Secret values are never shown</p>
          <p className="text-muted-foreground">
            Secrets stay encrypted on the server and are only injected into edge functions and server routes at runtime.
          </p>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {CONFIGURED.map((s) => (
          <Card key={s.name} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-9 w-9 rounded-md bg-gradient-primary/10 flex items-center justify-center">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
              </div>
              <Badge className={TONE[s.category]} variant="outline">{s.category}</Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Value hidden · ••••••••••••
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
