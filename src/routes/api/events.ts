import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const EventInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  location: z.string().max(500).optional().nullable(),
});

export const Route = createFileRoute("/api/events")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("starts_at", { ascending: true });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ events: data });
      },
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const body = EventInput.parse(await readJson(request));
        const { data, error } = await ctx.supabase
          .from("events")
          .insert({ ...body, user_id: ctx.userId })
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ event: data }, 201);
      },
    },
  },
});
