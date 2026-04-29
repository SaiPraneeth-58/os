import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { LogOut, Command as CommandIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { CommandPalette } from "@/components/CommandPalette";

export const Route = createFileRoute("/dashboard")({ component: DashboardLayout });

function DashboardLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AnimatedBackground />
      <CommandPalette />
      <div className="min-h-screen flex w-full text-foreground">
        <AppSidebar />

        <div className="flex-1 flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 h-14 border-b border-border/60 bg-background/40 backdrop-blur-xl">
            <div className="h-full px-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Welcome back
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex gap-2 text-muted-foreground"
                  onClick={() => {
                    window.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "k", metaKey: true }),
                    );
                  }}
                >
                  <CommandIcon className="h-3.5 w-3.5" />
                  <span>Search</span>
                  <kbd className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
                    ⌘K
                  </kbd>
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 min-h-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
