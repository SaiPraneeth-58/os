import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, requireAuth } from "@/server/auth.server";

export const Route = createFileRoute("/api/threads/$id/messages")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { supabase } = await requireAuth(request);
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("thread_id", params.id)
          .order("created_at", { ascending: true });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ messages: data });
      },
    },
  },
});
