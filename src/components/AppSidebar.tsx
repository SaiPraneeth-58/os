import { Link, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const sections: { label: string; items: { title: string; url: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Workspace",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
      { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
      { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
    ],
  },
  {
    label: "Productivity",
    items: [
      { title: "Tasks", url: "/dashboard/tasks", icon: CheckSquare },
      { title: "Notes", url: "/dashboard/notes", icon: StickyNote },
      { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
      { title: "Bookmarks", url: "/dashboard/bookmarks", icon: Bookmark },
      { title: "Pomodoro", url: "/dashboard/pomodoro", icon: Timer },
    ],
  },
  {
    label: "Integrations",
    items: [
      { title: "Weather", url: "/dashboard/weather", icon: Cloud },
      { title: "News", url: "/dashboard/news", icon: Newspaper },
      { title: "GitHub", url: "/dashboard/github", icon: Code2 },
      { title: "Markets", url: "/dashboard/markets", icon: TrendingUp },
      { title: "RSS", url: "/dashboard/rss", icon: Rss },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Users", url: "/dashboard/users", icon: Users },
      { title: "Logs", url: "/dashboard/logs", icon: ScrollText },
      { title: "Secrets", url: "/dashboard/secrets", icon: KeyRound },
      { title: "Activity", url: "/dashboard/activity", icon: Activity },
      { title: "Theme", url: "/dashboard/theme", icon: Palette },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) =>
    url === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-2 py-2 font-semibold tracking-tight text-sidebar-foreground"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary shadow-elevated">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span>JARVIS OS</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            {!collapsed && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
