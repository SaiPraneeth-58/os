import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPanel } from "@/components/dashboard/ProjectsPanel";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { StatsCards } from "@/components/dashboard/StatsCards";

export const Route = createFileRoute("/dashboard/")({ component: DashboardOverview });

function DashboardOverview() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <GreetingHeader />
      <StatsCards />
      <ProjectsPanel />
    </div>
  );
}
