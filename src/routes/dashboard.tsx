import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Brain, Calendar, CheckSquare, FileText, LayoutDashboard, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OverviewPanel } from "@/components/dashboard/OverviewPanel";
import { TasksPanel } from "@/components/dashboard/TasksPanel";
import { NotesPanel } from "@/components/dashboard/NotesPanel";
import { CalendarPanel } from "@/components/dashboard/CalendarPanel";
import { ChatPanel } from "@/components/dashboard/ChatPanel";

type TabId = "overview" | "tasks" | "notes" | "calendar" | "chat";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const items: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "chat", label: "Jarvis Chat", icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" /> JARVIS OS
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                tab === id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          <div className="text-xs text-muted-foreground truncate px-2">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          {tab === "overview" && <OverviewPanel onNavigate={setTab} />}
          {tab === "tasks" && <TasksPanel />}
          {tab === "notes" && <NotesPanel />}
          {tab === "calendar" && <CalendarPanel />}
          {tab === "chat" && <ChatPanel />}
        </div>
      </main>
    </div>
  );
}
