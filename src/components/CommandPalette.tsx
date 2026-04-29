import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  CheckSquare,
  StickyNote,
  Calendar,
  Bookmark,
  Timer,
  Cloud,
  Newspaper,
  Code2,
  TrendingUp,
  Rss,
  Users,
  ScrollText,
  KeyRound,
  Activity,
  Palette,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
  { title: "Tasks", url: "/dashboard/tasks", icon: CheckSquare },
  { title: "Notes", url: "/dashboard/notes", icon: StickyNote },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
  { title: "Bookmarks", url: "/dashboard/bookmarks", icon: Bookmark },
  { title: "Pomodoro", url: "/dashboard/pomodoro", icon: Timer },
  { title: "Weather", url: "/dashboard/weather", icon: Cloud },
  { title: "News", url: "/dashboard/news", icon: Newspaper },
  { title: "GitHub", url: "/dashboard/github", icon: Code2 },
  { title: "Markets", url: "/dashboard/markets", icon: TrendingUp },
  { title: "RSS", url: "/dashboard/rss", icon: Rss },
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Logs", url: "/dashboard/logs", icon: ScrollText },
  { title: "Secrets", url: "/dashboard/secrets", icon: KeyRound },
  { title: "Activity", url: "/dashboard/activity", icon: Activity },
  { title: "Theme", url: "/dashboard/theme", icon: Palette },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (url: string) => {
    setOpen(false);
    navigate({ to: url });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {nav.map((item) => (
            <CommandItem key={item.url} onSelect={() => go(item.url)}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/dashboard/chat")}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Ask JARVIS…</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              signOut();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
