import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const NoteInput = z.object({
  title: z.string().min(1).max(500),
  content: z.string().max(50000).optional().default(""),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
});

export const Route = createFileRoute("/api/notes")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .order("updated_at", { ascending: false });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ notes: data });
      },
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const body = NoteInput.parse(await readJson(request));
        const { data, error } = await ctx.supabase
          .from("notes")
          .insert({ ...body, user_id: ctx.userId })
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ note: data }, 201);
      },
    },
  },
});
