import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, requireAuth } from "@/server/auth.server";

export const Route = createFileRoute("/api/threads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { data, error } = await supabase.from("chat_threads").select("*").order("created_at", { ascending: false });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ threads: data });
      },
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const { data, error } = await ctx.supabase
          .from("chat_threads")
          .insert({ user_id: ctx.userId, title: "New conversation" })
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ thread: data }, 201);
      },
    },
  },
});
