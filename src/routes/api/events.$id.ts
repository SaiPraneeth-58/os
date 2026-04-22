import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, requireAuth } from "@/server/auth.server";

export const Route = createFileRoute("/api/events/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const ctx = await requireAuth(request);
        const { error } = await ctx.supabase.from("events").delete().eq("id", params.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true });
      },
    },
  },
});
