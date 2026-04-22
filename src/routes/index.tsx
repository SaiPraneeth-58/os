import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Calendar, CheckSquare, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="container mx-auto flex items-center justify-between p-6">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> JARVIS OS
        </div>
        <Link to="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
      </header>

      <main className="container mx-auto px-6">
        <section className="py-20 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Your personal <span className="text-primary">AI operating system</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Tasks, notes, calendar, and a context-aware assistant — all in one premium dashboard powered by your own OpenAI key.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/login">
              <Button size="lg">
                Launch JARVIS <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4 pb-20">
          {[
            { icon: CheckSquare, title: "Tasks", desc: "Plan, prioritize, complete." },
            { icon: FileText, title: "Notes", desc: "Markdown notes with AI summaries." },
            { icon: Calendar, title: "Calendar", desc: "Today's events at a glance." },
            { icon: Brain, title: "Jarvis Chat", desc: "Streaming, context-aware AI." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
